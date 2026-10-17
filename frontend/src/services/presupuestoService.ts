import { api } from "../lib/api"

export function listarPresupuestos() {
    return api("/presupuestos/")
}

export function guardarPresupuesto(moneda: string, topeMensual: number) {
    return api(`/presupuestos/${moneda}`, {
        method: "PUT",
        body: { tope_mensual: topeMensual },
    })
}

export function quitarPresupuesto(moneda: string) {
    return api(`/presupuestos/${moneda}`, { method: "DELETE" })
}