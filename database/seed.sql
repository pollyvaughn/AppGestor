USE finanzas;

-- Datos de demostración para AppGestor.
-- No borra datos existentes y se puede volver a ejecutar sin duplicar los
-- registros de esta demo.

START TRANSACTION;

-- Acceso: demo@appgestor.local / Demo123!
INSERT INTO usuario (nombre, email, password, estado)
SELECT
    'Usuario Demo',
    'demo@appgestor.local',
    '$argon2id$v=19$m=65536,t=3,p=4$t91ZVQ8QBPlii8uRKecSFQ$0LBmxhDCkfeWNtvz3yk0A96bJFCfPa0kU6kpJybB054',
    'ACTIVO'
WHERE NOT EXISTS (
    SELECT 1
    FROM usuario
    WHERE email = 'demo@appgestor.local'
);

SET @demo_usuario_id = (
    SELECT id
    FROM usuario
    WHERE email = 'demo@appgestor.local'
);

INSERT INTO categoria (usuario_id, nombre, tipo, color, estado)
SELECT @demo_usuario_id, datos.nombre, datos.tipo, datos.color, TRUE
FROM (
    SELECT 'Salario' AS nombre, 'INGRESO' AS tipo, '#5B9A72' AS color
    UNION ALL SELECT 'Trabajo freelance', 'INGRESO', '#4D8FA8'
    UNION ALL SELECT 'Supermercado', 'EGRESO', '#D28B45'
    UNION ALL SELECT 'Restaurantes', 'EGRESO', '#C96B5C'
    UNION ALL SELECT 'Transporte', 'EGRESO', '#6F83B5'
    UNION ALL SELECT 'Servicios', 'EGRESO', '#8870AA'
    UNION ALL SELECT 'Salud', 'EGRESO', '#5E9B9B'
    UNION ALL SELECT 'Ocio', 'EGRESO', '#C4779D'
    UNION ALL SELECT 'Tecnología', 'EGRESO', '#778899'
) AS datos
WHERE NOT EXISTS (
    SELECT 1
    FROM categoria c
    WHERE c.usuario_id = @demo_usuario_id
      AND c.nombre = datos.nombre
      AND c.tipo = datos.tipo
      AND c.estado = TRUE
);

SET @categoria_tecnologia_id = (
      SELECT id
      FROM categoria
      WHERE usuario_id = @demo_usuario_id
        AND nombre = 'Tecnología'
        AND tipo = 'EGRESO'
        AND estado = TRUE
      ORDER BY id
      LIMIT 1
);

INSERT INTO metodo_pago (usuario_id, tipo, nombre, moneda, estado, saldo)
SELECT @demo_usuario_id, datos.tipo, datos.nombre, datos.moneda, 'ACTIVO', datos.saldo
FROM (
    SELECT 'CUENTA_BANCARIA' AS tipo, 'Cuenta principal' AS nombre, 'PYG' AS moneda, 8500000 AS saldo
    UNION ALL SELECT 'BILLETERA', 'Billetera diaria', 'PYG', 420000
    UNION ALL SELECT 'EFECTIVO', 'Efectivo', 'PYG', 180000
    UNION ALL SELECT 'TARJETA_CREDITO', 'Visa Demo', 'PYG', 0
) AS datos
WHERE NOT EXISTS (
    SELECT 1
    FROM metodo_pago mp
    WHERE mp.usuario_id = @demo_usuario_id
      AND mp.nombre = datos.nombre
);

SET @cuenta_principal_id = (
    SELECT id FROM metodo_pago
    WHERE usuario_id = @demo_usuario_id AND nombre = 'Cuenta principal'
    ORDER BY id LIMIT 1
);
SET @billetera_id = (
    SELECT id FROM metodo_pago
    WHERE usuario_id = @demo_usuario_id AND nombre = 'Billetera diaria'
    ORDER BY id LIMIT 1
);
SET @efectivo_id = (
    SELECT id FROM metodo_pago
    WHERE usuario_id = @demo_usuario_id AND nombre = 'Efectivo'
    ORDER BY id LIMIT 1
);
SET @visa_metodo_id = (
    SELECT id FROM metodo_pago
    WHERE usuario_id = @demo_usuario_id AND nombre = 'Visa Demo'
    ORDER BY id LIMIT 1
);

-- Saldo inicial de las cuentas de la demo. No cuenta como ingreso.
-- Se fecha en el primer mes de la demo (hace cinco meses), antes del resto
-- de los movimientos. Los montos son los mismos con que se crean las cuentas.
INSERT INTO movimiento (
    usuario_id, categoria_id, metodo_pago_id, tipo, estado,
    descripcion, monto, moneda, fecha
)
SELECT
    @demo_usuario_id,
    NULL,
    mp.id,
    'SALDO_INICIAL',
    'CONFIRMADO',
    'Saldo inicial',
    datos.monto,
    mp.moneda,
    DATE_SUB(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL 5 MONTH)
FROM (
    SELECT 'Cuenta principal' AS nombre, 8500000 AS monto
    UNION ALL SELECT 'Billetera diaria', 420000
    UNION ALL SELECT 'Efectivo', 180000
) AS datos
INNER JOIN metodo_pago mp
    ON mp.usuario_id = @demo_usuario_id
   AND mp.nombre = datos.nombre
WHERE NOT EXISTS (
    SELECT 1
    FROM movimiento existente
    WHERE existente.usuario_id = @demo_usuario_id
      AND existente.metodo_pago_id = mp.id
      AND existente.tipo = 'SALDO_INICIAL'
);


INSERT INTO cuenta_bancaria (metodo_pago_id, tipo_cuenta, banco, numero_referencia)
SELECT @cuenta_principal_id, 'AHORRO', 'Banco Demo', '**** 4821'
WHERE NOT EXISTS (
    SELECT 1 FROM cuenta_bancaria WHERE metodo_pago_id = @cuenta_principal_id
);

INSERT INTO tarjeta_credito (
    metodo_pago_id, estado, limite_credito, fecha_cierre,
    fecha_vencimiento, porcentaje_pago_minimo
)
SELECT @visa_metodo_id, 'ACTIVA', 12000000, 25, 10, 10
WHERE NOT EXISTS (
    SELECT 1 FROM tarjeta_credito WHERE metodo_pago_id = @visa_metodo_id
);

SET @visa_id = (
    SELECT id FROM tarjeta_credito
    WHERE metodo_pago_id = @visa_metodo_id
);

-- Movimientos de los últimos seis meses. Las fechas se calculan desde el mes
-- actual para que el dashboard tenga datos recientes cuando se ejecute la demo.
INSERT INTO movimiento (
    usuario_id, categoria_id, metodo_pago_id, tipo, estado,
    descripcion, monto, moneda, fecha
)
SELECT
    @demo_usuario_id,
    c.id,
    mp.id,
    datos.tipo,
    'CONFIRMADO',
    datos.descripcion,
    datos.monto,
    'PYG',
    DATE_ADD(
        DATE_SUB(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL datos.meses_antes MONTH),
        INTERVAL (datos.dia - 1) DAY
    )
FROM (
    SELECT 0 AS meses_antes, 5 AS dia, 'INGRESO' AS tipo, 'Salario' AS categoria, 'Salario mensual' AS descripcion, 7200000 AS monto, 'Cuenta principal' AS metodo
    UNION ALL SELECT 1, 5, 'INGRESO', 'Salario', 'Salario mensual', 7200000, 'Cuenta principal'
    UNION ALL SELECT 2, 5, 'INGRESO', 'Salario', 'Salario mensual', 7000000, 'Cuenta principal'
    UNION ALL SELECT 3, 5, 'INGRESO', 'Salario', 'Salario mensual', 7000000, 'Cuenta principal'
    UNION ALL SELECT 4, 5, 'INGRESO', 'Salario', 'Salario mensual', 6800000, 'Cuenta principal'
    UNION ALL SELECT 5, 5, 'INGRESO', 'Salario', 'Salario mensual', 6800000, 'Cuenta principal'
    UNION ALL SELECT 0, 8, 'INGRESO', 'Trabajo freelance', 'Proyecto freelance', 1250000, 'Billetera diaria'
    UNION ALL SELECT 2, 8, 'INGRESO', 'Trabajo freelance', 'Proyecto freelance', 980000, 'Billetera diaria'
    UNION ALL SELECT 4, 8, 'INGRESO', 'Trabajo freelance', 'Proyecto freelance', 1100000, 'Billetera diaria'
    UNION ALL SELECT 0, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 1120000, 'Cuenta principal'
    UNION ALL SELECT 1, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 980000, 'Cuenta principal'
    UNION ALL SELECT 2, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 1050000, 'Cuenta principal'
    UNION ALL SELECT 3, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 930000, 'Cuenta principal'
    UNION ALL SELECT 4, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 1010000, 'Cuenta principal'
    UNION ALL SELECT 5, 10, 'EGRESO', 'Supermercado', 'Compra del supermercado', 950000, 'Cuenta principal'
    UNION ALL SELECT 0, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 285000, 'Billetera diaria'
    UNION ALL SELECT 1, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 240000, 'Billetera diaria'
    UNION ALL SELECT 2, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 320000, 'Billetera diaria'
    UNION ALL SELECT 3, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 265000, 'Billetera diaria'
    UNION ALL SELECT 4, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 310000, 'Billetera diaria'
    UNION ALL SELECT 5, 13, 'EGRESO', 'Restaurantes', 'Almuerzo y café', 225000, 'Billetera diaria'
    UNION ALL SELECT 0, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 310000, 'Efectivo'
    UNION ALL SELECT 1, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 275000, 'Efectivo'
    UNION ALL SELECT 2, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 290000, 'Efectivo'
    UNION ALL SELECT 3, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 260000, 'Efectivo'
    UNION ALL SELECT 4, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 330000, 'Efectivo'
    UNION ALL SELECT 5, 16, 'EGRESO', 'Transporte', 'Combustible y transporte', 280000, 'Efectivo'
    UNION ALL SELECT 0, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 220000, 'Cuenta principal'
    UNION ALL SELECT 1, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 220000, 'Cuenta principal'
    UNION ALL SELECT 2, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 215000, 'Cuenta principal'
    UNION ALL SELECT 3, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 215000, 'Cuenta principal'
    UNION ALL SELECT 4, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 210000, 'Cuenta principal'
    UNION ALL SELECT 5, 19, 'EGRESO', 'Servicios', 'Internet y servicios', 210000, 'Cuenta principal'
    UNION ALL SELECT 0, 22, 'EGRESO', 'Salud', 'Farmacia', 145000, 'Efectivo'
    UNION ALL SELECT 2, 22, 'EGRESO', 'Salud', 'Farmacia', 98000, 'Efectivo'
    UNION ALL SELECT 4, 22, 'EGRESO', 'Salud', 'Consulta médica', 250000, 'Cuenta principal'
    UNION ALL SELECT 1, 24, 'EGRESO', 'Ocio', 'Cine y entretenimiento', 180000, 'Billetera diaria'
    UNION ALL SELECT 3, 24, 'EGRESO', 'Ocio', 'Salida de fin de semana', 230000, 'Billetera diaria'
    UNION ALL SELECT 5, 24, 'EGRESO', 'Ocio', 'Cine y entretenimiento', 165000, 'Billetera diaria'
) AS datos
INNER JOIN categoria c
    ON c.usuario_id = @demo_usuario_id
   AND c.nombre = datos.categoria
   AND c.tipo = datos.tipo
   AND c.estado = TRUE
INNER JOIN metodo_pago mp
    ON mp.usuario_id = @demo_usuario_id
   AND mp.nombre = datos.metodo
WHERE NOT EXISTS (
    SELECT 1
    FROM movimiento existente
    WHERE existente.usuario_id = @demo_usuario_id
      AND existente.descripcion = datos.descripcion
      AND DATE(existente.fecha) = DATE_ADD(
          DATE_SUB(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL datos.meses_antes MONTH),
          INTERVAL (datos.dia - 1) DAY
      )
);

-- Compra en cuotas para que también haya datos en la sección de tarjetas.
UPDATE movimiento
SET categoria_id = @categoria_tecnologia_id
WHERE usuario_id = @demo_usuario_id
  AND descripcion = 'Notebook en cuotas'
  AND categoria_id IS NULL;

INSERT INTO movimiento (
    usuario_id, categoria_id, metodo_pago_id, tipo, estado, descripcion,
    monto, moneda, fecha
)
SELECT
    @demo_usuario_id, @categoria_tecnologia_id, @visa_metodo_id, 'EGRESO', 'CONFIRMADO',
    'Notebook en cuotas', 900000, 'PYG',
    DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL 8 DAY)
WHERE NOT EXISTS (
    SELECT 1
    FROM movimiento
    WHERE usuario_id = @demo_usuario_id
      AND descripcion = 'Notebook en cuotas'
      AND DATE(fecha) = DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL 8 DAY)
);

SET @compra_movimiento_id = (
    SELECT id
    FROM movimiento
    WHERE usuario_id = @demo_usuario_id
      AND descripcion = 'Notebook en cuotas'
      AND DATE(fecha) = DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL 8 DAY)
    ORDER BY id
    LIMIT 1
);

INSERT INTO compra_tarjeta (
    movimiento_id, tarjeta_id, monto_base, cantidad_cuotas, fecha_compra
)
SELECT
    @compra_movimiento_id, @visa_id, 900000, 6,
    DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL 8 DAY)
WHERE NOT EXISTS (
    SELECT 1 FROM compra_tarjeta WHERE movimiento_id = @compra_movimiento_id
);

SET @compra_id = (
    SELECT id FROM compra_tarjeta WHERE movimiento_id = @compra_movimiento_id
);

INSERT INTO cuota (
    compra_tarjeta_id, numero, monto_base, periodo,
    fecha_vencimiento, estado, monto_pendiente
)
SELECT
    @compra_id,
    numeros.numero,
    150000,
    DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL (numeros.numero - 1) MONTH),
    DATE_ADD(
        DATE_ADD(CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE), INTERVAL numeros.numero MONTH),
        INTERVAL 9 DAY
    ),
    'PENDIENTE',
    150000
FROM (
    SELECT 1 AS numero
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
) AS numeros
WHERE NOT EXISTS (
    SELECT 1 FROM cuota c
    WHERE c.compra_tarjeta_id = @compra_id
      AND c.numero = numeros.numero
);

INSERT INTO recurrente (
    usuario_id, categoria_id, metodo_pago_id, nombre, tipo,
    monto_base, moneda, frecuencia, proxima_fecha, estado
)
SELECT
    @demo_usuario_id, c.id, mp.id, datos.nombre, datos.tipo,
    datos.monto, 'PYG', 'MENSUAL', DATE_ADD(CURDATE(), INTERVAL datos.dias DAY), 'ACTIVO'
FROM (
    SELECT 'Salario mensual' AS nombre, 'INGRESO' AS tipo, 'Salario' AS categoria, 'Cuenta principal' AS metodo, 7200000 AS monto, 20 AS dias
    UNION ALL SELECT 'Internet hogar', 'EGRESO', 'Servicios', 'Cuenta principal', 220000, 12
    UNION ALL SELECT 'Presupuesto supermercado', 'EGRESO', 'Supermercado', 'Cuenta principal', 1000000, 8
) AS datos
INNER JOIN categoria c
    ON c.usuario_id = @demo_usuario_id
   AND c.nombre = datos.categoria
   AND c.tipo = datos.tipo
   AND c.estado = TRUE
INNER JOIN metodo_pago mp
    ON mp.usuario_id = @demo_usuario_id
   AND mp.nombre = datos.metodo
WHERE NOT EXISTS (
    SELECT 1
    FROM recurrente r
    WHERE r.usuario_id = @demo_usuario_id
      AND r.nombre = datos.nombre
);

COMMIT;