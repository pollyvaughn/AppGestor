import { api } from "../lib/api"

export function listarRecurrentes() {
    return api("/recurrentes/")
}

export function crearRecurrente(datos: object) {
    return api("/recurrentes/", { method: "POST", body: datos })
}

export function editarRecurrente(id: number, datos: object) {
    return api(`/recurrentes/${id}`, { method: "PUT", body: datos })
}

export function eliminarRecurrente(id: number) {
    return api(`/recurrentes/${id}`, { method: "DELETE" })
}

// Si no se pasa monto, el backend usa el monto base.
export function generarMovimiento(id: number, monto?: number) {
    const parametros = monto !== undefined ? `?monto=${monto}` : ""

    return api(`/recurrentes/${id}/generar${parametros}`, { method: "POST" })
}

// periodo con formato "2026-10-10". Por ahora no se usa en pantalla.
export function anularPeriodo(id: number, periodo: string) {
    return api(`/recurrentes/${id}/periodo/${periodo}`, { method: "DELETE" })
}