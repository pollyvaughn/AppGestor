import { formatearMonto } from "./moneda"

// Texto de aviso si gastar `monto` deja la cuenta en negativo ("" si alcanza).
export function avisoSaldo(
    nombre: string,
    saldoDisponible: number,
    monto: number,
    moneda: string
) {
    const queda = Math.round((saldoDisponible - monto) * 100) / 100

    if (queda >= 0) {
        return ""
    }

    return `${nombre} quedaría en ${formatearMonto(queda, moneda)} ${moneda}. ¿Registrar igual?`
}