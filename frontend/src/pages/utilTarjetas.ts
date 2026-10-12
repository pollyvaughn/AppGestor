export type Cuota = {
    id: number
    compra_tarjeta_id: number
    numero: number
    monto_base: number
    periodo: string
    fecha_vencimiento: string | null
    estado: string
    monto_pendiente: number
}

export type MetodoDePago = {
    metodo_pago_id: number
    monto: number
    moneda: string
    nombre: string
    tipo: string
}

export type Pago = {
    id: number
    cuota_id: number
    movimiento_id: number
    monto: number
    moneda: string
    fecha: string
    estado: string
    metodos: MetodoDePago[]
}

export type Cuenta = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    saldo: number
    estado: string
}

 export type Ajuste = {
    id: number
    cuota_id: number
    tipo: string
    monto: number
    moneda: string
    descripcion: string | null
    estado: string
    fecha: string
}


export const ETIQUETA_ESTADO: Record<string, string> = {
    PENDIENTE: "Pendiente",
    PARCIAL: "Pago parcial",
    PAGADA: "Pagada",
    OMITIDA: "Omitida",
    ANULADA: "Anulada",
}

export function colorEstado(estado: string) {
    if (estado === "PAGADA") {
        return "var(--color-income)"
    }

    if (estado === "PENDIENTE" || estado === "PARCIAL") {
        return "var(--color-expense)"
    }

    return "var(--color-muted-foreground)"
}

// "2026-11-10" => "10/11/2026"
export function fechaCorta(fecha: string | null) {
    if (!fecha) {
        return "—"
    }

    const f = fecha.slice(0, 10)
    return `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`
}

// "2026-11-01" => "11/2026"
export function periodoCorto(periodo: string) {
    return `${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`
}

// Se puede pagar si la cuota debe plata y todas las anteriores
// están pagadas u omitidas (misma regla que el backend).
export function puedePagarCuota(cuotas: Cuota[], cuota: Cuota) {
    if (cuota.estado !== "PENDIENTE" && cuota.estado !== "PARCIAL") {
        return false
    }

    return cuotas.every(function (c) {
        return (
            c.numero >= cuota.numero ||
            c.estado === "PAGADA" ||
            c.estado === "OMITIDA"
        )
    })
}