-- =========================================================
-- AppGestor - esquema de la base de datos
--
-- ATENCIÓN: este archivo BORRA la base "finanzas" completa y la
-- vuelve a crear desde cero. Es lo que queremos para la demo:
-- ejecutar este archivo y después database/seed.sql deja todo listo.
-- No lo ejecutes si tenés datos que quieras conservar.
-- =========================================================

DROP DATABASE IF EXISTS finanzas;

CREATE DATABASE finanzas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE finanzas;


-- =========================================================
-- USUARIO
-- =========================================================

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================================
-- CATEGORIAS
-- =========================================================

CREATE TABLE categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('INGRESO', 'EGRESO') NOT NULL,
    color VARCHAR(20),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_categoria_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
);


-- =========================================================
-- METODOS DE PAGO
-- =========================================================

CREATE TABLE metodo_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,

    tipo ENUM(
        'EFECTIVO',
        'BILLETERA',
        'CUENTA_BANCARIA',
        'TARJETA_CREDITO'
    ) NOT NULL,

    nombre VARCHAR(100) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',

    saldo DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_metodo_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
);


-- =========================================================
-- CUENTA BANCARIA
-- =========================================================

CREATE TABLE cuenta_bancaria (
    id INT AUTO_INCREMENT PRIMARY KEY,

    metodo_pago_id INT NOT NULL UNIQUE,

    tipo_cuenta ENUM(
        'AHORRO',
        'CORRIENTE'
    ) NOT NULL,

    banco VARCHAR(100),
    numero_referencia VARCHAR(100),

    CONSTRAINT fk_cuenta_metodo
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodo_pago(id)
);


-- =========================================================
-- TARJETA DE CREDITO
-- =========================================================

CREATE TABLE tarjeta_credito (
    id INT AUTO_INCREMENT PRIMARY KEY,

    metodo_pago_id INT NOT NULL UNIQUE,

    estado ENUM(
        'ACTIVA',
        'BLOQUEADA',
        'VENCIDA',
        'DADA_DE_BAJA'
    ) NOT NULL DEFAULT 'ACTIVA',

    limite_credito DECIMAL(15,2) NOT NULL,

    fecha_cierre INT NOT NULL,

    fecha_vencimiento INT NOT NULL,

    porcentaje_pago_minimo DECIMAL(5,2),

    CONSTRAINT fk_tarjeta_metodo
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodo_pago(id),

    CONSTRAINT chk_fecha_cierre
        CHECK (fecha_cierre BETWEEN 1 AND 31),

    CONSTRAINT chk_fecha_vencimiento
        CHECK (fecha_vencimiento BETWEEN 1 AND 31),

    CONSTRAINT chk_porcentaje_minimo
        CHECK (
            porcentaje_pago_minimo IS NULL
            OR porcentaje_pago_minimo BETWEEN 0 AND 100
        )
);


-- =========================================================
-- MOVIMIENTOS
--
-- Tipos:
--   INGRESO / EGRESO  -> los únicos que cuentan en los reportes
--   SALDO_INICIAL     -> lo crea el sistema al crear una cuenta con saldo
--   AJUSTE            -> lo crea el sistema al editar a mano el saldo
--   PAGO_TARJETA      -> lo crea el sistema al pagar una cuota
--   TRANSFERENCIA     -> reservado
-- =========================================================

CREATE TABLE movimiento (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    categoria_id INT,

    metodo_pago_id INT,

    tipo ENUM(
        'INGRESO',
        'EGRESO',
        'TRANSFERENCIA',
        'PAGO_TARJETA',
        'AJUSTE',
        'SALDO_INICIAL'
    ) NOT NULL,

    estado ENUM(
        'PENDIENTE',
        'CONFIRMADO',
        'ANULADO'
    ) NOT NULL DEFAULT 'CONFIRMADO',

    descripcion VARCHAR(255),

    monto DECIMAL(15,2) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    tipo_cambio DECIMAL(15,6),

    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id),

    CONSTRAINT fk_movimiento_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categoria(id),

    CONSTRAINT fk_movimiento_metodo_principal
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodo_pago(id),

    CONSTRAINT chk_movimiento_monto
        CHECK (tipo = 'AJUSTE' OR monto >= 0),

    CONSTRAINT chk_movimiento_tipo_cambio
        CHECK (
            tipo_cambio IS NULL
            OR tipo_cambio > 0
        )
);


-- =========================================================
-- METODOS UTILIZADOS EN UN MOVIMIENTO
-- Permite dividir un pago entre varios métodos
-- =========================================================

CREATE TABLE movimiento_metodo (
    id INT AUTO_INCREMENT PRIMARY KEY,

    movimiento_id INT NOT NULL,

    metodo_pago_id INT NOT NULL,

    monto DECIMAL(15,2) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    tipo_cambio DECIMAL(15,6),

    CONSTRAINT fk_movimiento_metodo_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT fk_movimiento_metodo_metodo
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodo_pago(id),

    CONSTRAINT chk_movimiento_metodo_monto
        CHECK (monto > 0),

    CONSTRAINT chk_movimiento_metodo_tipo_cambio
        CHECK (
            tipo_cambio IS NULL
            OR tipo_cambio > 0
        )
);


-- =========================================================
-- COMPRA CON TARJETA
-- =========================================================

CREATE TABLE compra_tarjeta (
    id INT AUTO_INCREMENT PRIMARY KEY,

    movimiento_id INT NOT NULL UNIQUE,

    tarjeta_id INT NOT NULL,

    monto_base DECIMAL(15,2) NOT NULL,

    cantidad_cuotas INT,

    fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_compra_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT fk_compra_tarjeta
        FOREIGN KEY (tarjeta_id)
        REFERENCES tarjeta_credito(id),

    CONSTRAINT chk_compra_monto
        CHECK (monto_base > 0),

    CONSTRAINT chk_compra_cuotas
        CHECK (
            cantidad_cuotas IS NULL
            OR cantidad_cuotas > 0
        )
);


-- =========================================================
-- CUOTAS
-- =========================================================

CREATE TABLE cuota (
    id INT AUTO_INCREMENT PRIMARY KEY,

    compra_tarjeta_id INT NOT NULL,

    numero INT NOT NULL,

    monto_base DECIMAL(15,2) NOT NULL,

    periodo DATE NOT NULL,

    fecha_vencimiento DATE,

    estado ENUM(
        'PENDIENTE',
        'PARCIAL',
        'PAGADA',
        'OMITIDA',
        'ANULADA'
    ) NOT NULL DEFAULT 'PENDIENTE',

    monto_pendiente DECIMAL(15,2) NOT NULL,

    cuota_origen_id INT,

    CONSTRAINT fk_cuota_compra
        FOREIGN KEY (compra_tarjeta_id)
        REFERENCES compra_tarjeta(id),

    CONSTRAINT fk_cuota_origen
        FOREIGN KEY (cuota_origen_id)
        REFERENCES cuota(id),

    CONSTRAINT chk_cuota_numero
        CHECK (numero > 0),

    CONSTRAINT chk_cuota_monto_base
        CHECK (monto_base >= 0),

    CONSTRAINT chk_cuota_pendiente
        CHECK (monto_pendiente >= 0)
);


-- =========================================================
-- PAGOS
-- Un pago ES un movimiento especializado
-- =========================================================

CREATE TABLE pago (
    id INT AUTO_INCREMENT PRIMARY KEY,

    cuota_id INT,

    movimiento_id INT NOT NULL UNIQUE,

    monto DECIMAL(15,2) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'PENDIENTE',
        'CONFIRMADO',
        'ANULADO'
    ) NOT NULL DEFAULT 'CONFIRMADO',

    CONSTRAINT fk_pago_cuota
        FOREIGN KEY (cuota_id)
        REFERENCES cuota(id),

    CONSTRAINT fk_pago_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT chk_pago_monto
        CHECK (monto > 0)
);


-- =========================================================
-- AJUSTES
-- Recargos, intereses, comisiones, descuentos, adicionales
-- Puede pertenecer a una cuota O a un movimiento
-- =========================================================

CREATE TABLE ajuste (
    id INT AUTO_INCREMENT PRIMARY KEY,

    cuota_id INT,

    movimiento_id INT,

    tipo ENUM(
        'RECARGO',
        'INTERES',
        'COMISION',
        'DESCUENTO',
        'ADICIONAL'
    ) NOT NULL,

    monto DECIMAL(15,2) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    descripcion VARCHAR(255),

    estado ENUM(
        'ACTIVO',
        'ANULADO'
    ) NOT NULL DEFAULT 'ACTIVO',

    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ajuste_cuota
        FOREIGN KEY (cuota_id)
        REFERENCES cuota(id),

    CONSTRAINT fk_ajuste_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT chk_ajuste_monto
        CHECK (monto > 0),

    CONSTRAINT chk_ajuste_destino
        CHECK (
            (cuota_id IS NOT NULL AND movimiento_id IS NULL)
            OR
            (cuota_id IS NULL AND movimiento_id IS NOT NULL)
        )
);


-- =========================================================
-- RECURRENTES
-- =========================================================

CREATE TABLE recurrente (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT NOT NULL,

    categoria_id INT NOT NULL,

    metodo_pago_id INT,

    nombre VARCHAR(150) NOT NULL,

    tipo ENUM(
        'INGRESO',
        'EGRESO'
    ) NOT NULL,

    monto_base DECIMAL(15,2) NOT NULL,

    moneda ENUM(
        'PYG',
        'USD',
        'EUR',
        'ARS',
        'BRL'
    ) NOT NULL,

    frecuencia ENUM(
        'DIARIA',
        'SEMANAL',
        'QUINCENAL',
        'MENSUAL',
        'BIMESTRAL',
        'TRIMESTRAL',
        'SEMESTRAL',
        'ANUAL'
    ) NOT NULL,

    proxima_fecha DATE,

    estado ENUM(
        'ACTIVO',
        'INACTIVO'
    ) NOT NULL DEFAULT 'ACTIVO',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_recurrente_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id),

    CONSTRAINT fk_recurrente_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categoria(id),

    CONSTRAINT fk_recurrente_metodo
        FOREIGN KEY (metodo_pago_id)
        REFERENCES metodo_pago(id),

    CONSTRAINT chk_recurrente_monto
        CHECK (monto_base > 0)
);


-- =========================================================
-- MOVIMIENTOS GENERADOS POR RECURRENTES
-- =========================================================

CREATE TABLE movimiento_recurrente (
    id INT AUTO_INCREMENT PRIMARY KEY,

    recurrente_id INT NOT NULL,

    movimiento_id INT NOT NULL UNIQUE,

    periodo DATE NOT NULL,

    monto DECIMAL(15,2) NOT NULL,

    CONSTRAINT fk_mov_recurrente_recurrente
        FOREIGN KEY (recurrente_id)
        REFERENCES recurrente(id),

    CONSTRAINT fk_mov_recurrente_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT chk_mov_recurrente_monto
        CHECK (monto > 0)
);


-- =========================================================
-- PRESUPUESTO
-- Tope mensual de gasto por usuario y moneda
-- (gráfico "Ritmo de gasto del mes" de la pantalla Global)
-- =========================================================

CREATE TABLE presupuesto (
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


-- =========================================================
-- ADJUNTOS
-- =========================================================

CREATE TABLE adjunto (
    id INT AUTO_INCREMENT PRIMARY KEY,

    movimiento_id INT NOT NULL,

    tipo ENUM(
        'IMAGEN',
        'PDF'
    ) NOT NULL,

    nombre_archivo VARCHAR(255),

    ruta VARCHAR(500) NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_adjunto_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id)
);


-- =========================================================
-- ANULACIONES
-- Conserva el historial de operaciones revertidas
-- =========================================================

CREATE TABLE anulacion (
    id INT AUTO_INCREMENT PRIMARY KEY,

    movimiento_id INT,

    pago_id INT,

    ajuste_id INT,

    motivo VARCHAR(255),

    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_anulacion_movimiento
        FOREIGN KEY (movimiento_id)
        REFERENCES movimiento(id),

    CONSTRAINT fk_anulacion_pago
        FOREIGN KEY (pago_id)
        REFERENCES pago(id),

    CONSTRAINT fk_anulacion_ajuste
        FOREIGN KEY (ajuste_id)
        REFERENCES ajuste(id),

    CONSTRAINT chk_anulacion_destino
        CHECK (
            (movimiento_id IS NOT NULL AND pago_id IS NULL AND ajuste_id IS NULL)
            OR
            (movimiento_id IS NULL AND pago_id IS NOT NULL AND ajuste_id IS NULL)
            OR
            (movimiento_id IS NULL AND pago_id IS NULL AND ajuste_id IS NOT NULL)
        )
);


-- =========================================================
-- INDICES
-- =========================================================

CREATE INDEX idx_categoria_usuario
    ON categoria(usuario_id);

CREATE INDEX idx_metodo_usuario
    ON metodo_pago(usuario_id);

CREATE INDEX idx_movimiento_usuario
    ON movimiento(usuario_id);

CREATE INDEX idx_movimiento_fecha
    ON movimiento(fecha);

CREATE INDEX idx_movimiento_categoria
    ON movimiento(categoria_id);

CREATE INDEX idx_movimiento_metodo
    ON movimiento(metodo_pago_id);

CREATE INDEX idx_movimiento_metodo_movimiento
    ON movimiento_metodo(movimiento_id);

CREATE INDEX idx_cuota_compra
    ON cuota(compra_tarjeta_id);

CREATE INDEX idx_cuota_periodo
    ON cuota(periodo);

CREATE INDEX idx_cuota_estado
    ON cuota(estado);

CREATE INDEX idx_pago_cuota
    ON pago(cuota_id);

CREATE INDEX idx_ajuste_cuota
    ON ajuste(cuota_id);

CREATE INDEX idx_ajuste_movimiento
    ON ajuste(movimiento_id);

CREATE INDEX idx_recurrente_usuario
    ON recurrente(usuario_id);

CREATE INDEX idx_recurrente_estado
    ON recurrente(estado);

CREATE INDEX idx_movimiento_recurrente_periodo
    ON movimiento_recurrente(periodo);

CREATE INDEX idx_adjunto_movimiento
    ON adjunto(movimiento_id);