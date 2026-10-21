# =========================================================
# Servicio de tarjetas de crédito
# Crear, listar, editar y dar de baja tarjetas.
#
# Punto 4: editar_tarjeta ya no toca la moneda. La moneda vive en
# metodo_pago.moneda y la usan las compras y cuotas ya creadas;
# cambiarla dejaría esos datos en una moneda distinta a la de la tarjeta.
# =========================================================

from backend.database import get_connection
from fastapi import HTTPException

def crear_tarjeta(tarjeta, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        conexion.start_transaction()

        cursor.execute(
            """
            INSERT INTO metodo_pago
            (usuario_id, tipo, nombre, moneda, estado, saldo)
            VALUES (%s, 'TARJETA_CREDITO', %s, %s, 'ACTIVO', 0)
            """,
            (
                usuario_id,
                tarjeta.nombre,
                tarjeta.moneda
            )
        )

        metodo_pago_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO tarjeta_credito
            (
                metodo_pago_id,
                limite_credito,
                fecha_cierre,
                fecha_vencimiento,
                porcentaje_pago_minimo
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                metodo_pago_id,
                tarjeta.limite_credito,
                tarjeta.fecha_cierre,
                tarjeta.fecha_vencimiento,
                tarjeta.porcentaje_pago_minimo
            )
        )

        tarjeta_id = cursor.lastrowid

        conexion.commit()

        return tarjeta_id

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def listar_tarjetas(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT
                tc.id,
                tc.metodo_pago_id,
                mp.nombre,
                mp.moneda,
                tc.estado,
                tc.limite_credito,
                tc.fecha_cierre,
                tc.fecha_vencimiento,
                tc.porcentaje_pago_minimo,

                COALESCE((
                    SELECT SUM(
                        CASE
                            WHEN p.estado = 'CONFIRMADO'
                            THEN p.monto
                            ELSE 0
                        END
                    )
                    FROM cuota c
                    INNER JOIN compra_tarjeta ct
                        ON c.compra_tarjeta_id = ct.id
                    INNER JOIN pago p
                        ON p.cuota_id = c.id
                    WHERE ct.tarjeta_id = tc.id
                ), 0) AS total_pagado,

                COALESCE((
                    SELECT SUM(c.monto_pendiente)
                    FROM cuota c
                    INNER JOIN compra_tarjeta ct
                        ON c.compra_tarjeta_id = ct.id
                    WHERE ct.tarjeta_id = tc.id
                    AND c.estado IN ('PENDIENTE', 'PARCIAL')
                ), 0) AS deuda_actual

            FROM tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE mp.usuario_id = %s
            ORDER BY mp.nombre
        """

        cursor.execute(sql, (usuario_id,))
        tarjetas = cursor.fetchall()

        for tarjeta in tarjetas:
            tarjeta["limite_credito"] = float(
                tarjeta["limite_credito"]
            )

            tarjeta["deuda_actual"] = float(
                tarjeta["deuda_actual"]
            )

            tarjeta["disponible"] = round(
                tarjeta["limite_credito"]
                - tarjeta["deuda_actual"],
                2
            )

            tarjeta["total_pagado"] = float(
                tarjeta["total_pagado"]
            )

        return tarjetas

    finally:
        cursor.close()
        conexion.close()

def editar_tarjeta(tarjeta_id, tarjeta, usuario_id):
    conexion = get_connection()
    cursor = None

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        # Se lee la moneda actual (y se bloquea la fila con FOR UPDATE
        # hasta el commit) para comparar con lo que llega.
        cursor.execute(
            """
            SELECT mp.moneda
            FROM tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE tc.id = %s
            AND mp.usuario_id = %s
            AND tc.estado != 'DADA_DE_BAJA'
            FOR UPDATE
            """,
            (tarjeta_id, usuario_id)
        )

        actual = cursor.fetchone()

        if not actual:
            conexion.rollback()
            return 0

        # La moneda es opcional en el modelo: si no se manda, no hay nada
        # que comparar. Si se manda y es distinta, se rechaza (400 por el
        # handler global de ValueError en app.py).
        if tarjeta.moneda is not None and tarjeta.moneda != actual["moneda"]:
            raise ValueError(
                "No se puede cambiar la moneda de una tarjeta: "
                "las compras y cuotas ya creadas quedarían en otra moneda"
            )

        # OJO: acá ya no está mp.moneda en el SET.
        sql = """
            UPDATE tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            SET
                mp.nombre = %s,
                tc.limite_credito = %s,
                tc.fecha_cierre = %s,
                tc.fecha_vencimiento = %s,
                tc.porcentaje_pago_minimo = %s
            WHERE tc.id = %s
            AND mp.usuario_id = %s
            AND tc.estado != 'DADA_DE_BAJA'
        """

        valores = (
            tarjeta.nombre,
            tarjeta.limite_credito,
            tarjeta.fecha_cierre,
            tarjeta.fecha_vencimiento,
            tarjeta.porcentaje_pago_minimo,
            tarjeta_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        # La tarjeta existe (la leímos arriba): devolvemos 1 siempre.
        # Con cursor.rowcount, un guardado sin cambios podía dar 0
        # y la ruta lo confundiría con "Tarjeta no encontrada".
        return 1

    except Exception:
        conexion.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()


def eliminar_tarjeta(tarjeta_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

        cursor.execute(
            """
            SELECT tc.id
            FROM tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE tc.id = %s
            AND mp.usuario_id = %s
            AND tc.estado != 'DADA_DE_BAJA'
            """,
            (tarjeta_id, usuario_id)
        )

        tarjeta = cursor.fetchone()

        if not tarjeta:
            return 0

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM cuota c
            INNER JOIN compra_tarjeta ct
                ON c.compra_tarjeta_id = ct.id
            WHERE ct.tarjeta_id = %s
            AND c.estado IN ('PENDIENTE', 'PARCIAL')
            """,
            (tarjeta_id,)
        )

        cuotas_pendientes = cursor.fetchone()

        if cuotas_pendientes["total"] > 0:
            raise HTTPException(
                status_code=400,
                detail="No se puede dar de baja la tarjeta porque tiene cuotas pendientes"
            )

        cursor.execute(
            """
            UPDATE tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            SET
                tc.estado = 'DADA_DE_BAJA',
                mp.estado = 'INACTIVO'
            WHERE tc.id = %s
            AND mp.usuario_id = %s
            """,
            (tarjeta_id, usuario_id)
        )

        conexion.commit()

        return cursor.rowcount

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()