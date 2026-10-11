import { api } from "../lib/api"

export type TipoAjuste = "RECARGO" | "INTERES" | "COMISION" | "DESCUENTO" | "ADICIONAL"

export function listarAjustes(cuotaId: number) {
    return api(`/ajustes/cuota/${cuotaId}`)
}
export function crearAjuste(cuotaId: number, datos: { tipo: TipoAjuste; monto: number; descripcion: string | null }) {
    // el backend exige cuota_id también en el body
    return api(`/ajustes/cuota/${cuotaId}`, {
        method: "POST",
        body: { cuota_id: cuotaId, ...datos },
    })
}
export function anularAjuste(ajusteId: number) {
    return api(`/ajustes/${ajusteId}`, { method: "DELETE" })
}