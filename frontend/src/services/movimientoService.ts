import { api } from "../lib/api"
import type { Movimiento } from "../lib/movimientos"

export function listarMovimientos() {
    return api<Movimiento[]>("/movimientos/")
}

export function crearMovimiento(datos: object) {
    return api("/movimientos/", { method: "POST", body: datos })
}

export function editarMovimiento(id: number, datos: object) {
    return api(`/movimientos/${id}`, { method: "PUT", body: datos })
}

export function eliminarMovimiento(id: number) {
    return api(`/movimientos/${id}`, { method: "DELETE" })
}

export function crearTransferencia(datos: object) {
    return api("/movimientos/transferencia", { method: "POST", body: datos })
}