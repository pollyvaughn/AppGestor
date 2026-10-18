import { api } from "../lib/api"
import type { ParteDePago } from "./pagoService"

export function listarResumenes(tarjetaId: number) {
    return api(`/resumenes/tarjeta/${tarjetaId}`)
}

// periodo con formato "2026-11-01"
export function pagarResumen(
    tarjetaId: number,
    periodo: string,
    monto: number,
    metodos: ParteDePago[],
    fecha?: string
) {
    return api(`/resumenes/tarjeta/${tarjetaId}/${periodo}/pagar`, {
        method: "POST",
        body: { monto, metodos, fecha: fecha || null },
    })
}