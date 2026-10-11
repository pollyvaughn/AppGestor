import { api } from "../lib/api"

export function listarCompras() {
    return api("/compras-tarjeta/")
}
export function crearCompra(datos: object) {
    return api("/compras-tarjeta/", { method: "POST", body: datos })
}
export function editarCompra(id: number, datos: object) {
    return api(`/compras-tarjeta/${id}`, { method: "PUT", body: datos })
}
export function eliminarCompra(id: number) {
    return api(`/compras-tarjeta/${id}`, { method: "DELETE" })
}
export function listarCuotas(compraId: number) {
    return api(`/compras-tarjeta/${compraId}/cuotas`)
}