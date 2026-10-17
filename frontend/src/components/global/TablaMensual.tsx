import { formatearMonto } from "../../lib/moneda"
import { type PuntoMensual } from "../../lib/graficos"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

type TablaMensualProps = {
    datos: PuntoMensual[]
    moneda: string
}

export default function TablaMensual({ datos, moneda }: TablaMensualProps) {
    if (datos.length === 0) {
        return null
    }

    return (
        <section className="p-4 sm:p-6" style={estiloCard}>
            <details className="text-sm">
                <summary className="cursor-pointer min-h-11 md:min-h-0 flex items-center">
                    Ver datos en tabla
                </summary>

                <div className="overflow-x-auto">
                    <table className="w-full mt-2 text-xs">
                        <caption className="sr-only">
                            Ingresos, gastos y margen por mes en {moneda}
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col" className="text-left py-1">
                                    Mes
                                </th>
                                <th scope="col" className="text-right py-1">
                                    Ingresos
                                </th>
                                <th scope="col" className="text-right py-1">
                                    Gastos
                                </th>
                                <th scope="col" className="text-right py-1">
                                    Margen
                                </th>
                            </tr>
                        </thead>
                        <tbody style={{ fontFamily: "var(--font-mono)" }}>
                            {datos.map(function (punto) {
                                return (
                                    <tr
                                        key={punto.mes}
                                        style={{
                                            borderTop:
                                                "1px solid var(--color-border)",
                                        }}
                                    >
                                        <th
                                            scope="row"
                                            className="text-left font-normal py-1.5"
                                        >
                                            {punto.etiqueta}
                                        </th>
                                        <td
                                            className="text-right py-1.5"
                                            style={{ color: "var(--color-income)" }}
                                        >
                                            {formatearMonto(punto.ingresos, moneda)}
                                        </td>
                                        <td
                                            className="text-right py-1.5"
                                            style={{ color: "var(--color-expense)" }}
                                        >
                                            {formatearMonto(punto.gastos, moneda)}
                                        </td>
                                        <td
                                            className="text-right py-1.5"
                                            style={{
                                                color:
                                                    punto.margen >= 0
                                                        ? "var(--color-income)"
                                                        : "var(--color-expense)",
                                            }}
                                        >
                                            {punto.margen >= 0 ? "+" : "−"}
                                            {formatearMonto(
                                                Math.abs(punto.margen),
                                                moneda
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </details>
        </section>
    )
}