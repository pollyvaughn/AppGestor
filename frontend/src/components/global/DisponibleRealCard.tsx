import { formatearMonto } from "../../lib/moneda"
import { type Compromiso, DIAS_APARTADO } from "../../lib/apartado"
import { fechaCorta } from "../../lib/periodo"
import EstadoVacio from "../ui/EstadoVacio"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

const estiloTitulo = {
    color: "var(--color-muted-foreground)",
    fontFamily: "var(--font-mono)",
}

type DisponibleRealCardProps = {
    liquidez: number
    apartado: number
    // compromisos de la moneda elegida
    compromisos: Compromiso[]
    moneda: string
}

export default function DisponibleRealCard({
    liquidez,
    apartado,
    compromisos,
    moneda,
}: DisponibleRealCardProps) {
    const disponible = liquidez - apartado

    return (
        <section className="p-4 sm:p-6 space-y-4" style={estiloCard}>
            <div>
                <h2 className="text-xs mb-1" style={estiloTitulo}>
                    Disponible real
                </h2>
                <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    Lo que te queda libre después de separar lo que ya está
                    comprometido: resúmenes de tarjeta y recurrentes que
                    vencen en los próximos {DIAS_APARTADO} días.
                </p>
            </div>

            <p
                className="text-3xl font-light break-words"
                style={{
                    fontFamily: "var(--font-mono)",
                    color:
                        disponible >= 0
                            ? "var(--color-income)"
                            : "var(--color-expense)",
                }}
            >
                {disponible < 0 ? "−" : ""}
                {formatearMonto(Math.abs(disponible), moneda)}{" "}
                <span className="text-sm">{moneda}</span>
            </p>

            <dl
                className="space-y-1 text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
            >
                <div className="flex justify-between gap-3">
                    <dt style={{ color: "var(--color-muted-foreground)" }}>
                        Liquidez real
                    </dt>
                    <dd>
                        {liquidez < 0 ? "−" : ""}
                        {formatearMonto(Math.abs(liquidez), moneda)} {moneda}
                    </dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt style={{ color: "var(--color-muted-foreground)" }}>
                        Apartado
                    </dt>
                    <dd style={{ color: "var(--color-expense)" }}>
                        −{formatearMonto(apartado, moneda)} {moneda}
                    </dd>
                </div>
            </dl>

            <details className="text-sm">
                <summary className="cursor-pointer min-h-11 md:min-h-0 flex items-center">
                    Ver qué se aparta ({compromisos.length})
                </summary>

                {compromisos.length === 0 ? (
                    <EstadoVacio
                        texto={`No hay compromisos en los próximos ${DIAS_APARTADO} días.`}
                    />
                ) : (
                    <ul className="mt-2">
                        {compromisos.map(function (c, indice) {
                            return (
                                <li
                                    key={`${c.origen}-${indice}`}
                                    className="flex items-center justify-between gap-3 py-2"
                                    style={{
                                        borderTop:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm truncate">
                                            {c.nombre}
                                        </p>
                                        <p
                                            className="text-xs"
                                            style={{
                                                color: c.vencido
                                                    ? "var(--color-expense)"
                                                    : "var(--color-muted-foreground)",
                                            }}
                                        >
                                            {c.vencido ? "Vencido el " : "Vence "}
                                            {fechaCorta(c.fecha)}
                                        </p>
                                    </div>

                                    <span
                                        className="text-xs shrink-0"
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                        }}
                                    >
                                        {formatearMonto(c.monto, moneda)}{" "}
                                        {moneda}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </details>
        </section>
    )
}