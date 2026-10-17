import type { Movimiento } from "./movimientos"

export type ClavePeriodo = "mes" | "trimestre" | "anio"

// Fechas como texto "2026-10-17" (igual que m.fecha.slice(0, 10)),
// así no hay problemas de zona horaria.
export type Periodo = { desde: string; hasta: string }

export const OPCIONES_PERIODO: { key: ClavePeriodo; label: string }[] = [
    { key: "mes", label: "Este mes" },
    { key: "trimestre", label: "Últimos 3 meses" },
    { key: "anio", label: "Año actual" },
]

// Cuántos meses hacia atrás se corre el periodo para compararlo con el anterior
const MESES_ATRAS: Record<ClavePeriodo, number> = {
    mes: 1,
    trimestre: 3,
    anio: 12,
}

function aIso(fecha: Date) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0")
    const dia = String(fecha.getDate()).padStart(2, "0")
    return `${fecha.getFullYear()}-${mes}-${dia}`
}

function aFecha(iso: string) {
    const [anio, mes, dia] = iso.split("-").map(Number)
    return new Date(anio, mes - 1, dia)
}

// Suma (o resta) meses sin pasarse de fin de mes: 31/03 - 1 mes = 28/02
function moverMeses(fecha: Date, cantidad: number) {
    const destino = new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1)
    const ultimoDia = new Date(
        destino.getFullYear(),
        destino.getMonth() + 1,
        0
    ).getDate()

    destino.setDate(Math.min(fecha.getDate(), ultimoDia))

    return destino
}

// "Este mes" = del día 1 a hoy. "Últimos 3 meses" = desde el día 1 de hace
// dos meses hasta hoy. "Año actual" = del 1 de enero a hoy.
export function periodoActual(
    clave: ClavePeriodo,
    hoy: Date = new Date()
): Periodo {
    const anio = hoy.getFullYear()
    const mes = hoy.getMonth()

    let inicio: Date

    if (clave === "mes") {
        inicio = new Date(anio, mes, 1)
    } else if (clave === "trimestre") {
        inicio = new Date(anio, mes - 2, 1)
    } else {
        inicio = new Date(anio, 0, 1)
    }

    return { desde: aIso(inicio), hasta: aIso(hoy) }
}

// El mismo tramo, corrido hacia atrás. Así la comparación es pareja:
// el 17 de octubre se compara contra el 17 de septiembre, no contra
// septiembre entero.
export function periodoAnterior(clave: ClavePeriodo, actual: Periodo): Periodo {
    const meses = MESES_ATRAS[clave]

    return {
        desde: aIso(moverMeses(aFecha(actual.desde), -meses)),
        hasta: aIso(moverMeses(aFecha(actual.hasta), -meses)),
    }
}

export function dentroDe(m: Movimiento, periodo: Periodo) {
    const fecha = m.fecha.slice(0, 10)
    return fecha >= periodo.desde && fecha <= periodo.hasta
}

// Días del periodo, contando el primero y el último
export function diasEnPeriodo(periodo: Periodo) {
    const [a1, m1, d1] = periodo.desde.split("-").map(Number)
    const [a2, m2, d2] = periodo.hasta.split("-").map(Number)
    const dia = 24 * 60 * 60 * 1000

    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / dia) + 1
}

// Meses del calendario que toca el periodo (este mes = 1, año actual en
// octubre = 10)
export function mesesEnPeriodo(periodo: Periodo) {
    const [a1, m1] = periodo.desde.split("-").map(Number)
    const [a2, m2] = periodo.hasta.split("-").map(Number)

    return (a2 - a1) * 12 + (m2 - m1) + 1
}

// "2026-10-17" => "17/10/2026"
export function fechaCorta(iso: string) {
    const [anio, mes, dia] = iso.split("-")
    return `${dia}/${mes}/${anio}`
}