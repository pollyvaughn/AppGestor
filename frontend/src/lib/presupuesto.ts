// Reglas de la alerta de tope mensual de gasto.
//
// Es lógica pura (solo números): no importa nada de la app, así se puede
// probar con `node --test` sin compilar. Quien sabe de movimientos y meses
// es el componente (serieRitmo en lib/graficos.ts).
//
// Reglas (mes calendario, solo egresos, una moneda a la vez):
//   1. superado:   lo gastado pasó el 100% del tope
//   2. aviso:      lo gastado llegó al 80% (y todavía no pasó el tope)
//   3. proyeccion: a este ritmo se pasaría a fin de mes
// Si se cumplen varias, gana la más grave. Sin tope definido, no hay alerta.

export const UMBRAL_AVISO = 80

// Los primeros días del mes la proyección da números exagerados (un alquiler
// pagado el día 1 se multiplicaría por 30). Antes de este día no se avisa.
export const DIA_MINIMO_PROYECCION = 5

export type NivelTope = "ok" | "proyeccion" | "aviso" | "superado"

export type EstadoTope = {
    nivel: NivelTope
    gastado: number
    tope: number
    porcentaje: number
    // gasto estimado a fin de mes si se sigue al mismo ritmo diario
    proyeccion: number
    // cuánto se pasó del tope (0 si no se pasó)
    exceso: number
}

export function evaluarTope(
    gastado: number,
    tope: number | null,
    diaHoy: number,
    diasMes: number
): EstadoTope | null {
    if (tope === null || !(tope > 0)) {
        return null
    }

    const porcentaje = (gastado / tope) * 100
    const proyeccion = diaHoy > 0 ? (gastado / diaHoy) * diasMes : gastado

    let nivel: NivelTope = "ok"

    if (gastado > tope) {
        nivel = "superado"
    } else if (porcentaje >= UMBRAL_AVISO) {
        nivel = "aviso"
    } else if (diaHoy >= DIA_MINIMO_PROYECCION && proyeccion > tope) {
        nivel = "proyeccion"
    }

    return {
        nivel,
        gastado,
        tope,
        porcentaje,
        proyeccion,
        exceso: Math.max(gastado - tope, 0),
    }
}