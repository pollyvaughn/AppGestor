from pwdlib import PasswordHash

from backend.database import get_connection


password_hasher = PasswordHash.recommended()


def crear_usuario(usuario):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        password_encriptada = password_hasher.hash(usuario.password)

        sql = """
            INSERT INTO usuario
            (nombre, email, password, estado)
            VALUES (%s, %s, %s, 'ACTIVO')
        """

        cursor.execute(
            sql,
            (
                usuario.nombre,
                usuario.email,
                password_encriptada
            )
        )

        conexion.commit()

        return cursor.lastrowid

    finally:
        cursor.close()
        conexion.close()


def obtener_usuario(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nombre, email, estado, created_at, updated_at
            FROM usuario
            WHERE id = %s
            """,
            (usuario_id,)
        )

        return cursor.fetchone()

    finally:
        cursor.close()
        conexion.close()


def actualizar_usuario(usuario_id, usuario):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            UPDATE usuario
            SET nombre = %s,
                email = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (
                usuario.nombre,
                usuario.email,
                usuario_id
            )
        )

        conexion.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        conexion.close()


def desactivar_usuario(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        cursor.execute(
            """
            UPDATE usuario
            SET estado = 'INACTIVO',
                updated_at = NOW()
            WHERE id = %s
            """,
            (usuario_id,)
        )

        conexion.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        conexion.close()