from backend.database import get_connection
from datetime import date
from dateutil.relativedelta import relativedelta


def crear_compra_con_cursor(
    cursor,
    usuario_id,
    tarjeta_id,
    monto,
    cantidad_cuotas,
    descripcion,
    fecha_compra=None
):
    cursor.execute(
        """
        SELECT
            tc.id,
            tc.fecha_cierre,
            tc.fecha_vencimiento
        FROM tarjeta_credito tc
        INNER JOIN metodo_pago mp
            ON tc.metodo_pago_id = mp.id
        WHERE tc.id = %s
        AND mp.usuario_id = %s
        AND tc.estado = 'ACTIVA'
        """,
        (tarjeta_id, usuario_id)
    )

    tarjeta = cursor.fetchone()

    if not tarjeta:
        raise ValueError("Tarjeta no encontrada o no está activa")

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
        SELECT
            %s,
            tc.metodo_pago_id,
            'EGRESO',
            'CONFIRMADO',
            %s,
            %s,
            mp.moneda,
            COALESCE(%s, NOW())
        FROM tarjeta_credito tc
        INNER JOIN metodo_pago mp
            ON tc.metodo_pago_id = mp.id
        WHERE tc.id = %s
        """,
        (
            usuario_id,
            descripcion,
            monto,
            fecha_compra,
            tarjeta_id
        )
    )

    movimiento_id = cursor.lastrowid

    cursor.execute(
        """
        INSERT INTO compra_tarjeta
        (
            movimiento_id,
            tarjeta_id,
            monto_base,
            cantidad_cuotas,
            fecha_compra
        )
        VALUES (%s, %s, %s, %s, COALESCE(%s, NOW()))
        """,
        (
            movimiento_id,
            tarjeta_id,
            monto,
            cantidad_cuotas,
            fecha_compra
        )
    )

    compra_id = cursor.lastrowid

    cursor.execute(
        """
        SELECT fecha_compra
        FROM compra_tarjeta
        WHERE id = %s
        """,
        (compra_id,)
    )

    compra_creada = cursor.fetchone()

    fecha_real_compra = compra_creada["fecha_compra"]

    if hasattr(fecha_real_compra, "date"):
        fecha_real_compra = fecha_real_compra.date()

    dia_cierre = tarjeta["fecha_cierre"]
    dia_vencimiento = tarjeta["fecha_vencimiento"]

    if fecha_real_compra.day <= dia_cierre:
        primer_periodo = fecha_real_compra.replace(day=1)
    else:
        primer_periodo = (
            fecha_real_compra.replace(day=1)
            + relativedelta(months=1)
        )

    monto_cuota = monto / cantidad_cuotas

    for numero in range(1, cantidad_cuotas + 1):

        periodo = primer_periodo + relativedelta(months=numero - 1)

        mes_vencimiento = periodo + relativedelta(months=1)

        primer_dia_mes = mes_vencimiento.replace(day=1)

        siguiente_mes = primer_dia_mes + relativedelta(months=1)

        ultimo_dia_mes = siguiente_mes - relativedelta(days=1)

        dia_real_vencimiento = min(
            dia_vencimiento,
            ultimo_dia_mes.day
        )

        fecha_vencimiento = mes_vencimiento.replace(
            day=dia_real_vencimiento
        )

        cursor.execute(
            """
            INSERT INTO cuota
            (
                compra_tarjeta_id,
                numero,
                monto_base,
                periodo,
                fecha_vencimiento,
                estado,
                monto_pendiente
            )
            VALUES (%s, %s, %s, %s, %s, 'PENDIENTE', %s)
            """,
            (
                compra_id,
                numero,
                monto_cuota,
                periodo,
                fecha_vencimiento,
                monto_cuota
            )
        )

    return compra_id, movimiento_id


def crear_compra(compra, usuario_id, fecha_compra=None):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        compra_id, movimiento_id = crear_compra_con_cursor(
            cursor=cursor,
            usuario_id=usuario_id,
            tarjeta_id=compra.tarjeta_id,
            monto=compra.monto,
            cantidad_cuotas=compra.cantidad_cuotas,
            descripcion=compra.descripcion,
            fecha_compra=fecha_compra
        )

        conexion.commit()

        return compra_id

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def listar_compras(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                ct.id,
                ct.tarjeta_id,
                mp.nombre AS tarjeta,
                ct.monto_base,
                ct.cantidad_cuotas,
                ct.fecha_compra,
                m.descripcion
            FROM compra_tarjeta ct
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE m.usuario_id = %s
            ORDER BY ct.fecha_compra DESC
            """,
            (usuario_id,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()


def listar_cuotas(compra_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                c.id,
                c.compra_tarjeta_id,
                c.numero,
                c.monto_base,
                c.periodo,
                c.fecha_vencimiento,
                c.estado,
                c.monto_pendiente
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE ct.id = %s
            AND m.usuario_id = %s
            ORDER BY c.numero
            """,
            (
                compra_id,
                usuario_id
            )
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()

def editar_compra(compra_id, compra, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                ct.id,
                ct.monto_base,
                ct.cantidad_cuotas
            FROM compra_tarjeta ct
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE ct.id = %s
            AND m.usuario_id = %s
            """,
            (compra_id, usuario_id)
        )

        compra_actual = cursor.fetchone()

        if not compra_actual:
            return 0

        cursor.execute(
            """
            UPDATE movimiento m
            INNER JOIN compra_tarjeta ct
                ON m.id = ct.movimiento_id
            SET
                m.descripcion = %s
            WHERE ct.id = %s
            AND m.usuario_id = %s
            """,
            (
                compra.descripcion,
                compra_id,
                usuario_id
            )
        )

        conexion.commit()

        return 1

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def eliminar_compra(compra_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                ct.id,
                ct.movimiento_id
            FROM compra_tarjeta ct
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE ct.id = %s
            AND m.usuario_id = %s
            """,
            (
                compra_id,
                usuario_id
            )
        )

        compra = cursor.fetchone()

        if not compra:
            return 0

        cursor.execute(
            """
            DELETE FROM cuota
            WHERE compra_tarjeta_id = %s
            """,
            (compra_id,)
        )

        cursor.execute(
            """
            DELETE FROM compra_tarjeta
            WHERE id = %s
            """,
            (compra_id,)
        )

        cursor.execute(
            """
            DELETE FROM movimiento
            WHERE id = %s
            AND usuario_id = %s
            """,
            (
                compra["movimiento_id"],
                usuario_id
            )
        )

        conexion.commit()

        return 1

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def crear_ajuste(ajuste, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)
        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                c.id,
                mp.moneda
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            INNER JOIN tarjeta_credito tc
                ON ct.tarjeta_id = tc.id
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE c.id = %s
            AND m.usuario_id = %s
            """,
            (ajuste.cuota_id, usuario_id)
        )

        cuota = cursor.fetchone()

        if not cuota:
            raise ValueError("Cuota no encontrada")

        if ajuste.tipo not in (
            "RECARGO",
            "INTERES",
            "COMISION",
            "DESCUENTO",
            "ADICIONAL"
        ):
            raise ValueError("Tipo de ajuste inválido")

        if ajuste.monto <= 0:
            raise ValueError("El monto del ajuste debe ser mayor a 0")

        cursor.execute(
            """
            INSERT INTO ajuste
            (
                cuota_id,
                tipo,
                monto,
                moneda,
                descripcion
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                ajuste.cuota_id,
                ajuste.tipo,
                ajuste.monto,
                cuota["moneda"],
                ajuste.descripcion
            )
        )

        ajuste_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN tipo IN (
                                'RECARGO',
                                'INTERES',
                                'COMISION',
                                'ADICIONAL'
                            )
                            THEN monto
                            WHEN tipo = 'DESCUENTO'
                            THEN -monto
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_ajustes
            FROM ajuste
            WHERE cuota_id = %s
            """,
            (ajuste.cuota_id,)
        )

        resultado = cursor.fetchone()

        total_ajustes = resultado["total_ajustes"]

        cursor.execute(
            """
            SELECT
                monto_base
            FROM cuota
            WHERE id = %s
            """,
            (ajuste.cuota_id,)
        )

        cuota_base = cursor.fetchone()

        total_cuota = cuota_base["monto_base"] + total_ajustes

        cursor.execute(
            """
            SELECT
                COALESCE(SUM(monto), 0) AS total_pagado
            FROM pago
            WHERE cuota_id = %s
            AND estado = 'CONFIRMADO'
            """,
            (ajuste.cuota_id,)
        )

        pagos = cursor.fetchone()

        total_pagado = pagos["total_pagado"]

        monto_pendiente = total_cuota - total_pagado

        if monto_pendiente < 0:
            monto_pendiente = 0

        estado = "PAGADA" if monto_pendiente == 0 else (
            "PARCIAL" if total_pagado > 0 else "PENDIENTE"
        )

        cursor.execute(
            """
            UPDATE cuota
            SET
                monto_pendiente = %s,
                estado = %s
            WHERE id = %s
            """,
            (
                monto_pendiente,
                estado,
                ajuste.cuota_id
            )
        )

        conexion.commit()

        return {
            "id": ajuste_id,
            "cuota_id": ajuste.cuota_id,
            "tipo": ajuste.tipo,
            "monto": ajuste.monto,
            "descripcion": ajuste.descripcion,
            "total_cuota": total_cuota,
            "monto_pendiente": monto_pendiente
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def listar_ajustes(cuota_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                a.id,
                a.cuota_id,
                a.tipo,
                a.monto,
                a.moneda,
                a.descripcion,
                a.fecha
            FROM ajuste a
            INNER JOIN cuota c
                ON a.cuota_id = c.id
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            INNER JOIN movimiento m
                ON ct.movimiento_id = m.id
            WHERE a.cuota_id = %s
            AND m.usuario_id = %s
            ORDER BY a.fecha DESC
            """,
            (cuota_id, usuario_id)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()