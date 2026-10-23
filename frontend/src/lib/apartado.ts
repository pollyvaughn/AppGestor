// "Apartado": plata que ya está comprometida a corto plazo y por eso no
// se considera libre para gastar. Disponible real = liquidez - apartado.
//
// Definición (acordada en el equipo; si cambia, se cambia solo acá):
//   1. Resúmenes de tarjeta que vencen dentro de los próximos 30 días
//      (los ya vencidos y sin pagar también cuentan).
//   2. Recurrentes de EGRESO cuya próxima fecha ya llegó o cae dentro de
//      los próximos 30 días. Se cuenta solo la próxima ocurrencia.
//      Los que se pagan con tarjeta no suman: ya van a aparecer en un
//      resumen cuando se generen.
// No cuenta el tope de presupuesto: es una intención de gasto, no un
// compromiso.

export const DIAS_APARTADO = 30

export type ResumenPendiente = {
    tarjeta: string
    moneda: string
    fecha_vencimiento: string | null
    total_pendiente: number
}

export type RecurrenteProximo = {
    nombre: string
    tipo: string
    monto_base: number
    moneda: string
    proxima_fecha: string | null
    metodo_pago_id: number | null
}

export type Compromiso = {
    origen: "TARJETA" | "RECURRENTE"
    nombre: string
    // "2026-11-10"
    fecha: string
    monto: number
    moneda: string
    vencido: boolean
}

// Fechas como texto "2026-10-22" (sin problemas de zona horaria)
function sumarDias(iso: string, dias: number) {
    const [anio, mes, dia] = iso.split("-").map(Number)

    return new Date(Date.UTC(anio, mes - 1, dia + dias))
        .toISOString()
        .slice(0, 10)
}

export function compromisosProximos(
    resumenes: ResumenPendiente[],
    recurrentes: RecurrenteProximo[],
    idsTarjeta: Set<number>,
    hoy: string,
    dias: number = DIAS_APARTADO
): Compromiso[] {
    const limite = sumarDias(hoy, dias)
    const lista: Compromiso[] = []

    for (const r of resumenes) {
        if (!r.fecha_vencimiento) {
            continue
        }

        const fecha = r.fecha_vencimiento.slice(0, 10)
        const monto = Number(r.total_pendiente)

        if (fecha > limite || monto <= 0) {
            continue
        }

        lista.push({
            origen: "TARJETA",
            nombre: `Resumen ${r.tarjeta}`,
            fecha: fecha,
            monto: monto,
            moneda: r.moneda,
            vencido: fecha < hoy,
        })
    }

    for (const r of recurrentes) {
        if (r.tipo !== "EGRESO" || !r.proxima_fecha) {
            continue
        }

        if (r.metodo_pago_id !== null && idsTarjeta.has(r.metodo_pago_id)) {
            continue
        }

        const fecha = r.proxima_fecha.slice(0, 10)

        if (fecha > limite) {
            continue
        }

        lista.push({
            origen: "RECURRENTE",
            nombre: r.nombre,
            fecha: fecha,
            monto: Number(r.monto_base),
            moneda: r.moneda,
            vencido: fecha < hoy,
        })
    }

    return lista.sort(function (a, b) {
        return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    })
}

export function totalApartado(compromisos: Compromiso[], moneda: string) {
    return compromisos.reduce(function (total, c) {
        return c.moneda === moneda ? total + c.monto : total
    }, 0)
}