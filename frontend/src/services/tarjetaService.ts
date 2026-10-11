import { api } from "../lib/api"

export function listarTarjetas() {
    return api("/tarjetas/")
}
export function crearTarjeta(datos: object) {
    return api("/tarjetas/", { method: "POST", body: datos })
}
export function editarTarjeta(id: number, datos: object) {
    return api(`/tarjetas/${id}`, { method: "PUT", body: datos })
}
export function eliminarTarjeta(id: number) {
    return api(`/tarjetas/${id}`, { method: "DELETE" })
}