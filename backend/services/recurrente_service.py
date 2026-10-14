from backend.database import get_connection
from datetime import date
from dateutil.relativedelta import relativedelta

from backend.services.saldo_service import actualizar_saldo, revertir_saldo
from backend.services.compra_tarjeta_service import crear_compra_con_cursor

def validar_referencias(cursor, recurrente, usuario_id):
    cursor.execute(
        """
        SELECT id, tipo
        FROM categoria
        WHERE id = %s
        AND usuario_id = %s
        AND estado = TRUE
        """,
        (recurrente.categoria_id, usuario_id)
    )

    categoria = cursor.fetchone()

    if not categoria:
        return "Categoría no encontrada"

    if categoria["tipo"] != recurrente.tipo:
        return "El tipo de la categoría no coincide con el tipo del recurrente"

    if recurrente.metodo_pago_id is not None:
        cursor.execute(
            """
            SELECT id, tipo, moneda
            FROM metodo_pago
            WHERE id = %s
            AND usuario_id = %s
            AND estado = 'ACTIVO'
            """,
            (recurrente.metodo_pago_id, usuario_id)
        )

        metodo = cursor.fetchone()

        if not metodo:
            return "Método de pago no encontrado"

        if metodo["moneda"] != recurrente.moneda:
            return "La moneda del recurrente no coincide con la del método de pago"

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

    except Exception:
        conexion.rollback()
        raise

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

    except Exception:
        conexion.rollback()
        raise

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

    except Exception:
        conexion.rollback()
        raise

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


def generar_movimiento(
    recurrente_id,
    usuario_id,
    monto=None,
    metodo_pago_id=None
):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        conexion.start_transaction()

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
                mp.estado AS metodo_estado,
                mp.tipo AS metodo_tipo,
                mp.moneda AS metodo_moneda
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
            metodo_pago_id is None
            and recurrente["metodo_pago_id"] is not None
            and recurrente["metodo_estado"] != "ACTIVO"
        ):
            return None, "El método de pago del recurrente está inactivo"

        if (
            metodo_pago_id is None
            and recurrente["metodo_pago_id"] is not None
            and recurrente["metodo_moneda"] != recurrente["moneda"]
        ):
            return None, "La moneda del recurrente no coincide con la del método de pago"

        metodo_pago_id_final = (
            metodo_pago_id
            if metodo_pago_id is not None
            else recurrente["metodo_pago_id"]
        )
        metodo_tipo = recurrente["metodo_tipo"]

        if metodo_pago_id is not None:
            cursor.execute(
                """
                SELECT tipo, moneda, estado
                FROM metodo_pago
                WHERE id = %s
                AND usuario_id = %s
                """,
                (metodo_pago_id_final, usuario_id)
            )
            metodo = cursor.fetchone()

            if not metodo or metodo["estado"] != "ACTIVO":
                return None, "Método de pago no encontrado o inactivo"

            if metodo["moneda"] != recurrente["moneda"]:
                return None, "La moneda del recurrente no coincide con la del método de pago"

            metodo_tipo = metodo["tipo"]

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

        movimiento_id = None

        # Recurrente con tarjeta de crédito
        if metodo_tipo == "TARJETA_CREDITO":

            if recurrente["tipo"] != "EGRESO":
                return None, "Una tarjeta de crédito solo puede usarse para recurrentes de tipo EGRESO"

            cursor.execute(
                """
                SELECT id
                FROM tarjeta_credito
                WHERE metodo_pago_id = %s
                AND estado = 'ACTIVA'
                """,
                (metodo_pago_id_final,)
            )

            tarjeta = cursor.fetchone()

            if not tarjeta:
                return None, "Tarjeta de crédito no encontrada o no está activa"

            compra_id, movimiento_id = crear_compra_con_cursor(
                cursor=cursor,
                usuario_id=usuario_id,
                tarjeta_id=tarjeta["id"],
                monto=monto_final,
                cantidad_cuotas=1,
                descripcion=recurrente["nombre"],
                fecha_compra=periodo,
                categoria_id=recurrente["categoria_id"]
            )

        # Recurrente con dinero propio
        else:
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
                    metodo_pago_id_final,
                    recurrente["tipo"],
                    recurrente["nombre"],
                    monto_final,
                    recurrente["moneda"],
                    periodo
                )
            )

            movimiento_id = cursor.lastrowid

            if metodo_pago_id_final is not None:
                actualizar_saldo(
                    cursor,
                    metodo_pago_id_final,
                    monto_final,
                    recurrente["tipo"]
                )

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
            SET proxima_fecha = %s
            WHERE id = %s
            AND usuario_id = %s
            """,
            (nueva_fecha, recurrente_id, usuario_id)
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

def anular_movimiento_recurrente(recurrente_id, periodo, usuario_id):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)
        conexion.start_transaction()

        cursor.execute(
            """
            SELECT
                mr.movimiento_id,
                m.metodo_pago_id,
                m.tipo,
                m.monto
            FROM movimiento_recurrente mr
            INNER JOIN recurrente r
                ON mr.recurrente_id = r.id
            INNER JOIN movimiento m
                ON mr.movimiento_id = m.id
            WHERE mr.recurrente_id = %s
            AND mr.periodo = %s
            AND r.usuario_id = %s
            AND m.estado != 'ANULADO'
            """,
            (recurrente_id, periodo, usuario_id)
        )

        movimiento = cursor.fetchone()

        if not movimiento:
            return None, "Movimiento recurrente no encontrado"

        movimiento_id = movimiento["movimiento_id"]

        cursor.execute(
            """
            SELECT id
            FROM compra_tarjeta
            WHERE movimiento_id = %s
            """,
            (movimiento_id,)
        )

        compra = cursor.fetchone()

        if compra:
            cursor.execute(
                """
                SELECT COUNT(*) AS cantidad
                FROM cuota
                WHERE compra_tarjeta_id = %s
                AND estado = 'PAGADA'
                """,
                (compra["id"],)
            )

            if cursor.fetchone()["cantidad"] > 0:
                return None, "No se puede anular: la compra tiene cuotas pagadas"

            cursor.execute(
                """
                UPDATE cuota
                SET estado = 'ANULADA',
                    monto_pendiente = 0
                WHERE compra_tarjeta_id = %s
                """,
                (compra["id"],)
            )

        else:
            if movimiento["metodo_pago_id"] is not None:
                revertir_saldo(
                    cursor,
                    movimiento["metodo_pago_id"],
                    movimiento["monto"],
                    movimiento["tipo"]
                )

        cursor.execute(
            """
            UPDATE movimiento
            SET estado = 'ANULADO'
            WHERE id = %s
            AND estado != 'ANULADO'
            """,
            (movimiento_id,)
        )

        cursor.execute(
            """
            INSERT INTO anulacion
            (movimiento_id, motivo)
            VALUES (%s, %s)
            """,
            (movimiento_id, "Movimiento recurrente anulado")
        )

        conexion.commit()

        return {
            "movimiento_id": movimiento_id,
            "periodo": periodo
        }, None

    except Exception:
        conexion.rollback()
        raise

    finally:
        cursor.close()
        conexion.close()