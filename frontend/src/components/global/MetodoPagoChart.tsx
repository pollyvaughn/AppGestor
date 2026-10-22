import { formatearMonto } from "../../lib/moneda"
import { type PorcionMetodo } from "../../lib/graficos"
import { formatearPorcentaje } from "../../lib/resumen"
import EstadoVacio from "../ui/EstadoVacio"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

const ETIQUETA_TIPO: Record<string, string> = {
    EFECTIVO: "Efectivo",
    BILLETERA: "Billetera",
    CUENTA_BANCARIA: "Cuenta bancaria",
    TARJETA_CREDITO: "Tarjeta de crédito",
}

type MetodoPagoChartProps = {
    porciones: PorcionMetodo[]
    total: number
    moneda: string
}

export default function MetodoPagoChart({
    porciones,
    total,
    moneda,
}: MetodoPagoChartProps) {
    return (
        <section className="p-4 sm:p-6" style={estiloCard}>
            <h2
                className="text-xs mb-1"
                style={{
                    color: "var(--color-muted-foreground)",
                    fontFamily: "var(--font-mono)",
                }}
            >
                Gastos por método de pago
            </h2>
            <p
                className="text-xs mb-5"
                style={{ color: "var(--color-muted-foreground)" }}
            >
                Con qué cuenta o tarjeta pagaste en el periodo elegido. Las
                compras con tarjeta cuentan el día de la compra.
            </p>

            {porciones.length === 0 ? (
                <EstadoVacio texto="Sin gastos en este periodo." />
            ) : (
                <>
                    <ul className="space-y-4">
                        {porciones.map(function (porcion) {
                            const etiqueta =
                                porcion.tipo !== null
                                    ? ETIQUETA_TIPO[porcion.tipo]
                                    : undefined

                            return (
                                <li key={porcion.clave} className="space-y-1.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ background: porcion.fill }}
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm truncate">
                                                    {porcion.nombre}
                                                </p>
                                                <p
                                                    className="text-xs"
                                                    style={{
                                                        color: "var(--color-muted-foreground)",
                                                    }}
                                                >
                                                    {etiqueta ? `${etiqueta} · ` : ""}
                                                    {porcion.cantidad === 1
                                                        ? "1 operación"
                                                        : `${porcion.cantidad} operaciones`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p
                                                className="text-sm"
                                                style={{ fontFamily: "var(--font-mono)" }}
                                            >
                                                {formatearMonto(porcion.total, moneda)}{" "}
                                                {moneda}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{
                                                    color: "var(--color-muted-foreground)",
                                                    fontFamily: "var(--font-mono)",
                                                }}
                                            >
                                                {formatearPorcentaje(porcion.porcentaje)}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="h-1.5 w-full rounded-full"
                                        style={{ background: "var(--color-muted)" }}
                                        aria-hidden="true"
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${porcion.porcentaje}%`,
                                                background: porcion.fill,
                                            }}
                                        />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>

                    <p
                        className="text-xs mt-5 pt-3"
                        style={{
                            color: "var(--color-muted-foreground)",
                            borderTop: "1px solid var(--color-border)",
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        Total: {formatearMonto(total, moneda)} {moneda}
                    </p>
                </>
            )}
        </section>
    )
}