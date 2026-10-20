import { useEffect, useState } from "react"
import { crearTransferencia } from "../../services/movimientoService"
import Button from "../ui/Button"
import Input from "../ui/Input"
import Modal from "../ui/Modal"
import MontoInput from "../ui/MontoInput"
import Select from "../ui/Select"
import EstadoVacio from "../ui/EstadoVacio"
import Mensaje from "../ui/Mensaje"
import { formatearMonto } from "../../lib/moneda"
import { fechaHoy } from "../../lib/fechas"
import { avisoSaldo } from "../../lib/saldo"

type CuentaTransferencia = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    saldo: number
}

type TransferenciaModalProps = {
    open: boolean
    cuentas: CuentaTransferencia[]
    onClose: () => void
    onGuardado: () => void
}

export default function TransferenciaModal({
    open,
    cuentas,
    onClose,
    onGuardado,
}: TransferenciaModalProps) {
    const [origenId, setOrigenId] = useState("")
    const [destinoId, setDestinoId] = useState("")
    const [monto, setMonto] = useState("")
    const [fecha, setFecha] = useState(fechaHoy())
    const [descripcion, setDescripcion] = useState("")
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)

    useEffect(
        function () {
            if (!open) {
                return
            }

            setOrigenId("")
            setDestinoId("")
            setMonto("")
            setFecha(fechaHoy())
            setDescripcion("")
            setError("")
            setGuardando(false)
        },
        [open]
    )

    const propias = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO"
    })

    const origen = propias.find(function (c) {
        return String(c.id) === origenId
    })

    // el destino debe ser otra cuenta de la misma moneda
    const destinos = origen
        ? propias.filter(function (c) {
              return c.id !== origen.id && c.moneda === origen.moneda
          })
        : []

    const destino = destinos.find(function (c) {
        return String(c.id) === destinoId
    })

    const moneda = origen ? origen.moneda : "PYG"
    const importe = Number(monto || 0)

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (!origen) {
            setError("Elegí la cuenta de origen")
            return
        }

        if (!destino) {
            setError("Elegí la cuenta de destino")
            return
        }

        if (importe <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        if (!fecha || fecha > fechaHoy()) {
            setError("Elegí una fecha válida (no puede ser futura)")
            return
        }

        const aviso = avisoSaldo(
            origen.nombre,
            Number(origen.saldo),
            importe,
            moneda
        )

        if (aviso && !window.confirm(aviso)) {
            return
        }

        setGuardando(true)

        try {
            await crearTransferencia({
                origen_id: origen.id,
                destino_id: destino.id,
                monto: importe,
                fecha: fecha,
                descripcion: descripcion || null,
            })

            onGuardado()
            onClose()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo registrar la transferencia"
            )
        } finally {
            setGuardando(false)
        }
    }

    function textoCuenta(c: CuentaTransferencia) {
        return `${c.nombre} (${c.moneda}) — saldo ${formatearMonto(Number(c.saldo), c.moneda)}`
    }

    return (
        <Modal open={open} title="Transferir entre cuentas" onClose={onClose}>
            {propias.length < 2 ? (
                <div className="space-y-4">
                    <EstadoVacio texto="Necesitás al menos dos cuentas (sin contar tarjetas) para transferir. Creá otra en la pestaña Cuentas." />

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
                        Mueve plata entre tus cuentas (por ejemplo, un retiro
                        de cajero o pasar a la billetera). No cuenta como
                        ingreso ni como gasto.
                    </p>

                    <Select
                        id="transf-origen"
                        label="Desde"
                        value={origenId}
                        onChange={function (e) {
                            setOrigenId(e.target.value)
                            setDestinoId("")
                        }}
                        required
                    >
                        <option value="">Elegí la cuenta de origen</option>
                        {propias.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {textoCuenta(c)}
                                </option>
                            )
                        })}
                    </Select>

                    <Select
                        id="transf-destino"
                        label="Hacia"
                        value={destinoId}
                        onChange={function (e) {
                            setDestinoId(e.target.value)
                        }}
                        disabled={!origen}
                        required
                    >
                        <option value="">Elegí la cuenta de destino</option>
                        {destinos.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {textoCuenta(c)}
                                </option>
                            )
                        })}
                    </Select>

                    {origen && destinos.length === 0 && (
                        <p
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            No tenés otra cuenta en {moneda}. Todavía no se
                            puede transferir entre monedas distintas.
                        </p>
                    )}

                    <MontoInput
                        id="transf-monto"
                        label={`Monto (${moneda})`}
                        moneda={moneda}
                        value={monto}
                        onChange={setMonto}
                        required
                    />

                    {origen && destino && importe > 0 && (
                        <p
                            className="text-xs"
                            style={{
                                color: "var(--color-muted-foreground)",
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            {origen.nombre} quedará en{" "}
                            {formatearMonto(Number(origen.saldo) - importe, moneda)}
                            {" · "}
                            {destino.nombre} quedará en{" "}
                            {formatearMonto(Number(destino.saldo) + importe, moneda)}
                        </p>
                    )}

                    <Input
                        id="transf-fecha"
                        label="Fecha"
                        type="date"
                        max={fechaHoy()}
                        value={fecha}
                        onChange={function (e) {
                            setFecha(e.target.value)
                        }}
                        required
                    />

                    <Input
                        id="transf-descripcion"
                        label="Descripción (opcional)"
                        value={descripcion}
                        onChange={function (e) {
                            setDescripcion(e.target.value)
                        }}
                        placeholder="Ej. Retiro de cajero"
                    />

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
                            Transferir
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}