from backend.database import get_connection


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
                tc.porcentaje_pago_minimo
            FROM tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            WHERE mp.usuario_id = %s
            ORDER BY mp.nombre
        """

        cursor.execute(sql, (usuario_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()


def editar_tarjeta(tarjeta_id, tarjeta, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()

        sql = """
            UPDATE tarjeta_credito tc
            INNER JOIN metodo_pago mp
                ON tc.metodo_pago_id = mp.id
            SET
                mp.nombre = %s,
                mp.moneda = %s,
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
            tarjeta.moneda,
            tarjeta.limite_credito,
            tarjeta.fecha_cierre,
            tarjeta.fecha_vencimiento,
            tarjeta.porcentaje_pago_minimo,
            tarjeta_id,
            usuario_id
        )

        cursor.execute(sql, valores)
        conexion.commit()

        return cursor.rowcount

    finally:
        cursor.close()
        conexion.close()


def eliminar_tarjeta(tarjeta_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

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

        # Por ahora solamente verificamos que exista.
        # La regla de impedir la baja cuando quedan cuotas
        # la implementamos cuando hagamos cuotas.
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

    finally:
        cursor.close()
        conexion.close()