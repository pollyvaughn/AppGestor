import { api } from "../lib/api"

export type ParteDePago = { metodo_pago_id: number; monto: number }

export function listarPagosPorCuota(cuotaId: number) {
    return api(`/pagos/cuota/${cuotaId}`)
}
export function crearPago(cuotaId: number, monto: number, metodos: ParteDePago[]) {
    return api("/pagos/", {
        method: "POST",
        body: { cuota_id: cuotaId, monto, metodos },
    })
}
export function editarPago(pagoId: number, cuotaId: number, monto: number, metodos: ParteDePago[]) {
    return api(`/pagos/${pagoId}`, {
        method: "PUT",
        body: { cuota_id: cuotaId, monto, metodos },
    })
}
export function anularPago(pagoId: number) {
    return api(`/pagos/${pagoId}/anular`, { method: "PUT" })
}