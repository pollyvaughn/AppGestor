USE finanzas;

-- =========================================================
-- AppGestor: seed de demostración amplia (abril-octubre 2026)
-- Ejecutar DESPUÉS de database/schema.sql.
-- Conserva el usuario demo existente si ya existe. No crea movimientos
-- fechados el 20/10/2026 ni después.
-- Esta seed reemplaza los datos asociados al usuario demo; el usuario
-- y su contraseña no se modifican.
-- =========================================================

START TRANSACTION;

-- Crear el usuario únicamente si todavía no existe.
INSERT INTO usuario (nombre, email, password, estado)
SELECT 'Usuario Demo', 'demo@appgestor.local',
       '$argon2id$v=19$m=65536,t=3,p=4$t91ZVQ8QBPlii8uRKecSFQ$0LBmxhDCkfeWNtvz3yk0A96bJFCfPa0kU6kpJybB054',
       'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'demo@appgestor.local');

SET @uid := (SELECT id FROM usuario WHERE email = 'demo@appgestor.local' ORDER BY id LIMIT 1);

-- Limpiar exclusivamente los datos de demo vinculados a este usuario.
-- El orden respeta las claves foráneas.
DELETE a FROM anulacion a
LEFT JOIN movimiento m ON m.id = a.movimiento_id
LEFT JOIN pago p ON p.id = a.pago_id
LEFT JOIN movimiento pago_mov ON pago_mov.id = p.movimiento_id
LEFT JOIN ajuste aj ON aj.id = a.ajuste_id
LEFT JOIN movimiento maj ON maj.id = aj.movimiento_id
LEFT JOIN cuota caj ON caj.id = aj.cuota_id
LEFT JOIN compra_tarjeta cta ON cta.id = caj.compra_tarjeta_id
LEFT JOIN movimiento mcta ON mcta.id = cta.movimiento_id
WHERE m.usuario_id = @uid OR pago_mov.usuario_id = @uid OR maj.usuario_id = @uid OR mcta.usuario_id = @uid;
DELETE mr FROM movimiento_recurrente mr JOIN movimiento m ON m.id = mr.movimiento_id WHERE m.usuario_id = @uid;
DELETE p FROM pago p JOIN movimiento m ON m.id = p.movimiento_id WHERE m.usuario_id = @uid;
DELETE aj FROM ajuste aj JOIN movimiento m ON m.id = aj.movimiento_id WHERE m.usuario_id = @uid;
DELETE aj FROM ajuste aj JOIN cuota q ON q.id = aj.cuota_id JOIN compra_tarjeta ct ON ct.id = q.compra_tarjeta_id JOIN movimiento m ON m.id = ct.movimiento_id WHERE m.usuario_id = @uid;
DELETE q FROM cuota q JOIN compra_tarjeta ct ON ct.id = q.compra_tarjeta_id JOIN movimiento m ON m.id = ct.movimiento_id WHERE m.usuario_id = @uid;
DELETE ct FROM compra_tarjeta ct JOIN movimiento m ON m.id = ct.movimiento_id WHERE m.usuario_id = @uid;
DELETE ad FROM adjunto ad JOIN movimiento m ON m.id = ad.movimiento_id WHERE m.usuario_id = @uid;
DELETE mm FROM movimiento_metodo mm JOIN movimiento m ON m.id = mm.movimiento_id WHERE m.usuario_id = @uid;
DELETE FROM movimiento WHERE usuario_id = @uid;
DELETE FROM recurrente WHERE usuario_id = @uid;
DELETE FROM presupuesto WHERE usuario_id = @uid;
DELETE cb FROM cuenta_bancaria cb JOIN metodo_pago mp ON mp.id = cb.metodo_pago_id WHERE mp.usuario_id = @uid;
DELETE tc FROM tarjeta_credito tc JOIN metodo_pago mp ON mp.id = tc.metodo_pago_id WHERE mp.usuario_id = @uid;
DELETE FROM metodo_pago WHERE usuario_id = @uid;
DELETE FROM categoria WHERE usuario_id = @uid;

-- Categorías variadas para ingresos y egresos.
INSERT INTO categoria (usuario_id, nombre, tipo, color, estado) VALUES
(@uid,'Salario','INGRESO','#4F8A68',TRUE),
(@uid,'Freelance','INGRESO','#4B91A8',TRUE),
(@uid,'Ventas ocasionales','INGRESO','#7D8D45',TRUE),
(@uid,'Reembolsos','INGRESO','#8A78B5',TRUE),
(@uid,'Supermercado','EGRESO','#D18A43',TRUE),
(@uid,'Restaurantes y café','EGRESO','#C96C5D',TRUE),
(@uid,'Transporte','EGRESO','#6F83B5',TRUE),
(@uid,'Servicios del hogar','EGRESO','#8870AA',TRUE),
(@uid,'Salud y farmacia','EGRESO','#4F9992',TRUE),
(@uid,'Ocio y salidas','EGRESO','#C4779D',TRUE),
(@uid,'Tecnología','EGRESO','#778899',TRUE),
(@uid,'Educación','EGRESO','#B28B43',TRUE),
(@uid,'Hogar','EGRESO','#9A765B',TRUE),
(@uid,'Ropa','EGRESO','#A96D91',TRUE),
(@uid,'Suscripciones','EGRESO','#5E83A0',TRUE),
(@uid,'Mascotas','EGRESO','#8A9B58',TRUE),
(@uid,'Viajes','EGRESO','#3F9B9B',TRUE),
(@uid,'Impuestos y trámites','EGRESO','#8C8C8C',TRUE);

-- Métodos de pago: saldos finales de ejemplo en PYG.
INSERT INTO metodo_pago (usuario_id,tipo,nombre,moneda,estado,saldo) VALUES
(@uid,'CUENTA_BANCARIA','Cuenta principal','PYG','ACTIVO',0),
(@uid,'CUENTA_BANCARIA','Caja de ahorro USD','USD','ACTIVO',0),
(@uid,'BILLETERA','Billetera diaria','PYG','ACTIVO',0),
(@uid,'EFECTIVO','Efectivo','PYG','ACTIVO',0),
(@uid,'TARJETA_CREDITO','Visa Clásica','PYG','ACTIVO',0),
(@uid,'TARJETA_CREDITO','Mastercard Compras','PYG','ACTIVO',0),
(@uid,'BILLETERA','Billetera de viajes','USD','ACTIVO',0);

SET @bank := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Cuenta principal' LIMIT 1);
SET @usd_bank := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Caja de ahorro USD' LIMIT 1);
SET @wallet := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Billetera diaria' LIMIT 1);
SET @cash := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Efectivo' LIMIT 1);
SET @visa_mp := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Visa Clásica' LIMIT 1);
SET @mc_mp := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Mastercard Compras' LIMIT 1);
SET @travel_wallet := (SELECT id FROM metodo_pago WHERE usuario_id=@uid AND nombre='Billetera de viajes' LIMIT 1);

INSERT INTO cuenta_bancaria (metodo_pago_id,tipo_cuenta,banco,numero_referencia) VALUES
(@bank,'CORRIENTE','Banco Continental','**** 4821'),
(@usd_bank,'AHORRO','Banco Regional','USD **** 1907');
INSERT INTO tarjeta_credito (metodo_pago_id,estado,limite_credito,fecha_cierre,fecha_vencimiento,porcentaje_pago_minimo) VALUES
(@visa_mp,'ACTIVA',15000000,25,10,10),
(@mc_mp,'ACTIVA',8000000,15,5,8);
SET @visa := (SELECT id FROM tarjeta_credito WHERE metodo_pago_id=@visa_mp LIMIT 1);
SET @mc := (SELECT id FROM tarjeta_credito WHERE metodo_pago_id=@mc_mp LIMIT 1);

-- Saldos iniciales de las cuentas de dinero (no son ingresos del reporte).
INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha) VALUES
(@uid,NULL,@bank,'SALDO_INICIAL','CONFIRMADO','Saldo inicial - cuenta principal',6500000,'PYG','2026-04-01 08:00:00'),
(@uid,NULL,@usd_bank,'SALDO_INICIAL','CONFIRMADO','Saldo inicial - ahorro en dólares',850,'USD','2026-04-01 08:00:00'),
(@uid,NULL,@wallet,'SALDO_INICIAL','CONFIRMADO','Saldo inicial - billetera diaria',850000,'PYG','2026-04-01 08:00:00'),
(@uid,NULL,@cash,'SALDO_INICIAL','CONFIRMADO','Saldo inicial - efectivo',2500000,'PYG','2026-04-01 08:00:00'),
(@uid,NULL,@travel_wallet,'SALDO_INICIAL','CONFIRMADO','Saldo inicial - billetera de viajes',250,'USD','2026-04-01 08:00:00');

-- Movimientos de abril a octubre de 2026. Fechas siempre anteriores al 20/10.

INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,tipo_cambio,fecha) VALUES
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',6800000.00,'PYG',NULL,'2026-04-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',6800000.00,'PYG',NULL,'2026-05-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',7000000.00,'PYG',NULL,'2026-06-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',7000000.00,'PYG',NULL,'2026-07-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',7200000.00,'PYG',NULL,'2026-08-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',7200000.00,'PYG',NULL,'2026-09-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Salario mensual',7400000.00,'PYG',NULL,'2026-10-05 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Diseño de identidad visual',950000.00,'PYG',NULL,'2026-04-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Mantenimiento de sitio web',1450000.00,'PYG',NULL,'2026-05-18 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Edición de material audiovisual',780000.00,'PYG',NULL,'2026-06-09 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Proyecto freelance - tienda online',1850000.00,'PYG',NULL,'2026-07-21 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Consultoría puntual',1250000.00,'PYG',NULL,'2026-08-13 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Desarrollo de landing page',2100000.00,'PYG',NULL,'2026-09-17 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Freelance' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Soporte técnico por proyecto',680000.00,'PYG',NULL,'2026-10-11 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ventas ocasionales' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Venta de monitor usado',650000.00,'PYG',NULL,'2026-04-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ventas ocasionales' AND tipo='INGRESO' LIMIT 1),@cash,'INGRESO','CONFIRMADO','Venta de silla de escritorio',420000.00,'PYG',NULL,'2026-07-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ventas ocasionales' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Venta de accesorios',275000.00,'PYG',NULL,'2026-09-03 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Reembolsos' AND tipo='INGRESO' LIMIT 1),@wallet,'INGRESO','CONFIRMADO','Reembolso de compra compartida',180000.00,'PYG',NULL,'2026-06-26 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Reembolsos' AND tipo='INGRESO' LIMIT 1),@bank,'INGRESO','CONFIRMADO','Devolución de compra',235000.00,'PYG',NULL,'2026-08-28 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',780000.00,'PYG',NULL,'2026-04-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',165000.00,'PYG',NULL,'2026-04-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',240000.00,'PYG',NULL,'2026-04-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',185000.00,'PYG',NULL,'2026-04-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',230000.00,'PYG',NULL,'2026-04-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',79000.00,'PYG',NULL,'2026-04-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',815000.00,'PYG',NULL,'2026-05-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',200000.00,'PYG',NULL,'2026-05-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',275000.00,'PYG',NULL,'2026-05-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',220000.00,'PYG',NULL,'2026-05-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',265000.00,'PYG',NULL,'2026-05-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',114000.00,'PYG',NULL,'2026-05-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',760000.00,'PYG',NULL,'2026-06-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',145000.00,'PYG',NULL,'2026-06-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',220000.00,'PYG',NULL,'2026-06-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',165000.00,'PYG',NULL,'2026-06-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',210000.00,'PYG',NULL,'2026-06-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',59000.00,'PYG',NULL,'2026-06-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',825000.00,'PYG',NULL,'2026-07-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',210000.00,'PYG',NULL,'2026-07-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',285000.00,'PYG',NULL,'2026-07-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',230000.00,'PYG',NULL,'2026-07-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',275000.00,'PYG',NULL,'2026-07-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',124000.00,'PYG',NULL,'2026-07-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',860000.00,'PYG',NULL,'2026-08-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',245000.00,'PYG',NULL,'2026-08-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',320000.00,'PYG',NULL,'2026-08-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',265000.00,'PYG',NULL,'2026-08-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',310000.00,'PYG',NULL,'2026-08-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',159000.00,'PYG',NULL,'2026-08-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',765000.00,'PYG',NULL,'2026-09-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',150000.00,'PYG',NULL,'2026-09-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',225000.00,'PYG',NULL,'2026-09-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',170000.00,'PYG',NULL,'2026-09-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Electricidad y agua',215000.00,'PYG',NULL,'2026-09-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Streaming y música',64000.00,'PYG',NULL,'2026-09-24 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Compra grande del supermercado',805000.00,'PYG',NULL,'2026-10-08 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Almuerzos y cafés',190000.00,'PYG',NULL,'2026-10-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Transporte' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Combustible y transporte',265000.00,'PYG',NULL,'2026-10-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Internet y telefonía',210000.00,'PYG',NULL,'2026-10-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salud y farmacia' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Medicamentos y artículos de farmacia',128000.00,'PYG',NULL,'2026-04-09 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ocio y salidas' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Cena con amigos',245000.00,'PYG',NULL,'2026-04-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Utensilios para cocina',310000.00,'PYG',NULL,'2026-04-27 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Educación' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Curso online de programación',420000.00,'PYG',NULL,'2026-05-03 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ropa' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Calzado y ropa',385000.00,'PYG',NULL,'2026-05-14 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Mascotas' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Alimento y consulta veterinaria',210000.00,'PYG',NULL,'2026-05-23 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Tecnología' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Teclado mecánico',560000.00,'PYG',NULL,'2026-05-29 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salud y farmacia' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Consulta médica',190000.00,'PYG',NULL,'2026-06-02 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ocio y salidas' AND tipo='EGRESO' LIMIT 1),@mc_mp,'EGRESO','CONFIRMADO','Entradas para concierto',330000.00,'PYG',NULL,'2026-06-15 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Impuestos y trámites' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Renovación de documentos',95000.00,'PYG',NULL,'2026-06-20 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Compra de despensa adicional',295000.00,'PYG',NULL,'2026-06-29 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Tecnología' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Disco externo para copias',490000.00,'PYG',NULL,'2026-07-07 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Educación' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Material de estudio',175000.00,'PYG',NULL,'2026-07-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Viajes' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Reserva de alojamiento',850000.00,'PYG',NULL,'2026-07-25 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Hogar' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Reparación de grifo',265000.00,'PYG',NULL,'2026-08-04 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ocio y salidas' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Salida de fin de semana',285000.00,'PYG',NULL,'2026-08-16 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ropa' AND tipo='EGRESO' LIMIT 1),@mc_mp,'EGRESO','CONFIRMADO','Ropa para temporada',440000.00,'PYG',NULL,'2026-08-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salud y farmacia' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Lentes y control visual',620000.00,'PYG',NULL,'2026-08-30 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Mascotas' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Vacunas y alimento',245000.00,'PYG',NULL,'2026-09-06 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Tecnología' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Auriculares inalámbricos',720000.00,'PYG',NULL,'2026-09-12 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Viajes' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Transporte interurbano',315000.00,'PYG',NULL,'2026-09-22 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Educación' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Taller de especialización',380000.00,'PYG',NULL,'2026-09-28 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Hogar' AND tipo='EGRESO' LIMIT 1),@bank,'EGRESO','CONFIRMADO','Organizadores y lámparas',270000.00,'PYG',NULL,'2026-10-02 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salud y farmacia' AND tipo='EGRESO' LIMIT 1),@cash,'EGRESO','CONFIRMADO','Farmacia',86000.00,'PYG',NULL,'2026-10-07 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ocio y salidas' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Cine y cena',195000.00,'PYG',NULL,'2026-10-14 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' AND tipo='EGRESO' LIMIT 1),@wallet,'EGRESO','CONFIRMADO','Compra rápida de fin de semana',164000.00,'PYG',NULL,'2026-10-18 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' AND tipo='EGRESO' LIMIT 1),@travel_wallet,'EGRESO','CONFIRMADO','Licencia anual de software',48.00,'USD',7350.000000,'2026-05-11 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Viajes' AND tipo='EGRESO' LIMIT 1),@travel_wallet,'EGRESO','CONFIRMADO','Transporte durante viaje',72.50,'USD',7350.000000,'2026-07-19 12:00:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Educación' AND tipo='EGRESO' LIMIT 1),@usd_bank,'EGRESO','CONFIRMADO','Curso internacional',95.00,'USD',7350.000000,'2026-09-14 12:00:00');

-- Compras con tarjeta: tres operaciones con planes de cuotas y una compra al contado.
INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha) VALUES
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Tecnología' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Notebook para estudio - 6 cuotas',4200000,'PYG','2026-05-29 15:20:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Hogar' AND tipo='EGRESO' LIMIT 1),@mc_mp,'EGRESO','CONFIRMADO','Lavadora - 8 cuotas',3600000,'PYG','2026-07-25 11:45:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Tecnología' AND tipo='EGRESO' LIMIT 1),@visa_mp,'EGRESO','CONFIRMADO','Teléfono móvil - 10 cuotas',5200000,'PYG','2026-09-12 17:10:00'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ropa' AND tipo='EGRESO' LIMIT 1),@mc_mp,'EGRESO','CONFIRMADO','Compra de ropa al contado con tarjeta',390000,'PYG','2026-10-09 16:00:00');

SET @mov_notebook := (SELECT id FROM movimiento WHERE usuario_id=@uid AND descripcion='Notebook para estudio - 6 cuotas' LIMIT 1);
SET @mov_lavadora := (SELECT id FROM movimiento WHERE usuario_id=@uid AND descripcion='Lavadora - 8 cuotas' LIMIT 1);
SET @mov_telefono := (SELECT id FROM movimiento WHERE usuario_id=@uid AND descripcion='Teléfono móvil - 10 cuotas' LIMIT 1);

INSERT INTO compra_tarjeta (movimiento_id,tarjeta_id,monto_base,cantidad_cuotas,fecha_compra) VALUES
(@mov_notebook,@visa,4200000,6,'2026-05-29 15:20:00'),
(@mov_lavadora,@mc,3600000,8,'2026-07-25 11:45:00'),
(@mov_telefono,@visa,5200000,10,'2026-09-12 17:10:00');
SET @compra_notebook := (SELECT id FROM compra_tarjeta WHERE movimiento_id=@mov_notebook LIMIT 1);
SET @compra_lavadora := (SELECT id FROM compra_tarjeta WHERE movimiento_id=@mov_lavadora LIMIT 1);
SET @compra_telefono := (SELECT id FROM compra_tarjeta WHERE movimiento_id=@mov_telefono LIMIT 1);

-- Cuotas históricas ya pagadas y cuotas futuras pendientes. La suma de las cuotas
-- coincide con el monto de cada compra; las fechas son fechas de periodo/vencimiento.
INSERT INTO cuota (compra_tarjeta_id,numero,monto_base,periodo,fecha_vencimiento,estado,monto_pendiente) VALUES
(@compra_notebook,1,700000,'2026-06-01','2026-06-10','PAGADA',0),
(@compra_notebook,2,700000,'2026-07-01','2026-07-10','PAGADA',0),
(@compra_notebook,3,700000,'2026-08-01','2026-08-10','PAGADA',0),
(@compra_notebook,4,700000,'2026-09-01','2026-09-10','PAGADA',0),
(@compra_notebook,5,700000,'2026-10-01','2026-10-10','PENDIENTE',700000),
(@compra_notebook,6,700000,'2026-11-01','2026-11-10','PENDIENTE',700000),
(@compra_lavadora,1,450000,'2026-08-01','2026-08-05','PAGADA',0),
(@compra_lavadora,2,450000,'2026-09-01','2026-09-05','PAGADA',0),
(@compra_lavadora,3,450000,'2026-10-01','2026-10-05','PARCIAL',150000),
(@compra_lavadora,4,450000,'2026-11-01','2026-11-05','PENDIENTE',450000),
(@compra_lavadora,5,450000,'2026-12-01','2026-12-05','PENDIENTE',450000),
(@compra_lavadora,6,450000,'2027-01-01','2027-01-05','PENDIENTE',450000),
(@compra_lavadora,7,450000,'2027-02-01','2027-02-05','PENDIENTE',450000),
(@compra_lavadora,8,450000,'2027-03-01','2027-03-05','PENDIENTE',450000),
(@compra_telefono,1,520000,'2026-10-01','2026-10-10','PENDIENTE',520000),
(@compra_telefono,2,520000,'2026-11-01','2026-11-10','PENDIENTE',520000),
(@compra_telefono,3,520000,'2026-12-01','2026-12-10','PENDIENTE',520000),
(@compra_telefono,4,520000,'2027-01-01','2027-01-10','PENDIENTE',520000),
(@compra_telefono,5,520000,'2027-02-01','2027-02-10','PENDIENTE',520000),
(@compra_telefono,6,520000,'2027-03-01','2027-03-10','PENDIENTE',520000),
(@compra_telefono,7,520000,'2027-04-01','2027-04-10','PENDIENTE',520000),
(@compra_telefono,8,520000,'2027-05-01','2027-05-10','PENDIENTE',520000),
(@compra_telefono,9,520000,'2027-06-01','2027-06-10','PENDIENTE',520000),
(@compra_telefono,10,520000,'2027-07-01','2027-07-10','PENDIENTE',520000);

-- Pagos vinculados a cuotas ya saldadas; cada pago tiene su movimiento propio.
INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha) VALUES
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota notebook - junio',700000,'PYG','2026-06-10 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota notebook - julio',700000,'PYG','2026-07-10 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota notebook - agosto',700000,'PYG','2026-08-10 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota notebook - septiembre',700000,'PYG','2026-09-10 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota lavadora - agosto',450000,'PYG','2026-08-05 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago cuota lavadora - septiembre',450000,'PYG','2026-09-05 10:00:00'),
(@uid,NULL,@bank,'PAGO_TARJETA','CONFIRMADO','Pago parcial cuota lavadora - octubre',300000,'PYG','2026-10-05 10:00:00');

INSERT INTO pago (cuota_id,movimiento_id,monto,moneda,fecha,estado)
SELECT q.id,m.id,
       CASE WHEN m.descripcion='Pago parcial cuota lavadora - octubre' THEN 300000 ELSE q.monto_base END,
       'PYG',m.fecha,'CONFIRMADO'
FROM movimiento m
JOIN cuota q ON (
    (m.descripcion='Pago cuota notebook - junio' AND q.compra_tarjeta_id=@compra_notebook AND q.numero=1) OR
    (m.descripcion='Pago cuota notebook - julio' AND q.compra_tarjeta_id=@compra_notebook AND q.numero=2) OR
    (m.descripcion='Pago cuota notebook - agosto' AND q.compra_tarjeta_id=@compra_notebook AND q.numero=3) OR
    (m.descripcion='Pago cuota notebook - septiembre' AND q.compra_tarjeta_id=@compra_notebook AND q.numero=4) OR
    (m.descripcion='Pago cuota lavadora - agosto' AND q.compra_tarjeta_id=@compra_lavadora AND q.numero=1) OR
    (m.descripcion='Pago cuota lavadora - septiembre' AND q.compra_tarjeta_id=@compra_lavadora AND q.numero=2) OR
    (m.descripcion='Pago parcial cuota lavadora - octubre' AND q.compra_tarjeta_id=@compra_lavadora AND q.numero=3)
)
WHERE m.usuario_id=@uid AND m.tipo='PAGO_TARJETA';

-- Ajustes en movimientos: descuentos, comisiones y recargos de distintos métodos.
INSERT INTO ajuste (movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT m.id,'DESCUENTO',25000,'PYG','Descuento promocional por pago contado','ACTIVO','2026-04-27 12:00:00'
FROM movimiento m WHERE m.usuario_id=@uid AND m.descripcion='Utensilios para cocina';
INSERT INTO ajuste (movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT m.id,'COMISION',12000,'PYG','Comisión de servicio de pago','ACTIVO','2026-06-20 12:00:00'
FROM movimiento m WHERE m.usuario_id=@uid AND m.descripcion='Renovación de documentos';
INSERT INTO ajuste (movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT m.id,'RECARGO',18000,'PYG','Recargo por atraso del servicio','ACTIVO','2026-08-22 12:00:00'
FROM movimiento m WHERE m.usuario_id=@uid AND m.descripcion='Ropa para temporada';
INSERT INTO ajuste (movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT m.id,'INTERES',35000,'PYG','Interés por financiación de compra','ACTIVO','2026-09-12 17:10:00'
FROM movimiento m WHERE m.usuario_id=@uid AND m.descripcion='Teléfono móvil - 10 cuotas';
INSERT INTO ajuste (movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT m.id,'ADICIONAL',22000,'PYG','Embalaje y preparación','ACTIVO','2026-10-02 12:00:00'
FROM movimiento m WHERE m.usuario_id=@uid AND m.descripcion='Organizadores y lámparas';

-- Un ajuste asociado a una cuota (distinto de los ajustes de movimiento).
INSERT INTO ajuste (cuota_id,movimiento_id,tipo,monto,moneda,descripcion,estado,fecha)
SELECT q.id,NULL,'RECARGO',15000,'PYG','Recargo de mora por pago posterior al vencimiento','ACTIVO','2026-10-06 09:00:00'
FROM cuota q WHERE q.compra_tarjeta_id=@compra_lavadora AND q.numero=3;

-- Recurrentes activos e inactivos para poblar la sección correspondiente.
INSERT INTO recurrente (usuario_id,categoria_id,metodo_pago_id,nombre,tipo,monto_base,moneda,frecuencia,proxima_fecha,estado) VALUES
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salario' LIMIT 1),@bank,'Salario mensual','INGRESO',7400000,'PYG','MENSUAL','2026-11-05','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Servicios del hogar' LIMIT 1),@bank,'Internet y telefonía','EGRESO',185000,'PYG','MENSUAL','2026-11-19','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Suscripciones' LIMIT 1),@wallet,'Streaming y música','EGRESO',79000,'PYG','MENSUAL','2026-10-24','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Supermercado' LIMIT 1),@bank,'Presupuesto de supermercado','EGRESO',850000,'PYG','MENSUAL','2026-11-08','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Educación' LIMIT 1),@visa_mp,'Plataforma de cursos','EGRESO',25,'USD','MENSUAL','2026-11-11','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Salud y farmacia' LIMIT 1),@cash,'Vitaminas y farmacia','EGRESO',95000,'PYG','BIMESTRAL','2026-11-22','ACTIVO'),
(@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Ocio y salidas' LIMIT 1),@wallet,'Club de lectura','EGRESO',65000,'PYG','MENSUAL','2026-11-03','INACTIVO');

-- Dos recurrentes ya ejecutados para que la demo permita ver el flujo de pago.
-- Se generan movimientos históricos (nunca del 20/10/2026 ni posteriores) y se
-- vinculan con movimiento_recurrente para que aparezcan como pagos de recurrentes.
INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha)
SELECT r.usuario_id,r.categoria_id,r.metodo_pago_id,r.tipo,'CONFIRMADO',
       'Pago recurrente: Salario mensual - octubre 2026',r.monto_base,r.moneda,'2026-10-05 09:00:00'
FROM recurrente r
WHERE r.usuario_id=@uid AND r.nombre='Salario mensual' AND r.estado='ACTIVO';

INSERT INTO movimiento_recurrente (recurrente_id,movimiento_id,periodo,monto)
SELECT r.id,m.id,'2026-10-01',m.monto
FROM recurrente r
JOIN movimiento m ON m.usuario_id=r.usuario_id
  AND m.descripcion='Pago recurrente: Salario mensual - octubre 2026'
  AND m.fecha='2026-10-05 09:00:00'
WHERE r.usuario_id=@uid AND r.nombre='Salario mensual';

INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha)
SELECT r.usuario_id,r.categoria_id,r.metodo_pago_id,r.tipo,'CONFIRMADO',
       'Pago recurrente: Internet y telefonía - octubre 2026',r.monto_base,r.moneda,'2026-10-19 10:30:00'
FROM recurrente r
WHERE r.usuario_id=@uid AND r.nombre='Internet y telefonía' AND r.estado='ACTIVO';

INSERT INTO movimiento_recurrente (recurrente_id,movimiento_id,periodo,monto)
SELECT r.id,m.id,'2026-10-01',m.monto
FROM recurrente r
JOIN movimiento m ON m.usuario_id=r.usuario_id
  AND m.descripcion='Pago recurrente: Internet y telefonía - octubre 2026'
  AND m.fecha='2026-10-19 10:30:00'
WHERE r.usuario_id=@uid AND r.nombre='Internet y telefonía';

-- Presupuestos para varias monedas.
INSERT INTO presupuesto (usuario_id,moneda,tope_mensual) VALUES
(@uid,'PYG',5200000),(@uid,'USD',350);

-- Adjuntos ficticios, vinculados a operaciones existentes.
INSERT INTO adjunto (movimiento_id,tipo,nombre_archivo,ruta)
SELECT id,'PDF','factura_supermercado_2026-10.pdf','/demo/adjuntos/factura_supermercado_2026-10.pdf'
FROM movimiento WHERE usuario_id=@uid AND descripcion='Compra rápida de fin de semana' LIMIT 1;
INSERT INTO adjunto (movimiento_id,tipo,nombre_archivo,ruta)
SELECT id,'IMAGEN','notebook_garantia.jpg','/demo/adjuntos/notebook_garantia.jpg'
FROM movimiento WHERE usuario_id=@uid AND descripcion='Notebook para estudio - 6 cuotas' LIMIT 1;

-- Una operación anulada con motivo registrado, para probar historial/estados.
INSERT INTO movimiento (usuario_id,categoria_id,metodo_pago_id,tipo,estado,descripcion,monto,moneda,fecha)
VALUES (@uid,(SELECT id FROM categoria WHERE usuario_id=@uid AND nombre='Restaurantes y café' LIMIT 1),@wallet,'EGRESO','ANULADO','Pedido de comida cancelado',87000,'PYG','2026-08-07 20:15:00');
SET @mov_anulado := LAST_INSERT_ID();
INSERT INTO anulacion (movimiento_id,pago_id,ajuste_id,motivo,fecha)
VALUES (@mov_anulado,NULL,NULL,'Pedido cancelado antes de la preparación','2026-08-07 20:20:00');

-- Ajustar saldos de métodos monetarios según ingresos/egresos confirmados.
-- Los gastos con tarjeta y pagos de tarjeta no se mezclan con el saldo de caja;
-- los saldos de tarjeta quedan en cero como saldo de cuenta de pago.
UPDATE metodo_pago mp
SET mp.saldo = CASE
  WHEN mp.id=@bank THEN
    6500000
    + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@bank AND m.tipo='INGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@bank AND m.tipo='EGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@bank AND m.tipo='PAGO_TARJETA' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
  WHEN mp.id=@wallet THEN
    850000
    + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@wallet AND m.tipo='INGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@wallet AND m.tipo='EGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
  WHEN mp.id=@cash THEN
    2500000
    + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@cash AND m.tipo='INGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@cash AND m.tipo='EGRESO' AND m.estado='CONFIRMADO' AND m.moneda='PYG'),0)
  WHEN mp.id=@usd_bank THEN
    850
    + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@usd_bank AND m.tipo='INGRESO' AND m.estado='CONFIRMADO' AND m.moneda='USD'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@usd_bank AND m.tipo='EGRESO' AND m.estado='CONFIRMADO' AND m.moneda='USD'),0)
  WHEN mp.id=@travel_wallet THEN
    250
    + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@travel_wallet AND m.tipo='INGRESO' AND m.estado='CONFIRMADO' AND m.moneda='USD'),0)
    - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.usuario_id=@uid AND m.metodo_pago_id=@travel_wallet AND m.tipo='EGRESO' AND m.estado='CONFIRMADO' AND m.moneda='USD'),0)
  ELSE 0 END
WHERE mp.usuario_id=@uid;

COMMIT;
