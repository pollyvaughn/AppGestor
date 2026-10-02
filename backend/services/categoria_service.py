from backend.database import get_connection


def crear_categoria(categoria, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            INSERT INTO categoria
            (usuario_id, nombre, tipo, color, estado)
            VALUES (%s, %s, %s, %s, TRUE)
        """

        valores = (
            usuario_id,
            categoria.nombre,
            categoria.tipo,
            categoria.color
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.lastrowid

    finally:
        cursor.close()
        conexion.close()