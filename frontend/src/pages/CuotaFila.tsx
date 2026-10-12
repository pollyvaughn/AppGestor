import Button from "../components/ui/Button"
import { formatearMonto } from "../lib/moneda"
import {
    type Cuota,
    type Pago,
    ETIQUETA_ESTADO,
    colorEstado,
    fechaCorta,
    periodoCorto,
} from "./utilTarjetas"

type CuotaFilaProps = {
    cuota: Cuota
    moneda: string
    pagos: Pago[]
    puedePagar: boolean
    // hay una cuota siguiente que pueda recibir el saldo arrastrado
    tieneSiguiente: boolean
    onPagar: () => void
    onEditarPago: (pago: Pago) => void
    onAnularPago: (pago: Pago) => void
    onAjustes: () => void
    onOmitir: () => void
}

export default function CuotaFila({
    cuota,
    moneda,
    pagos,
    puedePagar,
    tieneSiguiente,
    onPagar,
    onEditarPago,
    onAnularPago,
    onAjustes,
    onOmitir,
}: CuotaFilaProps) {
    const debePlata = cuota.estado === "PENDIENTE" || cuota.estado === "PARCIAL"
    const cerrada = cuota.estado === "OMITIDA" || cuota.estado === "ANULADA"

    const tienePagosConfirmados = pagos.some(function (p) {
        return p.estado === "CONFIRMADO"
    })

    // el backend no deja omitir si ya hay pagos o no hay cuota siguiente
    const puedeOmitir = debePlata && !tienePagosConfirmados && tieneSiguiente

    return (
        <div
            className="py-3 space-y-2"
            style={{ borderBottom: "1px solid var(--color-border)" }}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm">
                        Cuota {cuota.numero}
                        <span
                            className="ml-2 text-xs"
                            style={{ color: colorEstado(cuota.estado) }}
                        >
                            {ETIQUETA_ESTADO[cuota.estado] ?? cuota.estado}
                        </span>
                    </p>

                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Período {periodoCorto(cuota.periodo)} · Vence{" "}
                        {fechaCorta(cuota.fecha_vencimiento)}
                    </p>
                </div>

                <div className="text-right">
                    <p
                        className="text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                        {formatearMonto(cuota.monto_base, moneda)}
                    </p>

                    <p
                        className="text-xs"
                        style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-muted-foreground)",
                        }}
                    >
                        Pendiente {formatearMonto(cuota.monto_pendiente, moneda)}
                    </p>
                </div>
            </div>

            {/* Pagos de esta cuota */}
            {pagos.map(function (pago) {
                const anulado = pago.estado === "ANULADO"

                return (
                    <div
                        key={pago.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        style={{
                            background: "var(--color-muted)",
                            borderRadius: "var(--radius-sm)",
                            opacity: anulado ? 0.6 : 1,
                        }}
                    >
                        <div className="min-w-0">
                            <p
                                className="text-xs"
                                style={{
                                    fontFamily: "var(--font-mono)",
                                    textDecoration: anulado
                                        ? "line-through"
                                        : "none",
                                }}
                            >
                                Pago {fechaCorta(pago.fecha)} ·{" "}
                                {formatearMonto(pago.monto, moneda)} {moneda}
                                {anulado ? " (anulado)" : ""}
                            </p>

                            <p
                                className="text-xs"
                                style={{
                                    color: "var(--color-muted-foreground)",
                                }}
                            >
                                {pago.metodos
                                    .map(function (m) {
                                        return `${m.nombre}: ${formatearMonto(m.monto, moneda)}`
                                    })
                                    .join(" · ")}
                            </p>
                        </div>

                        {pago.estado === "CONFIRMADO" && !cerrada && (
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    aria-label={`Editar pago de la cuota ${cuota.numero}`}
                                    onClick={function () {
                                        onEditarPago(pago)
                                    }}
                                >
                                    Editar
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    aria-label={`Anular pago de la cuota ${cuota.numero}`}
                                    onClick={function () {
                                        onAnularPago(pago)
                                    }}
                                >
                                    Anular
                                </Button>
                            </div>
                        )}
                    </div>
                )
            })}

            <div className="flex flex-wrap gap-2">
                {puedePagar && (
                    <Button
                        type="button"
                        className="!py-1 !text-xs"
                        aria-label={`Pagar cuota ${cuota.numero}`}
                        onClick={onPagar}
                    >
                        Pagar cuota
                    </Button>
                )}

                {cuota.estado !== "ANULADA" && (
                    <Button
                        type="button"
                        variant="secondary"
                        className="!py-1 !text-xs"
                        aria-label={`Ajustes de la cuota ${cuota.numero}`}
                        onClick={onAjustes}
                    >
                        Ajustes
                    </Button>
                )}

                {puedeOmitir && (
                    <Button
                        type="button"
                        variant="secondary"
                        className="!py-1 !text-xs"
                        aria-label={`Omitir cuota ${cuota.numero}`}
                        onClick={onOmitir}
                    >
                        Omitir cuota
                    </Button>
                )}
            </div>

            {debePlata && !puedePagar && (
                <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    Primero hay que pagar las cuotas anteriores.
                </p>
            )}
        </div>
    )
}