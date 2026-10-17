USE finanzas;

-- Agrega el tipo SALDO_INICIAL a los movimientos.
ALTER TABLE movimiento
    MODIFY tipo ENUM(
        'INGRESO',
        'EGRESO',
        'TRANSFERENCIA',
        'PAGO_TARJETA',
        'AJUSTE',
        'SALDO_INICIAL'
    ) NOT NULL;