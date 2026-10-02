from backend.database import get_connection


def crear_movimiento(movimiento, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        # Verificar categoría
        if movimiento.categoria_id is not None:
            cursor.execute(
                """
                SELECT id
                FROM categoria
                WHERE id = %s
                AND usuario_id = %s
                AND estado = TRUE
                """,
                (movimiento.categoria_id, usuario_id)
            )

            if not cursor.fetchone():
                return None, "Categoría no encontrada"

        # Verificar método de pago
        if movimiento.metodo_pago_id is not None:
            cursor.execute(
                """
                SELECT id
                FROM metodo_pago
                WHERE id = %s
                AND usuario_id = %s
                AND estado = 'ACTIVO'
                """,
                (movimiento.metodo_pago_id, usuario_id)
            )

            if not cursor.fetchone():
                return None, "Método de pago no encontrado"

        sql = """
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
                tipo_cambio,
                fecha
            )
            VALUES (%s, %s, %s, %s, 'CONFIRMADO',
                    %s, %s, %s, %s, COALESCE(%s, NOW()))
        """

        valores = (
            usuario_id,
            movimiento.categoria_id,
            movimiento.metodo_pago_id,
            movimiento.tipo,
            movimiento.descripcion,
            movimiento.monto,
            movimiento.moneda,
            movimiento.tipo_cambio,
            movimiento.fecha
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.lastrowid, None

    finally:
        cursor.close()
        conexion.close()


def listar_movimientos(usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        sql = """
            SELECT
                m.id,
                m.categoria_id,
                c.nombre AS categoria,
                m.metodo_pago_id,
                mp.nombre AS metodo_pago,
                m.tipo,
                m.estado,
                m.descripcion,
                m.monto,
                m.moneda,
                m.tipo_cambio,
                m.fecha
            FROM movimiento m
            LEFT JOIN categoria c
                ON m.categoria_id = c.id
            LEFT JOIN metodo_pago mp
                ON m.metodo_pago_id = mp.id
            WHERE m.usuario_id = %s
            ORDER BY m.fecha DESC
        """

        cursor.execute(sql, (usuario_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()


def editar_movimiento(movimiento_id, movimiento, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        # Verificar categoría
        if movimiento.categoria_id is not None:
            cursor.execute(
                """
                SELECT id
                FROM categoria
                WHERE id = %s
                AND usuario_id = %s
                AND estado = TRUE
                """,
                (movimiento.categoria_id, usuario_id)
            )

            if not cursor.fetchone():
                return False, "Categoría no encontrada"

        # Verificar método de pago
        if movimiento.metodo_pago_id is not None:
            cursor.execute(
                """
                SELECT id
                FROM metodo_pago
                WHERE id = %s
                AND usuario_id = %s
                AND estado = 'ACTIVO'
                """,
                (movimiento.metodo_pago_id, usuario_id)
            )

            if not cursor.fetchone():
                return False, "Método de pago no encontrado"

        sql = """
            UPDATE movimiento
            SET categoria_id = %s,
                metodo_pago_id = %s,
                tipo = %s,
                descripcion = %s,
                monto = %s,
                moneda = %s,
                tipo_cambio = %s,
                fecha = COALESCE(%s, fecha)
            WHERE id = %s
            AND usuario_id = %s
            AND estado != 'ANULADO'
        """

        valores = (
            movimiento.categoria_id,
            movimiento.metodo_pago_id,
            movimiento.tipo,
            movimiento.descripcion,
            movimiento.monto,
            movimiento.moneda,
            movimiento.tipo_cambio,
            movimiento.fecha,
            movimiento_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        if cursor.rowcount == 0:
            return False, "Movimiento no encontrado"

        return True, None

    finally:
        cursor.close()
        conexion.close()


def eliminar_movimiento(movimiento_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE movimiento
            SET estado = 'ANULADO'
            WHERE id = %s
            AND usuario_id = %s
            AND estado != 'ANULADO'
        """

        cursor.execute(sql, (movimiento_id, usuario_id))
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()