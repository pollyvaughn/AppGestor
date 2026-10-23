import { api } from "../lib/api"

// Por defecto trae solo las activas (selectores de movimientos, recurrentes, etc.).
// Con incluirInactivas = true trae también las desactivadas.
export function listarCategorias(incluirInactivas = false) {
    const query = incluirInactivas ? "?incluir_inactivas=true" : ""
    return api(`/categorias/${query}`)
}

export function crearCategoria(datos: object) {
    return api("/categorias/", { method: "POST", body: datos })
}

export function editarCategoria(id: number, datos: object) {
    return api(`/categorias/${id}`, { method: "PUT", body: datos })
}

// Desactiva la categoría (el backend no la borra)
export function eliminarCategoria(id: number) {
    return api(`/categorias/${id}`, { method: "DELETE" })
}

export function reactivarCategoria(id: number) {
    return api(`/categorias/${id}/reactivar`, { method: "PUT" })
}