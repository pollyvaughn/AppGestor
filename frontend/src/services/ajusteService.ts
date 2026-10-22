// Llamadas a la API de ajustes de cuota (recargos, intereses, descuentos...)
import { api } from "../lib/api"

export type TipoAjuste =
    | "RECARGO"
    | "INTERES"
    | "COMISION"
    | "DESCUENTO"
    | "ADICIONAL"

export function listarAjustes(cuotaId: number) {
    return api(`/ajustes/cuota/${cuotaId}`)
}

export function crearAjuste(
    cuotaId: number,
    datos: { tipo: TipoAjuste; monto: number; descripcion: string | null }
) {
    // la cuota va solo en la URL: el backend ya no la pide en el body
    return api(`/ajustes/cuota/${cuotaId}`, {
        method: "POST",
        body: datos,
    })
}

export function anularAjuste(ajusteId: number) {
    return api(`/ajustes/${ajusteId}`, { method: "DELETE" })
}