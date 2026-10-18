from backend.database import get_connection

CATEGORIAS_POR_DEFECTO = [
    ("Salario", "INGRESO", "#2A6049"),
    ("Trabajo freelance", "INGRESO", "#4A8A7A"),
    ("Otros ingresos", "INGRESO", "#7A7873"),
    ("Comida", "EGRESO", "#A86B3B"),
    ("Transporte", "EGRESO", "#3B6EA8"),
    ("Servicios", "EGRESO", "#5A6EA8"),
    ("Hogar", "EGRESO", "#B07840"),
    ("Salud", "EGRESO", "#4A8A7A"),
    ("Ocio", "EGRESO", "#7B5EA7"),
    ("Otros gastos", "EGRESO", "#7A7873"),
]


def crear_categorias_por_defecto(cursor, usuario_id):
    cursor.executemany(
        """
        INSERT INTO categoria
        (usuario_id, nombre, tipo, color, estado)
        VALUES (%s, %s, %s, %s, TRUE)
        """,
        [
            (usuario_id, nombre, tipo, color)
            for nombre, tipo, color in CATEGORIAS_POR_DEFECTO
        ]
    )

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
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT tipo
            FROM categoria
            WHERE id = %s
            AND usuario_id = %s
            AND estado = TRUE
            """,
            (categoria_id, usuario_id)
        )

        categoria_actual = cursor.fetchone()

        if not categoria_actual:
            return 0

        if categoria_actual["tipo"] != categoria.tipo:
            cursor.execute(
                """
                SELECT id
                FROM movimiento
                WHERE categoria_id = %s
                AND usuario_id = %s
                LIMIT 1
                """,
                (categoria_id, usuario_id)
            )

            if cursor.fetchone():
                return -1

            cursor.execute(
                """
                SELECT id
                FROM recurrente
                WHERE categoria_id = %s
                AND usuario_id = %s
                LIMIT 1
                """,
                (categoria_id, usuario_id)
            )

            if cursor.fetchone():
                return -1

        cursor.execute(
            """
            UPDATE categoria
            SET nombre = %s,
                tipo = %s,
                color = %s
            WHERE id = %s
            AND usuario_id = %s
            AND estado = TRUE
            """,
            (
                categoria.nombre,
                categoria.tipo,
                categoria.color,
                categoria_id,
                usuario_id
            )
        )

        conexion.commit()
        return cursor.rowcount

    except Exception:
        conexion.rollback()
        raise

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