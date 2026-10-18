import { useEffect, useState } from "react"
import { pagarResumen } from "../services/resumenService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import { fechaHoy } from "../lib/fechas"
import { type Cuenta, type Resumen, periodoCorto } from "./utilTarjetas"

type PagoResumenModalProps = {
    tarjetaId: number | null
    resumen: Resumen | null
    moneda: string
    cuentas: Cuenta[]
    onClose: () => void
    onGuardado: () => void
}

function redondear(valor: number) {
    return Math.round(valor * 100) / 100
}

export default function PagoResumenModal({
    tarjetaId,
    resumen,
    moneda,
    cuentas,
    onClose,
    onGuardado,
}: PagoResumenModalProps) {
    const [monto, setMonto] = useState("")
    const [cuenta1, setCuenta1] = useState("")
    const [monto1, setMonto1] = useState("")
    const [dividir, setDividir] = useState(false)
    const [cuenta2, setCuenta2] = useState("")
    const [fecha, setFecha] = useState(fechaHoy())
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)

    useEffect(
        function () {
            if (resumen === null) {
                return
            }

            setMonto(String(Number(resumen.total_pendiente)))
            setCuenta1("")
            setMonto1("")
            setDividir(false)
            setCuenta2("")
            setFecha(fechaHoy())
            setError("")
            setGuardando(false)
        },
        [resumen]
    )

    if (resumen === null || tarjetaId === null) {
        return null
    }

    const cuentasUsables = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO" && c.moneda === moneda
    })

    const total = Number(monto || 0)
    const parte1 = dividir ? Number(monto1 || 0) : total
    const parte2 = dividir ? redondear(total - parte1) : 0
    const maximo = redondear(Number(resumen.total_pendiente))

    // efectivo y billetera no pueden quedar en negativo (regla del backend)
    function validarSaldo(cuentaId: string, montoAPagar: number) {
        const cuenta = cuentasUsables.find(function (c) {
            return String(c.id) === cuentaId
        })

        if (!cuenta) {
            return ""
        }

        const controla = cuenta.tipo === "EFECTIVO" || cuenta.tipo === "BILLETERA"

        if (controla && Number(cuenta.saldo) < montoAPagar) {
            return `Saldo insuficiente en ${cuenta.nombre}`
        }

        return ""
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (resumen === null || tarjetaId === null) {
            return
        }

        if (total <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        if (redondear(total) > maximo) {
            setError(
                `El monto no puede superar ${formatearMonto(maximo, moneda)} ${moneda}`
            )
            return
        }

        if (!fecha || fecha > fechaHoy()) {
            setError("Elegí una fecha válida (no puede ser futura)")
            return
        }

        if (!cuenta1) {
            setError("Elegí con qué cuenta pagás")
            return
        }

        if (parte1 <= 0) {
            setError("El monto de la primera cuenta debe ser mayor a 0")
            return
        }

        if (dividir) {
            if (!cuenta2) {
                setError("Elegí la segunda cuenta")
                return
            }

            if (cuenta1 === cuenta2) {
                setError("Las dos cuentas deben ser distintas")
                return
            }

            if (parte2 <= 0) {
                setError("La primera cuenta no puede cubrir todo el monto")
                return
            }
        }

        const errorSaldo1 = validarSaldo(cuenta1, parte1)

        if (errorSaldo1) {
            setError(errorSaldo1)
            return
        }

        if (dividir) {
            const errorSaldo2 = validarSaldo(cuenta2, parte2)

            if (errorSaldo2) {
                setError(errorSaldo2)
                return
            }
        }

        const metodos = [
            { metodo_pago_id: Number(cuenta1), monto: redondear(parte1) },
        ]

        if (dividir) {
            metodos.push({ metodo_pago_id: Number(cuenta2), monto: parte2 })
        }

        setGuardando(true)

        try {
            await pagarResumen(
                tarjetaId,
                resumen.periodo,
                redondear(total),
                metodos,
                fecha
            )

            onGuardado()
            onClose()
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo pagar el resumen"
            )
        } finally {
            setGuardando(false)
        }
    }

    function textoCuenta(c: Cuenta) {
        return `${c.nombre} — saldo ${formatearMonto(Number(c.saldo), moneda)}`
    }

    return (
        <Modal
            open={true}
            title={`Pagar resumen ${periodoCorto(resumen.periodo)}`}
            onClose={onClose}
        >
            {cuentasUsables.length === 0 ? (
                <div className="space-y-4">
                    <EstadoVacio
                        texto={`No tenés cuentas en ${moneda}. Creá una en la pestaña Cuentas.`}
                    />

                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            ) : (
                <form onSubmit={guardar} className="space-y-4">
                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Pendiente del resumen:{" "}
                        {formatearMonto(resumen.total_pendiente, moneda)} {moneda}
                        {resumen.pago_minimo !== null &&
                            ` · Pago mínimo de referencia: ${formatearMonto(resumen.pago_minimo, moneda)} ${moneda}`}
                    </p>

                    <p
                        className="text-xs p-3"
                        style={{
                            color: "var(--color-muted-foreground)",
                            background: "var(--color-muted)",
                            borderRadius: "var(--radius-sm)",
                        }}
                    >
                        El pago se reparte entre las cuotas del resumen, de la
                        compra más antigua a la más nueva. Si pagás menos del
                        total, la última cuota alcanzada queda con pago parcial.
                    </p>

                    <MontoInput
                        id="monto-resumen"
                        label={`Monto a pagar (${moneda})`}
                        moneda={moneda}
                        value={monto}
                        onChange={setMonto}
                        required
                    />

                    <Input
                        id="fecha-resumen"
                        label="Fecha del pago"
                        type="date"
                        max={fechaHoy()}
                        value={fecha}
                        onChange={function (e) {
                            setFecha(e.target.value)
                        }}
                        required
                    />

                    <Select
                        id="cuenta1-resumen"
                        label="Cuenta desde la que sale el dinero"
                        value={cuenta1}
                        onChange={function (e) {
                            setCuenta1(e.target.value)
                        }}
                        required
                    >
                        <option value="">Elegí una cuenta</option>
                        {cuentasUsables.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {textoCuenta(c)}
                                </option>
                            )
                        })}
                    </Select>

                    <label className="flex items-center gap-2 text-sm min-h-11 md:min-h-0">
                        <input
                            type="checkbox"
                            checked={dividir}
                            onChange={function (e) {
                                setDividir(e.target.checked)

                                if (!e.target.checked) {
                                    setCuenta2("")
                                    setMonto1("")
                                }
                            }}
                        />
                        Dividir el pago entre dos cuentas
                    </label>

                    {dividir && (
                        <div
                            className="p-3 space-y-3"
                            style={{
                                background: "var(--color-muted)",
                                borderRadius: "var(--radius-sm)",
                            }}
                        >
                            <MontoInput
                                id="monto-cuenta1-resumen"
                                label="Monto con la primera cuenta"
                                moneda={moneda}
                                value={monto1}
                                onChange={setMonto1}
                                required
                            />

                            <Select
                                id="cuenta2-resumen"
                                label="Segunda cuenta"
                                value={cuenta2}
                                onChange={function (e) {
                                    setCuenta2(e.target.value)
                                }}
                                required
                            >
                                <option value="">Elegí una cuenta</option>
                                {cuentasUsables
                                    .filter(function (c) {
                                        return String(c.id) !== cuenta1
                                    })
                                    .map(function (c) {
                                        return (
                                            <option key={c.id} value={c.id}>
                                                {textoCuenta(c)}
                                            </option>
                                        )
                                    })}
                            </Select>

                            <p
                                className="text-xs"
                                style={{
                                    color: "var(--color-muted-foreground)",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                La segunda cuenta paga:{" "}
                                {formatearMonto(Math.max(parte2, 0), moneda)}{" "}
                                {moneda}
                            </p>
                        </div>
                    )}

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={guardando}
                        >
                            Confirmar pago
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}