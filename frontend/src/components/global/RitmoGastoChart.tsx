import { useEffect, useState } from "react"
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { type Movimiento, mesActual, nombreMes } from "../../lib/movimientos"
import { formatearMonto } from "../../lib/moneda"
import { formatoCompacto, serieRitmo } from "../../lib/graficos"
import { formatearPorcentaje } from "../../lib/resumen"
import Button from "../ui/Button"
import MontoInput from "../ui/MontoInput"
import Mensaje from "../ui/Mensaje"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

const estiloTick = {
    fontSize: 11,
    fill: "var(--color-muted-foreground)",
    fontFamily: "var(--font-mono)",
}

type RitmoGastoChartProps = {
    // movimientos contables de todas las monedas (se filtra por moneda acá)
    movimientos: Movimiento[]
    moneda: string
    // tope mensual de esta moneda (null = sin tope definido)
    tope: number | null
    onGuardarTope: (valor: number) => Promise<void>
    onQuitarTope: () => Promise<void>
}

export default function RitmoGastoChart({
    movimientos,
    moneda,
    tope,
    onGuardarTope,
    onQuitarTope,
}: RitmoGastoChartProps) {
    const [borrador, setBorrador] = useState("")
    const [editando, setEditando] = useState(false)
    const [error, setError] = useState("")

    // al cambiar de moneda se cierra el formulario
    useEffect(
        function () {
            setEditando(false)
            setError("")
        },
        [moneda]
    )

    const ritmo = serieRitmo(movimientos, moneda, tope)

    const mostrandoFormulario = tope === null || editando
    const porcentajeUsado = tope !== null ? (ritmo.gastado / tope) * 100 : null
    const superaria = tope !== null && ritmo.proyeccion > tope

    function empezarEdicion() {
        setBorrador(tope === null ? "" : String(tope))
        setError("")
        setEditando(true)
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()

        const valor = Number(borrador)

        if (!(valor > 0)) {
            setError("Ingresá un monto mayor a 0")
            return
        }

        try {
            await onGuardarTope(valor)
            setEditando(false)
            setError("")
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo guardar el tope"
            )
        }
    }

    async function quitar() {
        try {
            await onQuitarTope()
            setBorrador("")
            setEditando(false)
            setError("")
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo quitar el tope"
            )
        }
    }

    const marcas = [1, 5, 10, 15, 20, 25, ritmo.diasMes]

    return (
        <section className="p-4 sm:p-6 space-y-4" style={estiloCard}>
            <div>
                <h2
                    className="text-xs mb-1"
                    style={{
                        color: "var(--color-muted-foreground)",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    Ritmo de gasto del mes
                </h2>
                <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    {nombreMes(mesActual())}. Gasto acumulado día por día
                    frente a un ritmo parejo hacia tu tope.
                </p>
            </div>

            {/* Tope mensual */}
            {mostrandoFormulario ? (
                <form onSubmit={guardar} className="space-y-3">
                    <MontoInput
                        id="tope-mensual"
                        label={`Tope mensual de gasto (${moneda})`}
                        moneda={moneda}
                        value={borrador}
                        onChange={setBorrador}
                        placeholder="Ej. 5.000.000"
                    />

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="flex gap-2">
                        {tope !== null && (
                            <Button
                                type="button"
                                variant="secondary"
                                className="!py-1 !text-xs"
                                onClick={function () {
                                    setEditando(false)
                                    setError("")
                                }}
                            >
                                Cancelar
                            </Button>
                        )}

                        <Button type="submit" className="!py-1 !text-xs">
                            Guardar tope
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                        Tope mensual:{" "}
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                            {formatearMonto(tope ?? 0, moneda)} {moneda}
                        </span>
                    </p>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="!py-1 !text-xs"
                            onClick={empezarEdicion}
                        >
                            Cambiar
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="!py-1 !text-xs"
                            onClick={quitar}
                        >
                            Quitar
                        </Button>
                    </div>
                </div>
            )}

            {/* Solo visual: abajo hay un resumen en texto */}
            <div style={{ height: 240 }} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={ritmo.puntos}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--color-border)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="dia"
                            ticks={marcas}
                            tick={estiloTick}
                            tickLine={false}
                            axisLine={{ stroke: "var(--color-border)" }}
                        />
                        <YAxis
                            tick={estiloTick}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatoCompacto}
                            width={48}
                            domain={[0, "auto"]}
                        />
                        <Tooltip
                            labelFormatter={function (dia) {
                                return `Día ${dia}`
                            }}
                            formatter={function (valor) {
                                return `${formatearMonto(Number(valor), moneda)} ${moneda}`
                            }}
                        />

                        {tope !== null && (
                            <Line
                                dataKey="ideal"
                                name="Ritmo parejo"
                                type="linear"
                                stroke="var(--color-muted-foreground)"
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                                dot={false}
                                isAnimationActive={false}
                            />
                        )}

                        <Line
                            dataKey="acumulado"
                            name="Gastado"
                            type="monotone"
                            stroke="var(--color-expense)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Resumen en texto */}
            <div
                className="space-y-1 text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
            >
                {tope === null ? (
                    <p>
                        Llevás gastado {formatearMonto(ritmo.gastado, moneda)}{" "}
                        {moneda} este mes. Definí un tope para comparar tu
                        ritmo.
                    </p>
                ) : (
                    <>
                        <p>
                            Llevás gastado {formatearMonto(ritmo.gastado, moneda)}{" "}
                            {moneda} de {formatearMonto(tope, moneda)} {moneda}
                            {porcentajeUsado !== null
                                ? ` (${formatearPorcentaje(porcentajeUsado)})`
                                : ""}
                            , al día {ritmo.diaHoy} de {ritmo.diasMes}.
                        </p>
                        <p
                            style={{
                                color: superaria
                                    ? "var(--color-expense)"
                                    : "var(--color-income)",
                            }}
                        >
                            A este ritmo cerrarías el mes en{" "}
                            {formatearMonto(ritmo.proyeccion, moneda)} {moneda}
                            {superaria
                                ? ", por encima del tope."
                                : ", dentro del tope."}
                        </p>
                    </>
                )}
            </div>
        </section>
    )
}