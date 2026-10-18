from backend.database import get_connection
from fastapi import HTTPException


def crear_metodo_pago(metodo, usuario_id):
    if metodo.tipo == "TARJETA_CREDITO":
        raise HTTPException(
            status_code=400,
            detail="Las tarjetas se administran desde la pestaña Tarjetas"
        )

    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            INSERT INTO metodo_pago
            (usuario_id, tipo, nombre, moneda, estado, saldo)
            VALUES (%s, %s, %s, %s, 'ACTIVO', %s)
            """,
            (usuario_id, metodo.tipo, metodo.nombre, metodo.moneda, metodo.saldo)
        )

        metodo_id = cursor.lastrowid

        if metodo.saldo != 0:
            cursor.execute(
                """
                INSERT INTO movimiento
                (usuario_id, metodo_pago_id, tipo, estado,
                 descripcion, monto, moneda)
                 VALUES (%s, %s, 'SALDO_INICIAL', 'CONFIRMADO',
                        'Saldo inicial', %s, %s)
                """,
                (usuario_id, metodo_id, metodo.saldo, metodo.moneda)
            )

        conexion.commit()

        return metodo_id

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def listar_metodos_pago(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT id, tipo, nombre, moneda, saldo, estado
            FROM metodo_pago
            WHERE usuario_id = %s
            AND estado = 'ACTIVO'
            ORDER BY nombre
        """

        cursor.execute(sql, (usuario_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()

def editar_metodo_pago(metodo_id, metodo, usuario_id):
    if metodo.tipo == "TARJETA_CREDITO":
        raise HTTPException(
            status_code=400,
            detail="Las tarjetas se administran desde la pestaña Tarjetas"
        )

    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        # moneda y saldo no se editan: el saldo solo cambia con movimientos
        cursor.execute(
            """
            UPDATE metodo_pago
            SET tipo = %s,
                nombre = %s
            WHERE id = %s
              AND usuario_id = %s
              AND estado = 'ACTIVO'
              AND tipo != 'TARJETA_CREDITO'
            """,
            (metodo.tipo, metodo.nombre, metodo_id, usuario_id)
        )
        conexion.commit()

        return cursor.rowcount

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def eliminar_metodo_pago(metodo_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT tipo
            FROM metodo_pago
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
            """,
            (metodo_id, usuario_id)
        )
        metodo = cursor.fetchone()

        if not metodo:
            return 0

        if metodo["tipo"] != "TARJETA_CREDITO":
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM metodo_pago
                WHERE usuario_id = %s
                AND estado = 'ACTIVO'
                AND tipo != 'TARJETA_CREDITO'
                """,
                (usuario_id,)
            )
            cantidad = cursor.fetchone()["total"]

            if cantidad <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede desactivar la última cuenta de dinero disponible"
                )

        sql = """
            UPDATE metodo_pago
            SET estado = 'INACTIVO'
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
        """

        cursor.execute(sql, (metodo_id, usuario_id))
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()

def ajustar_saldo(metodo_id, datos, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, tipo, moneda, saldo
            FROM metodo_pago
            WHERE id = %s
              AND usuario_id = %s
              AND estado = 'ACTIVO'
              AND tipo != 'TARJETA_CREDITO'
            FOR UPDATE
            """,
            (metodo_id, usuario_id)
        )

        metodo = cursor.fetchone()

        if not metodo:
            return None

        diferencia = round(datos.saldo_real - float(metodo["saldo"]), 2)

        if diferencia == 0:
            raise ValueError("El saldo ya coincide, no hay nada que ajustar")

        cursor.execute(
            """
            INSERT INTO movimiento
            (usuario_id, metodo_pago_id, tipo, estado,
             descripcion, monto, moneda)
            VALUES (%s, %s, 'AJUSTE', 'CONFIRMADO', %s, %s, %s)
            """,
            (
                usuario_id,
                metodo_id,
                datos.motivo or "Ajuste de saldo",
                diferencia,
                metodo["moneda"]
            )
        )

        movimiento_id = cursor.lastrowid

        cursor.execute(
            "UPDATE metodo_pago SET saldo = saldo + %s WHERE id = %s",
            (diferencia, metodo_id)
        )

        conexion.commit()

        return {
            "mensaje": "Saldo ajustado",
            "movimiento_id": movimiento_id,
            "diferencia": diferencia
        }

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()