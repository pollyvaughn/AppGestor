from backend.database import get_connection
from backend.services.saldo_service import actualizar_saldo, revertir_saldo


def crear_movimiento(movimiento, usuario_id):
    if movimiento.tipo in ("INGRESO", "EGRESO"):
        if movimiento.categoria_id is None:
            return None, "La categoría es obligatoria para ingresos y egresos"
        if movimiento.metodo_pago_id is None:
            return None, "La cuenta o método de pago es obligatorio para ingresos y egresos"

    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        # Verificar categoría
        if movimiento.categoria_id is not None:
            cursor.execute(
                """
                SELECT id, tipo
                FROM categoria
                WHERE id = %s
                AND usuario_id = %s
                AND estado = TRUE
                """,
                (movimiento.categoria_id, usuario_id)
            )

            categoria = cursor.fetchone()

            if not categoria:
                return None, "Categoría no encontrada"

            if movimiento.tipo in ("INGRESO", "EGRESO"):
                if categoria["tipo"] != movimiento.tipo:
                    return None, "La categoría no corresponde al tipo de movimiento"

        # Verificar método de pago
        if movimiento.metodo_pago_id is not None:
            cursor.execute(
                """
                SELECT id, tipo, moneda
                FROM metodo_pago
                WHERE id = %s
                AND usuario_id = %s
                AND estado = 'ACTIVO'
                """,
                (movimiento.metodo_pago_id, usuario_id)
            )

            metodo = cursor.fetchone()

            if not metodo:
                return None, "Método de pago no encontrado"

            if movimiento.tipo in ("INGRESO", "EGRESO"):
                if metodo["moneda"] != movimiento.moneda:
                    return None, "La moneda del movimiento no coincide con la de la cuenta"
                if movimiento.tipo == "INGRESO" and metodo["tipo"] == "TARJETA_CREDITO":
                    return None, "No se puede registrar un ingreso en una tarjeta de crédito"
                if movimiento.tipo == "EGRESO" and metodo["tipo"] == "TARJETA_CREDITO":
                    return None, "Registrá las compras con tarjeta desde la sección Tarjetas"

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

        movimiento_id = cursor.lastrowid

        # Actualizar saldo del método de pago
        if movimiento.metodo_pago_id is not None:
            try:
                actualizar_saldo(
                    cursor,
                    movimiento.metodo_pago_id,
                    movimiento.monto,
                    movimiento.tipo
                )
            except ValueError as e:
                conexion.rollback()
                return None, str(e)

        conexion.commit()

        return movimiento_id, None

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()

def listar_movimientos(usuario_id, categoria_id=None):
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
        """

        valores = [usuario_id]

        if categoria_id is not None:
            sql += " AND m.categoria_id = %s"
            valores.append(categoria_id)

        sql += " ORDER BY m.fecha DESC"

        cursor.execute(sql, tuple(valores))

        return cursor.fetchall()

    finally:
        cursor.close()
        conexion.close()

def editar_movimiento(movimiento_id, movimiento, usuario_id):
    if movimiento.tipo in ("INGRESO", "EGRESO"):
        if movimiento.categoria_id is None:
            return False, "La categoría es obligatoria para ingresos y egresos"
        if movimiento.metodo_pago_id is None:
            return False, "La cuenta o método de pago es obligatorio para ingresos y egresos"

    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        # Obtener movimiento actual
        cursor.execute(
            """
            SELECT metodo_pago_id, tipo, monto
            FROM movimiento
            WHERE id = %s
            AND usuario_id = %s
            AND estado != 'ANULADO'
            """,
            (movimiento_id, usuario_id)
        )

        movimiento_actual = cursor.fetchone()

        if not movimiento_actual:
            return False, "Movimiento no encontrado"

        # Verificar categoría
        if movimiento.categoria_id is not None:
            cursor.execute(
                """
                SELECT id, tipo
                FROM categoria
                WHERE id = %s
                AND usuario_id = %s
                AND estado = TRUE
                """,
                (movimiento.categoria_id, usuario_id)
            )

            categoria = cursor.fetchone()

            if not categoria:
                return False, "Categoría no encontrada"

            if movimiento.tipo in ("INGRESO", "EGRESO"):
                if categoria["tipo"] != movimiento.tipo:
                    return False, "La categoría no corresponde al tipo de movimiento"

        # Verificar método de pago
        if movimiento.metodo_pago_id is not None:
            cursor.execute(
                """
                SELECT id, tipo, moneda
                FROM metodo_pago
                WHERE id = %s
                AND usuario_id = %s
                AND estado = 'ACTIVO'
                """,
                (movimiento.metodo_pago_id, usuario_id)
            )

            metodo = cursor.fetchone()

            if not metodo:
                return False, "Método de pago no encontrado"

            if movimiento.tipo in ("INGRESO", "EGRESO"):
                if metodo["moneda"] != movimiento.moneda:
                    return False, "La moneda del movimiento no coincide con la de la cuenta"
                if movimiento.tipo == "INGRESO" and metodo["tipo"] == "TARJETA_CREDITO":
                    return False, "No se puede registrar un ingreso en una tarjeta de crédito"
                if movimiento.tipo == "EGRESO" and metodo["tipo"] == "TARJETA_CREDITO":
                    return False, "Registrá las compras con tarjeta desde la sección Tarjetas"

        # Revertir efecto del movimiento anterior
        if movimiento_actual["metodo_pago_id"] is not None:
            revertir_saldo(
                cursor,
                movimiento_actual["metodo_pago_id"],
                movimiento_actual["monto"],
                movimiento_actual["tipo"]
            )

        # Actualizar movimiento
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

        # Aplicar efecto del nuevo movimiento
        if movimiento.metodo_pago_id is not None:
            try:
                actualizar_saldo(
                    cursor,
                    movimiento.metodo_pago_id,
                    movimiento.monto,
                    movimiento.tipo
                )
            except ValueError as e:
                conexion.rollback()
                return None, str(e)

        conexion.commit()

        return True, None

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()


def eliminar_movimiento(movimiento_id, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        # Obtener movimiento actual
        cursor.execute(
            """
            SELECT metodo_pago_id, tipo, monto
            FROM movimiento
            WHERE id = %s
            AND usuario_id = %s
            AND estado != 'ANULADO'
            """,
            (movimiento_id, usuario_id)
        )

        movimiento = cursor.fetchone()

        if not movimiento:
            return 0

        # Revertir efecto del movimiento
        if movimiento["metodo_pago_id"] is not None:
            revertir_saldo(
                cursor,
                movimiento["metodo_pago_id"],
                movimiento["monto"],
                movimiento["tipo"]
            )

        # Anular movimiento
        cursor.execute(
            """
            UPDATE movimiento
            SET estado = 'ANULADO'
            WHERE id = %s
            AND usuario_id = %s
            AND estado != 'ANULADO'
            """,
            (movimiento_id, usuario_id)
        )

        conexion.commit()

        return cursor.rowcount

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()