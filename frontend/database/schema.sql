-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 28, 2026 at 07:38 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `finanzas`
--

-- --------------------------------------------------------

--
-- Table structure for table `adjunto`
--

CREATE TABLE `adjunto` (
  `id` int(11) NOT NULL,
  `movimiento_id` int(11) NOT NULL,
  `tipo` enum('IMAGEN','PDF') NOT NULL,
  `nombre_archivo` varchar(255) DEFAULT NULL,
  `ruta` varchar(500) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ajuste`
--

CREATE TABLE `ajuste` (
  `id` int(11) NOT NULL,
  `cuota_id` int(11) DEFAULT NULL,
  `movimiento_id` int(11) DEFAULT NULL,
  `tipo` enum('RECARGO','INTERES','COMISION','DESCUENTO','ADICIONAL') NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `anulacion`
--

CREATE TABLE `anulacion` (
  `id` int(11) NOT NULL,
  `movimiento_id` int(11) DEFAULT NULL,
  `pago_id` int(11) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `categoria`
--

CREATE TABLE `categoria` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('INGRESO','EGRESO') NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `compra_tarjeta`
--

CREATE TABLE `compra_tarjeta` (
  `id` int(11) NOT NULL,
  `movimiento_id` int(11) NOT NULL,
  `tarjeta_id` int(11) NOT NULL,
  `monto_base` decimal(15,2) NOT NULL,
  `cantidad_cuotas` int(11) DEFAULT NULL,
  `fecha_compra` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `cuenta_bancaria`
--

CREATE TABLE `cuenta_bancaria` (
  `id` int(11) NOT NULL,
  `metodo_pago_id` int(11) NOT NULL,
  `tipo_cuenta` enum('AHORRO','CORRIENTE') NOT NULL,
  `banco` varchar(100) DEFAULT NULL,
  `numero_referencia` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cuota`
--

CREATE TABLE `cuota` (
  `id` int(11) NOT NULL,
  `compra_tarjeta_id` int(11) NOT NULL,
  `numero` int(11) NOT NULL,
  `monto_base` decimal(15,2) NOT NULL,
  `periodo` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `estado` enum('PENDIENTE','PARCIAL','PAGADA','OMITIDA','ANULADA') NOT NULL DEFAULT 'PENDIENTE',
  `monto_pendiente` decimal(15,2) NOT NULL,
  `cuota_origen_id` int(11) DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `metodo_pago`
--

CREATE TABLE `metodo_pago` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo` enum('EFECTIVO','BILLETERA','CUENTA_BANCARIA','TARJETA_CREDITO') NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `saldo` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento`
--

CREATE TABLE `movimiento` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `metodo_pago_id` int(11) DEFAULT NULL,
  `tipo` enum('INGRESO','EGRESO','TRANSFERENCIA','PAGO_TARJETA','AJUSTE') NOT NULL,
  `estado` enum('PENDIENTE','CONFIRMADO','ANULADO') NOT NULL DEFAULT 'CONFIRMADO',
  `descripcion` varchar(255) DEFAULT NULL,
  `monto` decimal(15,2) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `tipo_cambio` decimal(15,6) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_metodo`
--

CREATE TABLE `movimiento_metodo` (
  `id` int(11) NOT NULL,
  `movimiento_id` int(11) NOT NULL,
  `metodo_pago_id` int(11) NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `tipo_cambio` decimal(15,6) DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `movimiento_recurrente`
--

CREATE TABLE `movimiento_recurrente` (
  `id` int(11) NOT NULL,
  `recurrente_id` int(11) NOT NULL,
  `movimiento_id` int(11) NOT NULL,
  `periodo` date NOT NULL,
  `monto` decimal(15,2) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `pago`
--

CREATE TABLE `pago` (
  `id` int(11) NOT NULL,
  `cuota_id` int(11) DEFAULT NULL,
  `movimiento_id` int(11) NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('PENDIENTE','CONFIRMADO','ANULADO') NOT NULL DEFAULT 'CONFIRMADO'
) ;

-- --------------------------------------------------------

--
-- Table structure for table `recurrente`
--

CREATE TABLE `recurrente` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `metodo_pago_id` int(11) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `tipo` enum('INGRESO','EGRESO') NOT NULL,
  `monto_base` decimal(15,2) NOT NULL,
  `moneda` enum('PYG','USD','EUR','ARS','BRL') NOT NULL,
  `frecuencia` enum('DIARIA','SEMANAL','QUINCENAL','MENSUAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL') NOT NULL,
  `proxima_fecha` date DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `tarjeta_credito`
--

CREATE TABLE `tarjeta_credito` (
  `id` int(11) NOT NULL,
  `metodo_pago_id` int(11) NOT NULL,
  `estado` enum('ACTIVA','BLOQUEADA','VENCIDA','DADA_DE_BAJA') NOT NULL DEFAULT 'ACTIVA',
  `limite_credito` decimal(15,2) NOT NULL,
  `fecha_cierre` int(11) NOT NULL,
  `fecha_vencimiento` int(11) NOT NULL,
  `porcentaje_pago_minimo` decimal(5,2) DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
--

CREATE TABLE `usuario` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `adjunto`
--
ALTER TABLE `adjunto`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_adjunto_movimiento` (`movimiento_id`);

--
-- Indexes for table `ajuste`
--
ALTER TABLE `ajuste`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ajuste_cuota` (`cuota_id`),
  ADD KEY `idx_ajuste_movimiento` (`movimiento_id`);

--
-- Indexes for table `anulacion`
--
ALTER TABLE `anulacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_anulacion_movimiento` (`movimiento_id`),
  ADD KEY `fk_anulacion_pago` (`pago_id`);

--
-- Indexes for table `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria_usuario` (`usuario_id`);

--
-- Indexes for table `compra_tarjeta`
--
ALTER TABLE `compra_tarjeta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `movimiento_id` (`movimiento_id`),
  ADD KEY `fk_compra_tarjeta` (`tarjeta_id`);

--
-- Indexes for table `cuenta_bancaria`
--
ALTER TABLE `cuenta_bancaria`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `metodo_pago_id` (`metodo_pago_id`);

--
-- Indexes for table `cuota`
--
ALTER TABLE `cuota`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cuota_origen` (`cuota_origen_id`),
  ADD KEY `idx_cuota_compra` (`compra_tarjeta_id`),
  ADD KEY `idx_cuota_periodo` (`periodo`),
  ADD KEY `idx_cuota_estado` (`estado`);

--
-- Indexes for table `metodo_pago`
--
ALTER TABLE `metodo_pago`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_metodo_usuario` (`usuario_id`);

--
-- Indexes for table `movimiento`
--
ALTER TABLE `movimiento`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_movimiento_usuario` (`usuario_id`),
  ADD KEY `idx_movimiento_fecha` (`fecha`),
  ADD KEY `idx_movimiento_categoria` (`categoria_id`),
  ADD KEY `idx_movimiento_metodo` (`metodo_pago_id`);

--
-- Indexes for table `movimiento_metodo`
--
ALTER TABLE `movimiento_metodo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_movimiento_metodo_metodo` (`metodo_pago_id`),
  ADD KEY `idx_movimiento_metodo_movimiento` (`movimiento_id`);

--
-- Indexes for table `movimiento_recurrente`
--
ALTER TABLE `movimiento_recurrente`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `movimiento_id` (`movimiento_id`),
  ADD KEY `fk_mov_recurrente_recurrente` (`recurrente_id`),
  ADD KEY `idx_movimiento_recurrente_periodo` (`periodo`);

--
-- Indexes for table `pago`
--
ALTER TABLE `pago`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `movimiento_id` (`movimiento_id`),
  ADD KEY `idx_pago_cuota` (`cuota_id`);

--
-- Indexes for table `recurrente`
--
ALTER TABLE `recurrente`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_recurrente_categoria` (`categoria_id`),
  ADD KEY `fk_recurrente_metodo` (`metodo_pago_id`),
  ADD KEY `idx_recurrente_usuario` (`usuario_id`),
  ADD KEY `idx_recurrente_estado` (`estado`);

--
-- Indexes for table `tarjeta_credito`
--
ALTER TABLE `tarjeta_credito`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `metodo_pago_id` (`metodo_pago_id`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `adjunto`
--
ALTER TABLE `adjunto`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ajuste`
--
ALTER TABLE `ajuste`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `anulacion`
--
ALTER TABLE `anulacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compra_tarjeta`
--
ALTER TABLE `compra_tarjeta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cuenta_bancaria`
--
ALTER TABLE `cuenta_bancaria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cuota`
--
ALTER TABLE `cuota`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `metodo_pago`
--
ALTER TABLE `metodo_pago`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento`
--
ALTER TABLE `movimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento_metodo`
--
ALTER TABLE `movimiento_metodo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `movimiento_recurrente`
--
ALTER TABLE `movimiento_recurrente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pago`
--
ALTER TABLE `pago`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recurrente`
--
ALTER TABLE `recurrente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tarjeta_credito`
--
ALTER TABLE `tarjeta_credito`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `adjunto`
--
ALTER TABLE `adjunto`
  ADD CONSTRAINT `fk_adjunto_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`);

--
-- Constraints for table `ajuste`
--
ALTER TABLE `ajuste`
  ADD CONSTRAINT `fk_ajuste_cuota` FOREIGN KEY (`cuota_id`) REFERENCES `cuota` (`id`),
  ADD CONSTRAINT `fk_ajuste_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`);

--
-- Constraints for table `anulacion`
--
ALTER TABLE `anulacion`
  ADD CONSTRAINT `fk_anulacion_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`),
  ADD CONSTRAINT `fk_anulacion_pago` FOREIGN KEY (`pago_id`) REFERENCES `pago` (`id`);

--
-- Constraints for table `categoria`
--
ALTER TABLE `categoria`
  ADD CONSTRAINT `fk_categoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `compra_tarjeta`
--
ALTER TABLE `compra_tarjeta`
  ADD CONSTRAINT `fk_compra_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`),
  ADD CONSTRAINT `fk_compra_tarjeta` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjeta_credito` (`id`);

--
-- Constraints for table `cuenta_bancaria`
--
ALTER TABLE `cuenta_bancaria`
  ADD CONSTRAINT `fk_cuenta_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodo_pago` (`id`);

--
-- Constraints for table `cuota`
--
ALTER TABLE `cuota`
  ADD CONSTRAINT `fk_cuota_compra` FOREIGN KEY (`compra_tarjeta_id`) REFERENCES `compra_tarjeta` (`id`),
  ADD CONSTRAINT `fk_cuota_origen` FOREIGN KEY (`cuota_origen_id`) REFERENCES `cuota` (`id`);

--
-- Constraints for table `metodo_pago`
--
ALTER TABLE `metodo_pago`
  ADD CONSTRAINT `fk_metodo_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `movimiento`
--
ALTER TABLE `movimiento`
  ADD CONSTRAINT `fk_movimiento_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categoria` (`id`),
  ADD CONSTRAINT `fk_movimiento_metodo_principal` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodo_pago` (`id`),
  ADD CONSTRAINT `fk_movimiento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `movimiento_metodo`
--
ALTER TABLE `movimiento_metodo`
  ADD CONSTRAINT `fk_movimiento_metodo_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodo_pago` (`id`),
  ADD CONSTRAINT `fk_movimiento_metodo_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`);

--
-- Constraints for table `movimiento_recurrente`
--
ALTER TABLE `movimiento_recurrente`
  ADD CONSTRAINT `fk_mov_recurrente_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`),
  ADD CONSTRAINT `fk_mov_recurrente_recurrente` FOREIGN KEY (`recurrente_id`) REFERENCES `recurrente` (`id`);

--
-- Constraints for table `pago`
--
ALTER TABLE `pago`
  ADD CONSTRAINT `fk_pago_cuota` FOREIGN KEY (`cuota_id`) REFERENCES `cuota` (`id`),
  ADD CONSTRAINT `fk_pago_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento` (`id`);

--
-- Constraints for table `recurrente`
--
ALTER TABLE `recurrente`
  ADD CONSTRAINT `fk_recurrente_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categoria` (`id`),
  ADD CONSTRAINT `fk_recurrente_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodo_pago` (`id`),
  ADD CONSTRAINT `fk_recurrente_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `tarjeta_credito`
--
ALTER TABLE `tarjeta_credito`
  ADD CONSTRAINT `fk_tarjeta_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodo_pago` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
