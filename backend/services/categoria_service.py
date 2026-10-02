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

def listar_categorias(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT id, nombre, tipo, color, estado
            FROM categoria
            WHERE usuario_id = %s
            AND estado = TRUE
            ORDER BY nombre
        """

        cursor.execute(sql, (usuario_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()

def editar_categoria(categoria_id, categoria, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE categoria
            SET nombre = %s,
                tipo = %s,
                color = %s
            WHERE id = %s
            AND usuario_id = %s
            AND estado = TRUE
        """

        valores = (
            categoria.nombre,
            categoria.tipo,
            categoria.color,
            categoria_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()


def eliminar_categoria(categoria_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE categoria
            SET estado = FALSE
            WHERE id = %s
            AND usuario_id = %s
            AND estado = TRUE
        """

        cursor.execute(sql, (categoria_id, usuario_id))
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()