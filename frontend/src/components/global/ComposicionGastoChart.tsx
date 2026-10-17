import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatearMonto } from "../../lib/moneda"
import { type PorcionGasto } from "../../lib/graficos"
import { formatearPorcentaje } from "../../lib/resumen"
import EstadoVacio from "../ui/EstadoVacio"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

type ComposicionGastoChartProps = {
    porciones: PorcionGasto[]
    total: number
    moneda: string
}

export default function ComposicionGastoChart({
    porciones,
    total,
    moneda,
}: ComposicionGastoChartProps) {
    return (
        <section className="p-4 sm:p-6" style={estiloCard}>
            <h2
                className="text-xs mb-5"
                style={{
                    color: "var(--color-muted-foreground)",
                    fontFamily: "var(--font-mono)",
                }}
            >
                Composición del gasto
            </h2>

            {porciones.length === 0 ? (
                <EstadoVacio texto="Sin gastos en este periodo." />
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 items-center">
                    <div className="relative" style={{ height: 220 }}>
                        {/* Solo visual: la lista de al lado tiene los mismos datos */}
                        <div style={{ height: "100%" }} aria-hidden="true">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        formatter={function (valor) {
                                            return `${formatearMonto(Number(valor), moneda)} ${moneda}`
                                        }}
                                    />
                                    <Pie
                                        data={porciones}
                                        dataKey="total"
                                        nameKey="nombre"
                                        innerRadius="62%"
                                        outerRadius="92%"
                                        paddingAngle={2}
                                        stroke="none"
                                        isAnimationActive={false}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span
                                className="text-xs"
                                style={{ color: "var(--color-muted-foreground)" }}
                            >
                                Total
                            </span>
                            <span
                                className="text-sm"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                {formatearMonto(total, moneda)}
                            </span>
                        </div>
                    </div>

                    <ul className="space-y-2">
                        {porciones.map(function (porcion) {
                            return (
                                <li
                                    key={porcion.clave}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ background: porcion.fill }}
                                            aria-hidden="true"
                                        />
                                        <span className="text-sm truncate">
                                            {porcion.nombre}
                                        </span>
                                    </span>

                                    <span className="text-right shrink-0">
                                        <span
                                            className="block text-sm"
                                            style={{ fontFamily: "var(--font-mono)" }}
                                        >
                                            {formatearPorcentaje(porcion.porcentaje)}
                                        </span>
                                        <span
                                            className="block text-xs"
                                            style={{
                                                color: "var(--color-muted-foreground)",
                                                fontFamily: "var(--font-mono)",
                                            }}
                                        >
                                            {formatearMonto(porcion.total, moneda)}{" "}
                                            {moneda}
                                        </span>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </section>
    )
}