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