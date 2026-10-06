from backend.database import get_connection
from datetime import date
from dateutil.relativedelta import relativedelta


def validar_referencias(cursor, recurrente, usuario_id):
    cursor.execute(
        """
        SELECT id
        FROM categoria
        WHERE id = %s
        AND usuario_id = %s
        AND estado = TRUE
        """,
        (recurrente.categoria_id, usuario_id)
    )

    if not cursor.fetchone():
        return "Categoría no encontrada"

    if recurrente.metodo_pago_id is not None:
        cursor.execute(
            """
            SELECT id
            FROM metodo_pago
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
            """,
            (recurrente.metodo_pago_id, usuario_id)
        )

        if not cursor.fetchone():
            return "Método de pago no encontrado"

    return None


def crear_recurrente(recurrente, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        error = validar_referencias(cursor, recurrente, usuario_id)

        if error:
            return None, error

        sql = """
            INSERT INTO recurrente
            (
                usuario_id,
                categoria_id,
                metodo_pago_id,
                nombre,
                tipo,
                monto_base,
                moneda,
                frecuencia,
                proxima_fecha,
                estado
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVO')
        """

        valores = (
            usuario_id,
            recurrente.categoria_id,
            recurrente.metodo_pago_id,
            recurrente.nombre,
            recurrente.tipo,
            recurrente.monto_base,
            recurrente.moneda,
            recurrente.frecuencia,
            recurrente.proxima_fecha
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.lastrowid, None

    finally:
        cursor.close()
        conexion.close()


def listar_recurrentes(usuario_id, tipo=None):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT
                r.id,
                r.categoria_id,
                c.nombre AS categoria,
                r.metodo_pago_id,
                mp.nombre AS metodo_pago,
                r.nombre,
                r.tipo,
                r.monto_base,
                r.moneda,
                r.frecuencia,
                r.proxima_fecha,
                r.estado
            FROM recurrente r
            INNER JOIN categoria c
                ON r.categoria_id = c.id
            LEFT JOIN metodo_pago mp
                ON r.metodo_pago_id = mp.id
            WHERE r.usuario_id = %s
            AND r.estado = 'ACTIVO'
        """

        valores = [usuario_id]

        if tipo is not None:
            sql += " AND r.tipo = %s"
            valores.append(tipo)

        sql += " ORDER BY r.nombre"

        cursor.execute(sql, tuple(valores))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()


def editar_recurrente(recurrente_id, recurrente, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        error = validar_referencias(cursor, recurrente, usuario_id)

        if error:
            return False, error

        sql = """
            UPDATE recurrente
            SET categoria_id = %s,
                metodo_pago_id = %s,
                nombre = %s,
                tipo = %s,
                monto_base = %s,
                moneda = %s,
                frecuencia = %s,
                proxima_fecha = %s
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
        """

        valores = (
            recurrente.categoria_id,
            recurrente.metodo_pago_id,
            recurrente.nombre,
            recurrente.tipo,
            recurrente.monto_base,
            recurrente.moneda,
            recurrente.frecuencia,
            recurrente.proxima_fecha,
            recurrente_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        if cursor.rowcount == 0:
            return False, "Recurrente no encontrado"

        return True, None

    finally:
        cursor.close()
        conexion.close()


def eliminar_recurrente(recurrente_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE recurrente
            SET estado = 'INACTIVO'
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
        """

        cursor.execute(sql, (recurrente_id, usuario_id))
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()


INTERVALOS = {
    "DIARIA": relativedelta(days=1),
    "SEMANAL": relativedelta(weeks=1),
    "QUINCENAL": relativedelta(days=15),
    "MENSUAL": relativedelta(months=1),
    "BIMESTRAL": relativedelta(months=2),
    "TRIMESTRAL": relativedelta(months=3),
    "SEMESTRAL": relativedelta(months=6),
    "ANUAL": relativedelta(years=1)
}


def generar_movimiento(recurrente_id, usuario_id, monto=None):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                r.id,
                r.categoria_id,
                r.metodo_pago_id,
                r.nombre,
                r.tipo,
                r.monto_base,
                r.moneda,
                r.frecuencia,
                r.proxima_fecha,
                c.estado AS categoria_estado,
                mp.estado AS metodo_estado
            FROM recurrente r
            INNER JOIN categoria c
                ON r.categoria_id = c.id
            LEFT JOIN metodo_pago mp
                ON r.metodo_pago_id = mp.id
            WHERE r.id = %s
            AND r.usuario_id = %s
            AND r.estado = 'ACTIVO'
            """,
            (recurrente_id, usuario_id)
        )

        recurrente = cursor.fetchone()

        if not recurrente:
            return None, "Recurrente no encontrado"

        if not recurrente["categoria_estado"]:
            return None, "La categoría del recurrente está inactiva"

        if (
            recurrente["metodo_pago_id"] is not None
            and recurrente["metodo_estado"] != "ACTIVO"
        ):
            return None, "El método de pago del recurrente está inactivo"

        periodo = recurrente["proxima_fecha"]

        if periodo is None:
            return None, "El recurrente no tiene próxima fecha definida"

        if periodo > date.today():
            return None, "Todavía no corresponde generar este período"

        cursor.execute(
            """
            SELECT id
            FROM movimiento_recurrente
            WHERE recurrente_id = %s
            AND periodo = %s
            """,
            (recurrente_id, periodo)
        )

        if cursor.fetchone():
            return None, "Ese período ya fue generado"

        if monto is not None:
            monto_final = monto
        else:
            monto_final = float(recurrente["monto_base"])

        cursor.execute(
            """
            INSERT INTO movimiento
            (
                usuario_id,
                categoria_id,
                metodo_pago_id,
                tipo,
                estado,
                descripcion,
                monto,
                moneda,
                fecha
            )
            VALUES (%s, %s, %s, %s, 'CONFIRMADO', %s, %s, %s, %s)
            """,
            (
                usuario_id,
                recurrente["categoria_id"],
                recurrente["metodo_pago_id"],
                recurrente["tipo"],
                recurrente["nombre"],
                monto_final,
                recurrente["moneda"],
                periodo
            )
        )

        movimiento_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO movimiento_recurrente
            (recurrente_id, movimiento_id, periodo, monto)
            VALUES (%s, %s, %s, %s)
            """,
            (
                recurrente_id,
                movimiento_id,
                periodo,
                monto_final
            )
        )

        nueva_fecha = periodo + INTERVALOS[recurrente["frecuencia"]]

        cursor.execute(
            """
            UPDATE recurrente
            SET proxima_fecha = %s,
                monto_base = %s
            WHERE id = %s
            AND usuario_id = %s
            """,
            (nueva_fecha, monto_final, recurrente_id, usuario_id)
        )

        conexion.commit()

        return {
            "movimiento_id": movimiento_id,
            "periodo": periodo,
            "monto": monto_final,
            "proxima_fecha": nueva_fecha
        }, None

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()