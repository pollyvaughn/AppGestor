import { useEffect, useState } from "react"
import {
    listarTarjetas,
    crearTarjeta,
    editarTarjeta,
    eliminarTarjeta,
} from "../services/tarjetaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import MovimientosCuentaModal from "../components/movimientos/MovimientosCuentaModal"
type Tarjeta = {
    id: number
    metodo_pago_id: number   // <- nueva línea
    nombre: string
    moneda: string
    estado: string
    limite_credito: number
    fecha_cierre: number
    fecha_vencimiento: number
    porcentaje_pago_minimo: number | null
    deuda_actual: number
    disponible: number
}

type Formulario = {
    nombre: string
    moneda: string
    limite_credito: string
    fecha_cierre: string
    fecha_vencimiento: string
    porcentaje_pago_minimo: string
}

type TarjetasPageProps = {
    // Se llama después de crear, editar o dar de baja,
    // para que la pantalla padre recargue su lista de tarjetas.
    onCambio?: () => void
}

const MONEDAS = ["PYG", "USD", "EUR", "ARS", "BRL"]

const formularioInicial: Formulario = {
    nombre: "",
    moneda: "PYG",
    limite_credito: "",
    fecha_cierre: "",
    fecha_vencimiento: "",
    porcentaje_pago_minimo: "",
}

export default function TarjetasPage({ onCambio }: TarjetasPageProps) {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    const [cargando, setCargando] = useState(true)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")
    const [viendo, setViendo] = useState<Tarjeta | null>(null)
    async function cargar() {
        try {
            const datos: Tarjeta[] = await listarTarjetas()

            // el backend también devuelve las dadas de baja: no se muestran
            setTarjetas(
                datos.filter(function (t) {
                    return t.estado !== "DADA_DE_BAJA"
                })
            )
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las tarjetas"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    async function recargarTodo() {
        await cargar()
        onCambio?.()
    }

    function abrirNueva() {
        setEditando(null)
        setFormulario(formularioInicial)
        setError("")
        setModalAbierto(true)
    }

    function abrirEdicion(tarjeta: Tarjeta) {
        setEditando(tarjeta.id)
        setFormulario({
            nombre: tarjeta.nombre,
            moneda: tarjeta.moneda,
            limite_credito: String(Number(tarjeta.limite_credito)),
            fecha_cierre: String(tarjeta.fecha_cierre),
            fecha_vencimiento: String(tarjeta.fecha_vencimiento),
            porcentaje_pago_minimo:
                tarjeta.porcentaje_pago_minimo === null
                    ? ""
                    : String(Number(tarjeta.porcentaje_pago_minimo)),
        })
        setError("")
        setModalAbierto(true)
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")
        setMensaje("")

        const limite = Number(formulario.limite_credito)
        const cierre = Number(formulario.fecha_cierre)
        const vencimiento = Number(formulario.fecha_vencimiento)

        if (limite <= 0) {
            setError("El límite de crédito debe ser mayor a 0")
            return
        }

        if (cierre < 1 || cierre > 31 || vencimiento < 1 || vencimiento > 31) {
            setError("Los días de cierre y vencimiento deben estar entre 1 y 31")
            return
        }

        const datos = {
            nombre: formulario.nombre,
            moneda: formulario.moneda,
            limite_credito: limite,
            fecha_cierre: cierre,
            fecha_vencimiento: vencimiento,
            porcentaje_pago_minimo:
                formulario.porcentaje_pago_minimo === ""
                    ? null
                    : Number(formulario.porcentaje_pago_minimo),
        }

        try {
            if (editando === null) {
                await crearTarjeta(datos)
                setMensaje("Tarjeta creada")
            } else {
                await editarTarjeta(editando, datos)
                setMensaje("Tarjeta actualizada")
            }

            setModalAbierto(false)
            await recargarTodo()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar la tarjeta"
            )
        }
    }

    async function darDeBaja(tarjeta: Tarjeta) {
        const confirmar = window.confirm(
            `¿Dar de baja "${tarjeta.nombre}"?`
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarTarjeta(tarjeta.id)
            setMensaje("Tarjeta dada de baja")
            await recargarTodo()
        } catch (e) {
            // ej: "No se puede dar de baja la tarjeta porque tiene cuotas pendientes"
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo dar de baja la tarjeta"
            )
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Tarjetas</h1>

                <Button type="button" onClick={abrirNueva}>
                    + Nueva tarjeta
                </Button>
            </div>

            {error && !modalAbierto && <Mensaje tipo="error">{error}</Mensaje>}

            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}

            {cargando && <Cargando />}

            {!cargando && tarjetas.length === 0 && (
                <EstadoVacio texto="No tenés tarjetas." />
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {tarjetas.map(function (tarjeta) {
                    const limite = Number(tarjeta.limite_credito)
                    const deuda = Number(tarjeta.deuda_actual)
                    const disponible = Number(tarjeta.disponible)
                    const porcentaje =
                        limite > 0 ? Math.min((deuda / limite) * 100, 100) : 0

                    return (
                        <div
                            key={tarjeta.id}
                            className="p-5 flex flex-col gap-3"
                            style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {tarjeta.nombre}
                                </p>

                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                    }}
                                >
                                    {tarjeta.moneda} · Cierre día{" "}
                                    {tarjeta.fecha_cierre} · Vence día{" "}
                                    {tarjeta.fecha_vencimiento}
                                </p>
                            </div>

                            <div>
                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                    }}
                                >
                                    Disponible
                                </p>

                                <p
                                    className="text-2xl font-light break-words"
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        color:
                                            disponible >= 0
                                                ? "var(--color-income)"
                                                : "var(--color-expense)",
                                    }}
                                >
                                    {formatearMonto(disponible, tarjeta.moneda)}{" "}
                                    <span className="text-sm">
                                        {tarjeta.moneda}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div
                                    className="h-1.5 w-full rounded-full"
                                    style={{ background: "var(--color-muted)" }}
                                    aria-hidden="true"
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${porcentaje}%`,
                                            background:
                                                porcentaje > 80
                                                    ? "var(--color-expense)"
                                                    : "var(--color-foreground)",
                                        }}
                                    />
                                </div>

                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Deuda {formatearMonto(deuda, tarjeta.moneda)}{" "}
                                    / Límite{" "}
                                    {formatearMonto(limite, tarjeta.moneda)}
                                </p>

                                {tarjeta.porcentaje_pago_minimo !== null && (
                                    <p
                                        className="text-xs"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        Pago mínimo:{" "}
                                        {Number(tarjeta.porcentaje_pago_minimo)}%
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-label={`Editar ${tarjeta.nombre}`}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        abrirEdicion(tarjeta)
                                    }}
                                >
                                    Editar
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-label={`Dar de baja ${tarjeta.nombre}`}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        darDeBaja(tarjeta)
                                    }}
                                >
                                    Dar de baja
                                </Button>

                                <Button
                                    type="button"
                                    aria-label={`Ver movimientos de ${tarjeta.nombre}`}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        setViendo(tarjeta)
                                    }}
                                >
                                    Ver movimientos
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <Modal
                open={modalAbierto}
                title={editando === null ? "Nueva tarjeta" : "Editar tarjeta"}
                onClose={function () {
                    setModalAbierto(false)
                }}
            >
                <form onSubmit={guardar} autoComplete="off" className="space-y-4">
                    <Input
                        id="nombre"
                        label="Nombre"
                        value={formulario.nombre}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                nombre: e.target.value,
                            })
                        }}
                        placeholder="Ej. Visa Itaú"
                        required
                        autoFocus
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            id="moneda"
                            label="Moneda"
                            value={formulario.moneda}
                            // al editar no se cambia: las cuotas ya creadas quedarían en otra moneda
                            disabled={editando !== null}
                            onChange={function (e) {
                                const moneda = e.target.value

                                setFormulario({
                                    ...formulario,
                                    moneda: moneda,
                                    limite_credito:
                                        moneda === "PYG"
                                            ? String(
                                                  Math.trunc(
                                                      Number(
                                                          formulario.limite_credito ||
                                                              0
                                                      )
                                                  )
                                              )
                                            : formulario.limite_credito,
                                })
                            }}
                        >
                            {MONEDAS.map(function (moneda) {
                                return (
                                    <option key={moneda} value={moneda}>
                                        {moneda}
                                    </option>
                                )
                            })}
                        </Select>

                        <MontoInput
                            id="limite"
                            label="Límite de crédito"
                            moneda={formulario.moneda}
                            value={formulario.limite_credito}
                            onChange={function (valor) {
                                setFormulario({
                                    ...formulario,
                                    limite_credito: valor,
                                })
                            }}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            id="cierre"
                            label="Día de cierre"
                            type="number"
                            min="1"
                            max="31"
                            value={formulario.fecha_cierre}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    fecha_cierre: e.target.value,
                                })
                            }}
                            placeholder="1 a 31"
                            required
                        />

                        <Input
                            id="vencimiento"
                            label="Día de vencimiento"
                            type="number"
                            min="1"
                            max="31"
                            value={formulario.fecha_vencimiento}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    fecha_vencimiento: e.target.value,
                                })
                            }}
                            placeholder="1 a 31"
                            required
                        />
                    </div>

                    <Input
                        id="pago-minimo"
                        label="% de pago mínimo (opcional)"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formulario.porcentaje_pago_minimo}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                porcentaje_pago_minimo: e.target.value,
                            })
                        }}
                    />

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={function () {
                                setModalAbierto(false)
                            }}
                        >
                            Cancelar
                        </Button>

                        <Button type="submit" className="flex-1">
                            Guardar
                        </Button>
                    
                    </div>
                </form>
            </Modal>
            <MovimientosCuentaModal
                        cuenta={
                        viendo
                            ? {
                                id: viendo.metodo_pago_id,
                                nombre: viendo.nombre,
                                moneda: viendo.moneda,
                            }
                            : null
                    }
                    onClose={function () {
                        setViendo(null)
                    }}
                />
        </div>
    )
}