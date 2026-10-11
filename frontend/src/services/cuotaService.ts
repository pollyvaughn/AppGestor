import { api } from "../lib/api"

export function omitirCuota(cuotaId: number) {
    return api(`/cuotas/${cuotaId}/omitir`, { method: "POST" })
}