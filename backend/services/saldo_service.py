def actualizar_saldo(cursor, metodo_pago_id, monto, tipo):
    cursor.execute("""
        SELECT tipo, saldo
        FROM metodo_pago
        WHERE id = %s
    """, (metodo_pago_id,))

    metodo = cursor.fetchone()

    if not metodo:
        raise ValueError("Método de pago no encontrado")

    if tipo == "INGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo + %s
            WHERE id = %s
        """

    elif tipo == "EGRESO":
        if metodo["tipo"] in ("EFECTIVO", "BILLETERA"):
            if metodo["saldo"] < monto:
                raise ValueError(
                    "Saldo insuficiente para realizar el egreso"
                )

        sql = """
            UPDATE metodo_pago
            SET saldo = saldo - %s
            WHERE id = %s
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
        """

    elif tipo == "EGRESO":
        sql = """
            UPDATE metodo_pago
            SET saldo = saldo + %s
            WHERE id = %s
        """

    else:
        return

    cursor.execute(sql, (monto, metodo_pago_id))