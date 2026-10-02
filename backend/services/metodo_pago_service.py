from backend.database import get_connection


def crear_metodo_pago(metodo, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            INSERT INTO metodo_pago
            (usuario_id, tipo, nombre, moneda, estado, saldo)
            VALUES (%s, %s, %s, %s, 'ACTIVO', %s)
        """

        valores = (
            usuario_id,
            metodo.tipo,
            metodo.nombre,
            metodo.moneda,
            metodo.saldo
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.lastrowid

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
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE metodo_pago
            SET tipo = %s,
                nombre = %s,
                moneda = %s,
                saldo = %s
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
        """

        valores = (
            metodo.tipo,
            metodo.nombre,
            metodo.moneda,
            metodo.saldo,
            metodo_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()


def eliminar_metodo_pago(metodo_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

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