import type { Movimiento } from "./movimientos"

// Balance de liquidez (cuentas de dinero, sin tarjetas), por moneda.
//
// Idea: el saldo de las cuentas es la suma del efecto de todos sus
// movimientos confirmados (saldo inicial + ingresos - egresos + ajustes
// + transferencias - pagos de tarjeta). El arrastre de un mes es esa suma
// hasta el último día del mes anterior.
//
// Solo se cuentan cuentas ACTIVAS que no son tarjeta (igual que "Liquidez
// real" en Global). Por eso las compras con tarjeta no entran: su gasto
// sale de la cuenta recién cuando se paga la cuota (PAGO_TARJETA).

export type CuentaBalance = {
    id: number
    tipo: string
    moneda: string
    saldo: number
}

export type BalanceMes = {
    // saldo con el que arranca el mes (todo lo anterior al día 1)
    arrastre: number
    // cuánto cambió la liquidez dentro del mes (incluye pagos de tarjeta,
    // ajustes y transferencias a cuentas inactivas; no solo ingresos - gastos)
    movimientoNeto: number
    // saldo al cierre del mes = arrastre + movimientoNeto
    cierre: number
}

function redondear(valor: number) {
    return Math.round(valor * 100) / 100
}

// Cuánto suma (o resta) un movimiento a la liquidez de las cuentas propias.
export function efectoEnLiquidez(m: Movimiento, propias: Set<number>) {
    if (m.estado !== "CONFIRMADO") {
        return 0
    }

    const monto = Number(m.monto)
    const enPropias = function (id: number | null) {
        return id !== null && propias.has(id)
    }

    switch (m.tipo) {
        case "INGRESO":
        case "SALDO_INICIAL":
        case "AJUSTE": // el ajuste ya trae su signo
            return enPropias(m.metodo_pago_id) ? monto : 0

        case "EGRESO":
            return enPropias(m.metodo_pago_id) ? -monto : 0

        case "TRANSFERENCIA":
            return (
                (enPropias(m.metodo_pago_destino_id) ? monto : 0) -
                (enPropias(m.metodo_pago_id) ? monto : 0)
            )

        // Se guarda sin cuenta (metodo_pago_id = null): el dinero salió de
        // cuentas propias de la misma moneda que la tarjeta.
        case "PAGO_TARJETA":
            return -monto

        default:
            return 0
    }
}

// mes con la forma "2026-10"
export function balanceDelMes(
    movimientos: Movimiento[],
    cuentas: CuentaBalance[],
    moneda: string,
    mes: string
): BalanceMes {
    const propias = new Set(
        cuentas
            .filter(function (c) {
                return c.tipo !== "TARJETA_CREDITO" && c.moneda === moneda
            })
            .map(function (c) {
                return c.id
            })
    )

    let arrastre = 0
    let movimientoNeto = 0

    for (const m of movimientos) {
        if (m.moneda !== moneda) {
            continue
        }

        const mesDelMovimiento = m.fecha.slice(0, 7)

        // las fechas "AAAA-MM" se comparan bien como texto
        if (mesDelMovimiento < mes) {
            arrastre += efectoEnLiquidez(m, propias)
        } else if (mesDelMovimiento === mes) {
            movimientoNeto += efectoEnLiquidez(m, propias)
        }
    }

    return {
        arrastre: redondear(arrastre),
        movimientoNeto: redondear(movimientoNeto),
        cierre: redondear(arrastre + movimientoNeto),
    }
}

// Control: el cierre del mes actual debe ser igual a la suma de los saldos
// de las cuentas. Devuelve la diferencia (0 = cuadra).
export function diferenciaConSaldoActual(
    movimientos: Movimiento[],
    cuentas: CuentaBalance[],
    moneda: string,
    mes: string
) {
    const { cierre } = balanceDelMes(movimientos, cuentas, moneda, mes)

    const saldos = cuentas.reduce(function (total, c) {
        return c.tipo === "TARJETA_CREDITO" || c.moneda !== moneda
            ? total
            : total + Number(c.saldo)
    }, 0)

    return redondear(cierre - saldos)
}