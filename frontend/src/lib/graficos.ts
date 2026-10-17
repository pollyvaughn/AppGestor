import {
    type Movimiento,
    mesActual,
    moverMes,
    nombreMes,
} from "./movimientos"

export const COLOR_SIN_CATEGORIA = "#7A7873"
const COLOR_OTRAS = "#B8B5AE"

// Cuántas categorías se muestran antes de agrupar el resto en "Otras"
const MAX_PORCIONES = 6

// 7200000 => "7,2 M"   950000 => "950 mil"
export function formatoCompacto(valor: number) {
    return valor.toLocaleString("es-PY", {
        notation: "compact",
        maximumFractionDigits: 1,
    })
}

// "2026-09" => "Sep 26"
export function etiquetaMes(mes: string) {
    return `${nombreMes(mes).slice(0, 3)} ${mes.slice(2, 4)}`
}

// ---------- Evolución mensual ----------

export type PuntoMensual = {
    mes: string
    etiqueta: string
    ingresos: number
    gastos: number
    margen: number
    // Rangos [desde, hasta] para sombrear el espacio entre las dos líneas.
    // Ambos se anclan en la línea de ingresos: verde si sobra, rojo si falta.
    superavit: [number, number]
    deficit: [number, number]
}

// Últimos 12 meses seguidos (hasta el mes actual), empezando en el primer
// mes que tiene datos. Los meses sin movimientos quedan en cero para que
// el gráfico no salte.
export function serieMensual(
    contables: Movimiento[],
    moneda: string
): PuntoMensual[] {
    const porMes: Record<string, { ingresos: number; gastos: number }> = {}

    for (const m of contables) {
        if (m.moneda !== moneda) {
            continue
        }

        const clave = m.fecha.slice(0, 7)

        if (!porMes[clave]) {
            porMes[clave] = { ingresos: 0, gastos: 0 }
        }

        if (m.tipo === "INGRESO") {
            porMes[clave].ingresos += Number(m.monto)
        } else {
            porMes[clave].gastos += Number(m.monto)
        }
    }

    const mesesConDatos = Object.keys(porMes).sort()

    if (mesesConDatos.length === 0) {
        return []
    }

    const primero = mesesConDatos[0]
    const puntos: PuntoMensual[] = []

    for (let atras = 11; atras >= 0; atras--) {
        const mes = moverMes(mesActual(), -atras)

        if (mes < primero) {
            continue
        }

        const ingresos = porMes[mes]?.ingresos ?? 0
        const gastos = porMes[mes]?.gastos ?? 0

        puntos.push({
            mes: mes,
            etiqueta: etiquetaMes(mes),
            ingresos: ingresos,
            gastos: gastos,
            margen: ingresos - gastos,
            superavit:
                ingresos >= gastos ? [gastos, ingresos] : [ingresos, ingresos],
            deficit:
                gastos > ingresos ? [ingresos, gastos] : [ingresos, ingresos],
        })
    }

    return puntos
}

// ---------- Composición del gasto ----------

export type PorcionGasto = {
    clave: string
    nombre: string
    total: number
    porcentaje: number
    // recharts toma el color de la porción desde este campo
    fill: string
}

export function composicionGastos(
    lista: Movimiento[],
    moneda: string,
    colores: Record<number, string>
): PorcionGasto[] {
    const grupos: Record<
        string,
        { clave: string; nombre: string; total: number; fill: string }
    > = {}
    let suma = 0

    for (const m of lista) {
        if (m.tipo !== "EGRESO" || m.moneda !== moneda) {
            continue
        }

        const monto = Number(m.monto)
        suma += monto

        const clave = String(m.categoria_id ?? "sin-categoria")

        const grupo = grupos[clave] ?? {
            clave: clave,
            nombre: m.categoria ?? "Sin categoría",
            total: 0,
            fill:
                m.categoria_id !== null
                    ? (colores[m.categoria_id] ?? COLOR_SIN_CATEGORIA)
                    : COLOR_SIN_CATEGORIA,
        }

        grupo.total += monto
        grupos[clave] = grupo
    }

    if (suma <= 0) {
        return []
    }

    const ordenadas = Object.values(grupos).sort(function (a, b) {
        return b.total - a.total
    })

    let visibles = ordenadas

    if (ordenadas.length > MAX_PORCIONES + 1) {
        const resto = ordenadas
            .slice(MAX_PORCIONES)
            .reduce(function (total, grupo) {
                return total + grupo.total
            }, 0)

        visibles = [
            ...ordenadas.slice(0, MAX_PORCIONES),
            { clave: "otras", nombre: "Otras", total: resto, fill: COLOR_OTRAS },
        ]
    }

    return visibles.map(function (grupo) {
        return {
            clave: grupo.clave,
            nombre: grupo.nombre,
            total: grupo.total,
            porcentaje: (grupo.total / suma) * 100,
            fill: grupo.fill,
        }
    })
}

// ---------- Ritmo de gasto del mes ----------

export type PuntoRitmo = {
    dia: number
    // null en los días que todavía no llegaron: la línea se corta en hoy
    acumulado: number | null
    ideal: number | null
}

export type SerieRitmo = {
    puntos: PuntoRitmo[]
    diasMes: number
    diaHoy: number
    gastado: number
    // gasto estimado a fin de mes si se sigue al mismo ritmo diario
    proyeccion: number
}

export function serieRitmo(
    contables: Movimiento[],
    moneda: string,
    tope: number | null,
    hoy: Date = new Date()
): SerieRitmo {
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
    const diaHoy = hoy.getDate()
    const prefijo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`

    const gastoPorDia: number[] = new Array(diasMes + 1).fill(0)

    for (const m of contables) {
        if (
            m.tipo !== "EGRESO" ||
            m.moneda !== moneda ||
            !m.fecha.startsWith(prefijo)
        ) {
            continue
        }

        const dia = Number(m.fecha.slice(8, 10))

        if (dia >= 1 && dia <= diasMes) {
            gastoPorDia[dia] += Number(m.monto)
        }
    }

    const puntos: PuntoRitmo[] = []
    let acumulado = 0

    for (let dia = 1; dia <= diasMes; dia++) {
        if (dia <= diaHoy) {
            acumulado += gastoPorDia[dia]
        }

        puntos.push({
            dia: dia,
            acumulado: dia <= diaHoy ? acumulado : null,
            ideal: tope !== null ? (tope * dia) / diasMes : null,
        })
    }

    return {
        puntos: puntos,
        diasMes: diasMes,
        diaHoy: diaHoy,
        gastado: acumulado,
        proyeccion: (acumulado / diaHoy) * diasMes,
    }
}