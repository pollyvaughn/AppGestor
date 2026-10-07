import { api } from "../lib/api"

export function listarCategorias() {
    return api("/categorias/")
}

export function crearCategoria(datos: object) {
    return api("/categorias/", { method: "POST", body: datos })
}

export function editarCategoria(id: number, datos: object) {
    return api(`/categorias/${id}`, { method: "PUT", body: datos })
}

export function eliminarCategoria(id: number) {
    return api(`/categorias/${id}`, { method: "DELETE" })
}