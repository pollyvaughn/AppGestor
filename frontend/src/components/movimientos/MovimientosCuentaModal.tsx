import { useEffect, useState } from "react"
import { listarMovimientos } from "../../services/movimientoService"
import type { Movimiento } from "../../lib/movimientos"
import { formatearMonto } from "../../lib/moneda"
import { fechaCorta } from "../../lib/tarjetas"
import Modal from "../ui/Modal"
import Button from "../ui/Button"
import Cargando from "../ui/Cargando"
import EstadoVacio from "../ui/EstadoVacio"
import Mensaje from "../ui/Mensaje"

type CuentaMovimientos = {
    id: number
    nombre: string
    moneda: string
}

type MovimientosCuentaModalProps = {
    // null = cerrado
    cuenta: CuentaMovimientos | null
    onClose: () => void
}

const ETIQUETA_TIPO: Record<string, string> = {
    TRANSFERENCIA: "Transferencia",
    PAGO_TARJETA: "Pago de tarjeta",
    AJUSTE: "Ajuste de saldo",
    SALDO_INICIAL: "Saldo inicial",
}

export default function MovimientosCuentaModal({
    cuenta,
    onClose,
}: MovimientosCuentaModalProps) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState("")

    useEffect(
        function () {
            if (cuenta === null) {
                return
            }

            const cuentaId = cuenta.id
            let activo = true

            setError("")
            setMovimientos([])
            setCargando(true)

            listarMovimientos()
                .then(function (lista) {
                    if (!activo) {
                        return
                    }

                    // origen o destino de la cuenta, sin los anulados
                    setMovimientos(
                        lista.filter(function (m) {
                            return (
                                m.estado !== "ANULADO" &&
                                (m.metodo_pago_id === cuentaId ||
                                    m.metodo_pago_destino_id === cuentaId)
                            )
                        })
                    )
                })
                .catch(function (e) {
                    if (activo) {
                        setError(
                            e instanceof Error
                                ? e.message
                                : "No se pudieron cargar los movimientos"
                        )
                    }
                })
                .finally(function () {
                    if (activo) {
                        setCargando(false)
                    }
                })

            return function () {
                activo = false
            }
        },
        [cuenta]
    )

    if (cuenta === null) {
        return null
    }

    const cuentaId = cuenta.id

    // + si entra plata a la cuenta, − si sale
    function efecto(m: Movimiento) {
        const monto = Number(m.monto)

        if (m.tipo === "TRANSFERENCIA") {
            return m.metodo_pago_destino_id === cuentaId ? monto : -monto
        }

        if (m.tipo === "EGRESO") {
            return -monto
        }

        // ingreso, saldo inicial y ajuste (el ajuste ya trae su signo)
        return monto
    }

    return (
        <Modal
            open={true}
            wide
            title={`Movimientos de ${cuenta.nombre}`}
            onClose={onClose}
        >
            <div className="space-y-4">
                {error && <Mensaje tipo="error">{error}</Mensaje>}

                {cargando && <Cargando texto="Cargando movimientos..." />}

                {!cargando && !error && movimientos.length === 0 && (
                    <EstadoVacio texto="Esta cuenta todavía no tiene movimientos." />
                )}

                <ul>
                    {movimientos.map(function (m) {
                        const valor = efecto(m)
                        const titulo =
                            m.descripcion ||
                            m.categoria ||
                            ETIQUETA_TIPO[m.tipo] ||
                            m.tipo

                        return (
                            <li
                                key={m.id}
                                className="flex items-center justify-between gap-3 py-2.5"
                                style={{
                                    borderBottom:
                                        "1px solid var(--color-border)",
                                }}
                            >
                                <div className="min-w-0">
                                    <p className="text-sm truncate">{titulo}</p>
                                    <p
                                        className="text-xs"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        {fechaCorta(m.fecha)}
                                        {ETIQUETA_TIPO[m.tipo]
                                            ? ` · ${ETIQUETA_TIPO[m.tipo]}`
                                            : ""}
                                        {m.tipo === "TRANSFERENCIA" &&
                                        m.metodo_pago &&
                                        m.metodo_pago_destino
                                            ? ` · ${m.metodo_pago} → ${m.metodo_pago_destino}`
                                            : ""}
                                    </p>
                                </div>

                                <span
                                    className="text-sm shrink-0"
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        color:
                                            valor >= 0
                                                ? "var(--color-income)"
                                                : "var(--color-expense)",
                                    }}
                                >
                                    {valor >= 0 ? "+" : "−"}
                                    {formatearMonto(
                                        Math.abs(valor),
                                        cuenta.moneda
                                    )}{" "}
                                    {cuenta.moneda}
                                </span>
                            </li>
                        )
                    })}
                </ul>

                <Button type="button" variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
            </div>
        </Modal>
    )
}