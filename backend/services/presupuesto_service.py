from backend.database import get_connection


def listar_presupuestos(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT moneda, tope_mensual
            FROM presupuesto
            WHERE usuario_id = %s
            ORDER BY moneda
            """,
            (usuario_id,)
        )

        presupuestos = cursor.fetchall()

        for presupuesto in presupuestos:
            presupuesto["tope_mensual"] = float(
                presupuesto["tope_mensual"]
            )

        return presupuestos

    finally:
        cursor.close()
        conexion.close()


def guardar_presupuesto(usuario_id, moneda, tope_mensual):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        # Un solo tope por usuario y moneda: si ya existe, se actualiza.
        cursor.execute(
            """
            INSERT INTO presupuesto
            (usuario_id, moneda, tope_mensual)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                tope_mensual = VALUES(tope_mensual)
            """,
            (usuario_id, moneda, tope_mensual)
        )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def quitar_presupuesto(usuario_id, moneda):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            DELETE FROM presupuesto
            WHERE usuario_id = %s
            AND moneda = %s
            """,
            (usuario_id, moneda)
        )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()