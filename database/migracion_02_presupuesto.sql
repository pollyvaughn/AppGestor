USE finanzas;

-- Tope mensual de gasto por usuario y moneda (gráfico de ritmo de gasto).
-- No modifica datos existentes.
CREATE TABLE IF NOT EXISTS presupuesto (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    tope_mensual DECIMAL(15,2) NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_presupuesto_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id),

    CONSTRAINT uq_presupuesto_usuario_moneda
        UNIQUE (usuario_id, moneda),

    CONSTRAINT chk_presupuesto_tope
        CHECK (tope_mensual > 0)
);