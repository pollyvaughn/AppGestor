import { useState } from "react"
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { formatearMonto } from "../../lib/moneda"
import { type PuntoMensual, formatoCompacto } from "../../lib/graficos"
import { type Periodo, fechaCorta } from "../../lib/periodo"
import Button from "../ui/Button"
import EstadoVacio from "../ui/EstadoVacio"

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

type Modo = "MES" | "DIA"

const OPCIONES: { key: Modo; label: string }[] = [
    { key: "MES", label: "Por mes" },
    { key: "DIA", label: "Por día" },
]

type TooltipEvolucionProps = {
    active?: boolean
    payload?: ReadonlyArray<{ payload: PuntoMensual }>
    moneda: string
}

// recharts le inyecta active y payload al renderizarlo
function TooltipEvolucion({ active, payload, moneda }: TooltipEvolucionProps) {
    if (!active || !payload || payload.length === 0) {
        return null
    }

    const punto = payload[0].payload

    return (
        <div
            className="p-3 space-y-1 text-xs"
            style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
            }}
        >
            <p className="font-medium">{punto.etiqueta}</p>
            <p style={{ color: "var(--color-income)" }}>
                Ingresos: {formatearMonto(punto.ingresos, moneda)} {moneda}
            </p>
            <p style={{ color: "var(--color-expense)" }}>
                Gastos: {formatearMonto(punto.gastos, moneda)} {moneda}
            </p>
            <p
                style={{
                    color:
                        punto.margen >= 0
                            ? "var(--color-income)"
                            : "var(--color-expense)",
                }}
            >
                Margen: {punto.margen >= 0 ? "+" : "−"}
                {formatearMonto(Math.abs(punto.margen), moneda)} {moneda}
            </p>
        </div>
    )
}

type EvolucionChartProps = {
    // últimos 12 meses con datos
    datos: PuntoMensual[]
    // un punto por día del periodo elegido
    datosDiarios: PuntoMensual[]
    periodo: Periodo
    moneda: string
}

export default function EvolucionChart({
    datos,
    datosDiarios,
    periodo,
    moneda,
}: EvolucionChartProps) {
    const [modo, setModo] = useState<Modo>("MES")

    const esDia = modo === "DIA"
    const puntos = esDia ? datosDiarios : datos

    const sinDatos = esDia
        ? datosDiarios.every(function (p) {
              return p.ingresos === 0 && p.gastos === 0
          })
        : datos.length === 0

    // día de mayor gasto: también sirve como texto para quien no ve el gráfico
    const diaMayorGasto = datosDiarios.reduce(function (mayor, p) {
        return p.gastos > mayor.gastos ? p : mayor
    }, datosDiarios[0] ?? { etiqueta: "", gastos: 0 })

    // con muchos días los puntos tapan la línea
    const mostrarPuntos = puntos.length <= 31

    return (
        <section className="p-4 sm:p-6" style={estiloCard}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h2
                    className="text-xs"
                    style={{
                        color: "var(--color-muted-foreground)",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    {esDia
                        ? "Ingresos y gastos por día"
                        : "Ingresos y gastos por mes"}
                </h2>

                <div
                    role="group"
                    aria-label="Agrupar por"
                    className="flex gap-2"
                >
                    {OPCIONES.map(function (opcion) {
                        const activo = opcion.key === modo

                        return (
                            <Button
                                key={opcion.key}
                                type="button"
                                variant={activo ? "primary" : "secondary"}
                                aria-pressed={activo}
                                className="!py-1 !text-xs"
                                onClick={function () {
                                    setModo(opcion.key)
                                }}
                            >
                                {opcion.label}
                            </Button>
                        )
                    })}
                </div>
            </div>

            <p
                className="text-xs mb-5"
                style={{ color: "var(--color-muted-foreground)" }}
            >
                {esDia
                    ? `Del ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}, día por día. Sigue el periodo elegido arriba.`
                    : "Últimos 12 meses con datos; no depende del periodo elegido. El sombreado es el margen de cada mes."}
            </p>

            {sinDatos ? (
                <EstadoVacio
                    texto={
                        esDia
                            ? "Sin ingresos ni gastos en este periodo."
                            : "Todavía no hay ingresos ni gastos en esta moneda."
                    }
                />
            ) : (
                <>
                    {/* Solo visual: los datos mensuales están en "Ver datos en tabla" */}
                    <div style={{ height: 260 }} aria-hidden="true">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={puntos}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    stroke="var(--color-border)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="etiqueta"
                                    tick={estiloTick}
                                    tickLine={false}
                                    axisLine={{ stroke: "var(--color-border)" }}
                                    interval = {esDia ? "preserveStartEnd" : "preserveEnd"}
                                    minTickGap={esDia ? 24 : 5}
                                />
                                <YAxis
                                    tick={estiloTick}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatoCompacto}
                                    width={48}
                                />
                                <Tooltip
                                    content={<TooltipEvolucion moneda={moneda} />}
                                />

                                <Area
                                    dataKey="superavit"
                                    type="monotone"
                                    stroke="none"
                                    fill="var(--color-income)"
                                    fillOpacity={0.18}
                                    tooltipType="none"
                                    isAnimationActive={false}
                                />
                                <Area
                                    dataKey="deficit"
                                    type="monotone"
                                    stroke="none"
                                    fill="var(--color-expense)"
                                    fillOpacity={0.18}
                                    tooltipType="none"
                                    isAnimationActive={false}
                                />

                                <Line
                                    dataKey="ingresos"
                                    name="Ingresos"
                                    type="monotone"
                                    stroke="var(--color-income)"
                                    strokeWidth={2}
                                    dot={mostrarPuntos ? { r: 3 } : false}
                                    isAnimationActive={false}
                                />
                                <Line
                                    dataKey="gastos"
                                    name="Gastos"
                                    type="monotone"
                                    stroke="var(--color-expense)"
                                    strokeWidth={2}
                                    dot={mostrarPuntos ? { r: 3 } : false}
                                    isAnimationActive={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {esDia && diaMayorGasto.gastos > 0 && (
                        <p
                            className="text-xs mt-3"
                            style={{
                                color: "var(--color-muted-foreground)",
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            Día de mayor gasto: {diaMayorGasto.etiqueta} ·{" "}
                            {formatearMonto(diaMayorGasto.gastos, moneda)}{" "}
                            {moneda}
                        </p>
                    )}

                    <div
                        className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        <span className="flex items-center gap-1.5">
                            <span
                                className="w-3 h-0.5"
                                style={{ background: "var(--color-income)" }}
                            />
                            Ingresos
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span
                                className="w-3 h-0.5"
                                style={{ background: "var(--color-expense)" }}
                            />
                            Gastos
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span
                                className="w-3 h-2 rounded"
                                style={{
                                    background: "var(--color-income)",
                                    opacity: 0.35,
                                }}
                            />
                            Sobra plata
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span
                                className="w-3 h-2 rounded"
                                style={{
                                    background: "var(--color-expense)",
                                    opacity: 0.35,
                                }}
                            />
                            Falta plata
                        </span>
                    </div>
                </>
            )}
        </section>
    )
}