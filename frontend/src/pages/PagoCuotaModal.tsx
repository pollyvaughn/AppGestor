import { useEffect, useState } from "react"
import { crearPago, editarPago } from "../services/pagoService"
import Button from "../components/ui/Button"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import type { Cuenta, Cuota, Pago } from "../lib/tarjetas"
import Input from "../components/ui/Input"
import { fechaHoy } from "../lib/fechas"
import { avisoSaldo } from "../lib/saldo"

type PagoCuotaModalProps = {
    cuota: Cuota | null
    moneda: string
    pago: Pago | null // null = pago nuevo, con valor = editar
    cuentas: Cuenta[]
    onClose: () => void
    onGuardado: () => void
}

// evita errores de decimales de JavaScript (0.1 + 0.2)
function redondear(valor: number) {
    return Math.round(valor * 100) / 100
}

export default function PagoCuotaModal({
    cuota,
    moneda,
    pago,
    cuentas,
    onClose,
    onGuardado,
}: PagoCuotaModalProps) {
    const [monto, setMonto] = useState("")
    const [cuenta1, setCuenta1] = useState("")
    const [monto1, setMonto1] = useState("")
    const [dividir, setDividir] = useState(false)
    const [cuenta2, setCuenta2] = useState("")
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)
    const [fecha, setFecha] = useState(fechaHoy())

    // cada vez que se abre para otra cuota o pago, se rearma el formulario
    useEffect(
        function () {
            if (cuota === null) {
                return
            }

            setError("")
            setGuardando(false)

            if (pago === null) {
                setMonto(String(Number(cuota.monto_pendiente)))
                setCuenta1("")
                setMonto1("")
                setDividir(false)
                setCuenta2("")
                setFecha(fechaHoy())
                return
            }

            setMonto(String(Number(pago.monto)))
            setFecha(pago.fecha.slice(0, 10))
            setCuenta1(String(pago.metodos[0]?.metodo_pago_id ?? ""))
            setMonto1(String(Number(pago.metodos[0]?.monto ?? 0)))

            if (pago.metodos.length > 1) {
                setDividir(true)
                setCuenta2(String(pago.metodos[1].metodo_pago_id))
            } else {
                setDividir(false)
                setCuenta2("")
            }
        },
        [cuota, pago]
    )

    if (cuota === null) {
        return null
    }

    // solo cuentas que no son tarjeta y que están en la misma moneda
    const cuentasUsables = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO" && c.moneda === moneda
    })

    const total = Number(monto || 0)
    const parte1 = dividir ? Number(monto1 || 0) : total
    const parte2 = dividir ? redondear(total - parte1) : 0

    // lo máximo que se puede pagar: lo pendiente (+ lo ya pagado si se edita)
    const maximo = redondear(
        Number(cuota.monto_pendiente) + (pago ? Number(pago.monto) : 0)
    )

    // saldo disponible de una cuenta (al editar, se devuelve lo que ya había pagado)
    function saldoDisponible(cuentaId: string) {
        const cuenta = cuentasUsables.find(function (c) {
            return String(c.id) === cuentaId
        })

        if (!cuenta) {
            return 0
        }

        const yaPagado = pago
            ? pago.metodos.find(function (m) {
                  return String(m.metodo_pago_id) === cuentaId
              })
            : undefined

        return Number(cuenta.saldo) + (yaPagado ? Number(yaPagado.monto) : 0)
    }

    // si la cuenta queda en negativo, se avisa pero se deja seguir
    function avisoDeSaldo(cuentaId: string, montoAPagar: number) {
        const cuenta = cuentasUsables.find(function (c) {
            return String(c.id) === cuentaId
        })

        if (!cuenta) {
            return ""
        }

        return avisoSaldo(
            cuenta.nombre,
            saldoDisponible(cuentaId),
            montoAPagar,
            moneda
        )
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (cuota === null) {
            return
        }

        if (total <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        if (!fecha || fecha > fechaHoy()) {
            setError("Elegí una fecha válida (no puede ser futura)")
            return
        }

        if (redondear(total) > maximo) {
            setError(
                `El monto no puede superar ${formatearMonto(maximo, moneda)} ${moneda}`
            )
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

        const avisos = [avisoDeSaldo(cuenta1, parte1)]

        if (dividir) {
            avisos.push(avisoDeSaldo(cuenta2, parte2))
        }

        const textoAviso = avisos.filter(Boolean).join("\n")

        if (textoAviso && !window.confirm(textoAviso)) {
            return
        }

        const metodos = [
            { metodo_pago_id: Number(cuenta1), monto: redondear(parte1) },
        ]

        if (dividir) {
            metodos.push({
                metodo_pago_id: Number(cuenta2),
                monto: parte2,
            })
        }

        setGuardando(true)

        try {
            if (pago === null) {
                await crearPago(cuota.id, redondear(total), metodos, fecha)
            } else {
                await editarPago(pago.id, cuota.id, redondear(total), metodos, fecha)
            }

            onGuardado()
            onClose()
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo guardar el pago"
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
            title={
                pago === null
                    ? `Pagar cuota ${cuota.numero}`
                    : `Editar pago de la cuota ${cuota.numero}`
            }
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
                <form onSubmit={guardar} autoComplete="off" className="space-y-4">
                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Pendiente de esta cuota:{" "}
                        {formatearMonto(cuota.monto_pendiente, moneda)} {moneda}
                    </p>

                    <p
                        className="text-xs p-3"
                        style={{
                            color: "var(--color-muted-foreground)",
                            background: "var(--color-muted)",
                            borderRadius: "var(--radius-sm)",
                        }}
                    >
                        Esta cuota corresponde a una compra hecha con tarjeta.
                        Al guardar el pago, el monto se descuenta ahora del saldo
                        de la cuenta elegida y reduce lo pendiente de la cuota.
                        Elegí desde dónde sale el dinero, no la tarjeta que estás
                        pagando.
                    </p>

                    <MontoInput
                        id="monto-pago"
                        label={`Monto a pagar (${moneda})`}
                        moneda={moneda}
                        value={monto}
                        onChange={setMonto}
                        required
                    />

                    <Input
                        id="fecha-pago"
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
                        id="cuenta1"
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
                                id="monto-cuenta1"
                                label="Monto con la primera cuenta"
                                moneda={moneda}
                                value={monto1}
                                onChange={setMonto1}
                                required
                            />

                            <Select
                                id="cuenta2"
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
                            {pago === null ? "Confirmar pago" : "Guardar cambios"}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}