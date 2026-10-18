import { api } from "../lib/api"

export function listarCuentas() {
    return api("/metodos-pago/")
}

export function crearCuenta(datos: object) {
    return api("/metodos-pago/", { method: "POST", body: datos })
}

export function editarCuenta(id: number, datos: object) {
    return api(`/metodos-pago/${id}`, { method: "PUT", body: datos })
}

export function eliminarCuenta(id: number) {
    return api(`/metodos-pago/${id}`, { method: "DELETE" })
}

export function ajustarSaldoCuenta(id: number, saldoReal: number, motivo: string | null) {
    return api(`/metodos-pago/${id}/ajustar-saldo`, {
        method: "POST",
        body: { saldo_real: saldoReal, motivo },
    })
}