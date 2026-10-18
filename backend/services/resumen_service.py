from datetime import date
from decimal import Decimal

from fastapi import HTTPException

from backend.database import get_connection
from backend.services.saldo_service import actualizar_saldo

CENTAVOS = Decimal("0.01")

SQL_CUOTAS = """
    SELECT
        c.id AS cuota_id,
        c.numero,
        c.periodo,
        c.fecha_vencimiento,
        c.monto_base,
        c.monto_pendiente,
        c.estado,
        ct.cantidad_cuotas,
        ct.fecha_compra,
        m.descripcion
    FROM cuota c
    INNER JOIN compra_tarjeta ct
        ON c.compra_tarjeta_id = ct.id
    INNER JOIN movimiento m
        ON ct.movimiento_id = m.id
    WHERE ct.tarjeta_id = %s
      AND m.usuario_id = %s
      AND c.estado IN ('PENDIENTE', 'PARCIAL')
"""


def obtener_tarjeta(cursor, tarjeta_id, usuario_id):
    cursor.execute(
        """
        SELECT
            tc.id,
            tc.porcentaje_pago_minimo,
            mp.nombre,
            mp.moneda
        FROM tarjeta_credito tc
        INNER JOIN metodo_pago mp
            ON tc.metodo_pago_id = mp.id
        WHERE tc.id = %s
          AND mp.usuario_id = %s
        """,
        (tarjeta_id, usuario_id)
    )
    return cursor.fetchone()


def listar_resumenes(tarjeta_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        tarjeta = obtener_tarjeta(cursor, tarjeta_id, usuario_id)

        if not tarjeta:
            return None

        cursor.execute(
            SQL_CUOTAS + " ORDER BY c.periodo, ct.fecha_compra, c.id",
            (tarjeta_id, usuario_id)
        )

        resumenes = []
        actual = None

        for fila in cursor.fetchall():
            periodo = fila["periodo"].isoformat()

            if actual is None or actual["periodo"] != periodo:
                actual = {
                    "periodo": periodo,
                    "fecha_vencimiento": fila["fecha_vencimiento"],
                    "total_pendiente": Decimal("0"),
                    "pago_minimo": None,
                    # solo el resumen más viejo se puede pagar
                    "puede_pagar": len(resumenes) == 0,
                    "lineas": []
                }
                resumenes.append(actual)

            actual["total_pendiente"] += fila["monto_pendiente"]
            actual["lineas"].append({
                "cuota_id": fila["cuota_id"],
                "numero": fila["numero"],
                "cantidad_cuotas": fila["cantidad_cuotas"],
                "descripcion": fila["descripcion"],
                "monto_base": fila["monto_base"],
                "monto_pendiente": fila["monto_pendiente"],
                "estado": fila["estado"]
            })

        porcentaje = tarjeta["porcentaje_pago_minimo"]

        if porcentaje is not None:
            for resumen in resumenes:
                resumen["pago_minimo"] = (
                    resumen["total_pendiente"] * porcentaje / 100
                ).quantize(CENTAVOS)

        return {
            "tarjeta": {
                "id": tarjeta["id"],
                "nombre": tarjeta["nombre"],
                "moneda": tarjeta["moneda"]
            },
            "resumenes": resumenes
        }

    finally:
        cursor.close()
        conexion.close()


def pagar_resumen(tarjeta_id, periodo, datos, usuario_id):
    monto = Decimal(str(datos.monto)).quantize(CENTAVOS)

    ids = [m.metodo_pago_id for m in datos.metodos]

    if len(ids) != len(set(ids)):
        raise ValueError("No se puede repetir un método de pago")

    # [metodo_pago_id, monto que falta tomar de esa cuenta]
    partes = []

    for m in datos.metodos:
        parte = Decimal(str(m.monto)).quantize(CENTAVOS)

        if parte <= 0:
            raise ValueError("El monto de cada método debe ser mayor a 0")

        partes.append([m.metodo_pago_id, parte])

    if sum(p[1] for p in partes) != monto:
        raise ValueError(
            "La suma de los métodos de pago debe coincidir con el monto del pago"
        )

    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)
        conexion.start_transaction()

        tarjeta = obtener_tarjeta(cursor, tarjeta_id, usuario_id)

        if not tarjeta:
            raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

        cursor.execute(
            SQL_CUOTAS
            + " AND c.periodo = %s ORDER BY ct.fecha_compra, c.id FOR UPDATE",
            (tarjeta_id, usuario_id, periodo)
        )

        cuotas = cursor.fetchall()

        if not cuotas:
            raise ValueError("Ese resumen no tiene saldo pendiente")

        cursor.execute(
            """
            SELECT 1 AS hay
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE ct.tarjeta_id = %s
              AND m.usuario_id = %s
              AND c.estado IN ('PENDIENTE', 'PARCIAL')
              AND c.periodo < %s
            LIMIT 1
            """,
            (tarjeta_id, usuario_id, periodo)
        )

        if cursor.fetchone():
            raise ValueError("Pagá primero el resumen de un período anterior")

        total = sum(c["monto_pendiente"] for c in cuotas)

        if monto > total:
            raise ValueError("El monto supera el pendiente del resumen")

        fecha = datos.fecha

        if fecha is not None:
            if fecha > date.today():
                raise ValueError("La fecha del pago no puede ser futura")

            if fecha < max(c["fecha_compra"].date() for c in cuotas):
                raise ValueError(
                    "El pago no puede ser anterior a una de las compras del resumen"
                )

        for metodo_id, _ in partes:
            cursor.execute(
                """
                SELECT tipo, estado, moneda
                FROM metodo_pago
                WHERE id = %s
                  AND usuario_id = %s
                """,
                (metodo_id, usuario_id)
            )

            metodo = cursor.fetchone()

            if not metodo:
                raise HTTPException(
                    status_code=403,
                    detail="Uno de los métodos de pago no pertenece al usuario"
                )

            if metodo["estado"] != "ACTIVO":
                raise ValueError("Uno de los métodos de pago está inactivo")

            if metodo["tipo"] == "TARJETA_CREDITO":
                raise ValueError(
                    "No se puede pagar una tarjeta de crédito usando otra tarjeta"
                )

            if metodo["moneda"] != tarjeta["moneda"]:
                raise ValueError(
                    "Los métodos de pago deben utilizar la misma moneda que la tarjeta"
                )

        restante = monto
        cuotas_afectadas = 0

        for cuota in cuotas:
            if restante <= 0:
                break

            pago_cuota = min(restante, cuota["monto_pendiente"])
            restante -= pago_cuota

            # de qué cuentas sale lo que cubre esta cuota (en orden)
            necesario = pago_cuota
            usos = []

            for parte in partes:
                if necesario <= 0:
                    break

                tomar = min(parte[1], necesario)

                if tomar > 0:
                    usos.append((parte[0], tomar))
                    parte[1] -= tomar
                    necesario -= tomar

            descripcion = (
                f"Pago resumen {cuota['periodo']:%m/%Y} · "
                f"{cuota['descripcion'] or 'Compra sin descripción'}"
            )[:255]

            cursor.execute(
                """
                INSERT INTO movimiento
                (
                    usuario_id,
                    metodo_pago_id,
                    tipo,
                    estado,
                    descripcion,
                    monto,
                    moneda,
                    fecha
                )
                VALUES (
                    %s, NULL, 'PAGO_TARJETA', 'CONFIRMADO',
                    %s, %s, %s, COALESCE(%s, CURDATE())
                )
                """,
                (
                    usuario_id,
                    descripcion,
                    pago_cuota,
                    tarjeta["moneda"],
                    fecha
                )
            )

            movimiento_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO pago
                (cuota_id, movimiento_id, monto, moneda, fecha, estado)
                VALUES (%s, %s, %s, %s, COALESCE(%s, CURDATE()), 'CONFIRMADO')
                """,
                (
                    cuota["cuota_id"],
                    movimiento_id,
                    pago_cuota,
                    tarjeta["moneda"],
                    fecha
                )
            )

            for metodo_id, tomar in usos:
                cursor.execute(
                    """
                    INSERT INTO movimiento_metodo
                    (movimiento_id, metodo_pago_id, monto, moneda)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (movimiento_id, metodo_id, tomar, tarjeta["moneda"])
                )

                actualizar_saldo(cursor, metodo_id, tomar, "EGRESO")

            nuevo_pendiente = cuota["monto_pendiente"] - pago_cuota

            cursor.execute(
                """
                UPDATE cuota
                SET monto_pendiente = %s,
                    estado = %s
                WHERE id = %s
                """,
                (
                    nuevo_pendiente,
                    "PAGADA" if nuevo_pendiente == 0 else "PARCIAL",
                    cuota["cuota_id"]
                )
            )

            cuotas_afectadas += 1

        conexion.commit()

        return {
            "mensaje": "Resumen pagado correctamente",
            "pagado": monto,
            "restante": total - monto,
            "cuotas_afectadas": cuotas_afectadas
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()