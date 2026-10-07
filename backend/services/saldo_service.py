from backend.database import get_connection


def actualizar_saldo(cursor, metodo_pago_id, monto, tipo):
    if tipo == "INGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo + %s
            WHERE id = %s
            AND tipo != 'TARJETA_CREDITO'
        """

    elif tipo == "EGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo - %s
            WHERE id = %s
            AND tipo != 'TARJETA_CREDITO'
        """

    else:
        return

    cursor.execute(sql, (monto, metodo_pago_id))

def revertir_saldo(cursor, metodo_pago_id, monto, tipo):
    if tipo == "INGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo - %s
            WHERE id = %s
            AND tipo != 'TARJETA_CREDITO'
        """

    elif tipo == "EGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo + %s
            WHERE id = %s
            AND tipo != 'TARJETA_CREDITO'
        """

    else:
        return

    cursor.execute(sql, (monto, metodo_pago_id))