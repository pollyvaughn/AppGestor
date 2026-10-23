import { type Movimiento } from "../../lib/movimientos"
import { serieRitmo } from "../../lib/graficos"
import { formatearMonto } from "../../lib/moneda"
import { formatearPorcentaje } from "../../lib/resumen"
import { evaluarTope } from "../../lib/presupuesto"
import Mensaje from "../ui/Mensaje"

type AlertaTopeProps = {
    // movimientos contables (ingresos y egresos confirmados) de todas las monedas
    movimientos: Movimiento[]
    moneda: string
    // tope mensual de esta moneda (null = sin tope definido: no hay alerta)
    tope: number | null
}

export default function AlertaTope({
    movimientos,
    moneda,
    tope,
}: AlertaTopeProps) {
    if (tope === null) {
        return null
    }

    const ritmo = serieRitmo(movimientos, moneda, tope)
    const estado = evaluarTope(
        ritmo.gastado,
        tope,
        ritmo.diaHoy,
        ritmo.diasMes
    )

    if (estado === null || estado.nivel === "ok") {
        return null
    }

    const gastado = `${formatearMonto(estado.gastado, moneda)} ${moneda}`
    const limite = `${formatearMonto(estado.tope, moneda)} ${moneda}`

    if (estado.nivel === "superado") {
        return (
            <Mensaje tipo="error">
                Superaste tu tope mensual: llevás gastado {gastado} de {limite}{" "}
                ({formatearPorcentaje(estado.porcentaje)}), es decir{" "}
                {formatearMonto(estado.exceso, moneda)} {moneda} de más.
            </Mensaje>
        )
    }

    // Aviso y proyección: importan, pero todavía no es un error.
    // Mensaje solo tiene "error" y "exito", así que va con estilo propio.
    const texto =
        estado.nivel === "aviso"
            ? `Ya usaste el ${formatearPorcentaje(estado.porcentaje)} de tu tope mensual: ${gastado} de ${limite}.`
            : `A este ritmo cerrarías el mes en ${formatearMonto(estado.proyeccion, moneda)} ${moneda}, por encima de tu tope de ${limite}.`

    return (
        <p
            role="status"
            className="text-sm px-3 py-2"
            style={{
                color: "var(--color-foreground)",
                background: "var(--color-muted)",
                borderLeft: "3px solid var(--color-accent)",
                borderRadius: "var(--radius-sm)",
            }}
        >
            {texto}
        </p>
    )
}