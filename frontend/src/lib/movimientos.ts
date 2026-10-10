export type Movimiento = {
    id: number
    categoria_id: number | null
    categoria: string | null
    metodo_pago_id: number | null
    metodo_pago: string | null
    tipo: "INGRESO" | "EGRESO" | "TRANSFERENCIA" | "PAGO_TARJETA" | "AJUSTE"
    estado: "PENDIENTE" | "CONFIRMADO" | "ANULADO"
    descripcion: string | null
    monto: number
    moneda: string
    tipo_cambio: number | null
    fecha: string
}

export const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

// "2026-09" a partir de la fecha del movimiento (sin problemas de zona horaria)
export function mesDe(m: Movimiento) {
    return m.fecha.slice(0, 7)
}

export function mesActual() {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
}

// "2026-09" + 1 => "2026-10"
export function moverMes(mes: string, delta: number) {
    const [anio, numero] = mes.split("-").map(Number)
    const fecha = new Date(anio, numero - 1 + delta, 1)
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
}

export function nombreMes(mes: string) {
    const [anio, numero] = mes.split("-").map(Number)
    return `${MESES[numero - 1]} ${anio}`
}

// Solo lo que cuenta para ingresos y gastos
export function esContable(m: Movimiento) {
    return (
        m.estado === "CONFIRMADO" &&
        (m.tipo === "INGRESO" || m.tipo === "EGRESO")
    )
}

export type Totales = { ingresos: number; egresos: number }

export function totalesPorMoneda(lista: Movimiento[]) {
    const resultado: Record<string, Totales> = {}

    for (const m of lista) {
        if (!esContable(m)) continue

        if (!resultado[m.moneda]) {
            resultado[m.moneda] = { ingresos: 0, egresos: 0 }
        }

        if (m.tipo === "INGRESO") {
            resultado[m.moneda].ingresos += Number(m.monto)
        } else {
            resultado[m.moneda].egresos += Number(m.monto)
        }
    }

    return resultado
}