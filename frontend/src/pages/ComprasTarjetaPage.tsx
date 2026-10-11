import { useEffect, useState } from "react"
import {
    listarCompras,
    crearCompra,
    editarCompra,
    eliminarCompra,
    listarCuotas,
} from "../services/compraTarjetaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
}

type Compra = {
    id: number
    tarjeta_id: number
    tarjeta: string
    monto_base: number
    cantidad_cuotas: number
    fecha_compra: string
    descripcion: string | null
}

type Cuota = {
    id: number
    compra_tarjeta_id: number
    numero: number
    monto_base: number
    periodo: string
    fecha_vencimiento: string | null
    estado: string
    monto_pendiente: number
}

type Formulario = {
    tarjetaId: string
    monto: string
    cuotas: string
    descripcion: string
}

type ComprasTarjetaPageProps = {
    // todas las tarjetas (también las dadas de baja, para saber su moneda)
    tarjetas: Tarjeta[]
}

const ETIQUETA_ESTADO: Record<string, string> = {
    PENDIENTE: "Pendiente",
    PARCIAL: "Pago parcial",
    PAGADA: "Pagada",
    OMITIDA: "Omitida",
    ANULADA: "Anulada",
}

function colorEstado(estado: string) {
    if (estado === "PAGADA") {
        return "var(--color-income)"
    }

    if (estado === "PENDIENTE" || estado === "PARCIAL") {
        return "var(--color-expense)"
    }

    return "var(--color-muted-foreground)"
}

// "2026-11-10" => "10/11/2026"
function fechaCorta(fecha: string | null) {
    if (!fecha) {
        return "—"
    }

    const f = fecha.slice(0, 10)
    return `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`
}

// "2026-11-01" => "11/2026"
function periodoCorto(periodo: string) {
    return `${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`
}

const formularioInicial: Formulario = {
    tarjetaId: "",
    monto: "",
    cuotas: "1",
    descripcion: "",
}

export default function ComprasTarjetaPage({
    tarjetas,
}: ComprasTarjetaPageProps) {
    const [compras, setCompras] = useState<Compra[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    // nueva compra
    const [modalNueva, setModalNueva] = useState(false)
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial)
    const [errorModal, setErrorModal] = useState("")

    // editar descripción
    const [compraEditando, setCompraEditando] = useState<Compra | null>(null)
    const [descripcionEdicion, setDescripcionEdicion] = useState("")

    // cuotas de la compra abierta
    const [compraAbierta, setCompraAbierta] = useState<number | null>(null)
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [cargandoCuotas, setCargandoCuotas] = useState(false)

    // ---------- Carga de datos ----------

    async function cargar() {
        try {
            setCompras(await listarCompras())
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las compras"
            )
        } finally {
            setCargando(false)
        }
    }

    async function cargarCuotas(compraId: number) {
        setCargandoCuotas(true)

        try {
            setCuotas(await listarCuotas(compraId))
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las cuotas"
            )
        } finally {
            setCargandoCuotas(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    // ---------- Datos calculados ----------

    function monedaDe(tarjetaId: number) {
        const tarjeta = tarjetas.find(function (t) {
            return t.id === tarjetaId
        })

        return tarjeta ? tarjeta.moneda : "PYG"
    }

    const tarjetasActivas = tarjetas.filter(function (t) {
        return t.estado === "ACTIVA"
    })

    const tarjetaElegida = tarjetas.find(function (t) {
        return String(t.id) === formulario.tarjetaId
    })

    const monedaForm = tarjetaElegida ? tarjetaElegida.moneda : "PYG"

    const cantidadCuotas = Number(formulario.cuotas)
    const montoForm = Number(formulario.monto)

    const cuotaEstimada =
        montoForm > 0 && cantidadCuotas > 0 ? montoForm / cantidadCuotas : 0

    // ---------- Nueva compra ----------

    function abrirNueva() {
        setFormulario(formularioInicial)
        setErrorModal("")
        setModalNueva(true)
    }

    function cambiarTarjeta(tarjetaId: string) {
        const tarjeta = tarjetas.find(function (t) {
            return String(t.id) === tarjetaId
        })

        setFormulario({
            ...formulario,
            tarjetaId: tarjetaId,
            // guaraníes no tienen decimales
            monto:
                tarjeta && tarjeta.moneda === "PYG"
                    ? String(Math.trunc(Number(formulario.monto || 0)))
                    : formulario.monto,
        })
    }

    async function guardarNueva(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setErrorModal("")
        setError("")
        setMensaje("")

        if (!formulario.tarjetaId) {
            setErrorModal("Elegí una tarjeta")
            return
        }

        if (montoForm <= 0) {
            setErrorModal("El monto debe ser mayor a 0")
            return
        }

        if (!Number.isInteger(cantidadCuotas) || cantidadCuotas < 1) {
            setErrorModal("La cantidad de cuotas debe ser 1 o más")
            return
        }

        try {
            await crearCompra({
                tarjeta_id: Number(formulario.tarjetaId),
                monto: montoForm,
                cantidad_cuotas: cantidadCuotas,
                descripcion: formulario.descripcion || null,
            })

            setMensaje("Compra registrada")
            setModalNueva(false)
            await cargar()
        } catch (e) {
            // ej: "La compra supera el límite disponible. Disponible: ..."
            setErrorModal(
                e instanceof Error ? e.message : "No se pudo guardar la compra"
            )
        }
    }

    // ---------- Editar descripción ----------

    function abrirEdicion(compra: Compra) {
        setCompraEditando(compra)
        setDescripcionEdicion(compra.descripcion ?? "")
        setErrorModal("")
    }

    async function guardarEdicion(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()

        if (compraEditando === null) {
            return
        }

        setErrorModal("")
        setError("")
        setMensaje("")

        try {
            // el backend pide todos los campos, pero solo cambia la descripción
            await editarCompra(compraEditando.id, {
                tarjeta_id: compraEditando.tarjeta_id,
                monto: Number(compraEditando.monto_base),
                cantidad_cuotas: compraEditando.cantidad_cuotas,
                descripcion: descripcionEdicion || null,
            })

            setMensaje("Compra actualizada")
            setCompraEditando(null)
            await cargar()
        } catch (e) {
            setErrorModal(
                e instanceof Error ? e.message : "No se pudo editar la compra"
            )
        }
    }

    // ---------- Anular ----------

    async function anular(compra: Compra) {
        const confirmar = window.confirm(
            `¿Anular la compra "${compra.descripcion || "sin descripción"}"?`
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarCompra(compra.id)
            setMensaje("Compra anulada")

            if (compraAbierta === compra.id) {
                setCompraAbierta(null)
                setCuotas([])
            }

            await cargar()
        } catch (e) {
            // ej: "No se puede anular la compra porque tiene pagos confirmados"
            setError(
                e instanceof Error ? e.message : "No se pudo anular la compra"
            )
        }
    }

    // ---------- Ver cuotas ----------

    async function alternarCuotas(compraId: number) {
        if (compraAbierta === compraId) {
            setCompraAbierta(null)
            setCuotas([])
            return
        }

        setCompraAbierta(compraId)
        setCuotas([])
        await cargarCuotas(compraId)
    }

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Compras con tarjeta</h1>

                <Button
                    type="button"
                    onClick={abrirNueva}
                    disabled={tarjetasActivas.length === 0}
                >
                    + Nueva compra
                </Button>
            </div>

            {tarjetasActivas.length === 0 && (
                <EstadoVacio texto="Creá una tarjeta para registrar compras." />
            )}

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && compras.length === 0 && (
                <EstadoVacio texto="No tenés compras registradas." />
            )}

            <div className="space-y-4">
                {compras.map(function (compra) {
                    const moneda = monedaDe(compra.tarjeta_id)
                    const abierta = compraAbierta === compra.id

                    return (
                        <div
                            key={compra.id}
                            className="p-4 sm:p-5 space-y-4"
                            style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium break-words">
                                        {compra.descripcion ||
                                            "Compra sin descripción"}
                                    </p>

                                    <p
                                        className="text-xs"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        {compra.tarjeta} ·{" "}
                                        {fechaCorta(compra.fecha_compra)} ·{" "}
                                        {compra.cantidad_cuotas}{" "}
                                        {compra.cantidad_cuotas === 1
                                            ? "cuota"
                                            : "cuotas"}
                                    </p>
                                </div>

                                <p
                                    className="text-lg font-light shrink-0"
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        color: "var(--color-expense)",
                                    }}
                                >
                                    {formatearMonto(compra.monto_base, moneda)}{" "}
                                    <span className="text-sm">{moneda}</span>
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={abierta ? "primary" : "secondary"}
                                    aria-expanded={abierta}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        alternarCuotas(compra.id)
                                    }}
                                >
                                    {abierta ? "Ocultar cuotas" : "Ver cuotas"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-label={`Editar ${compra.descripcion || "compra"}`}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        abrirEdicion(compra)
                                    }}
                                >
                                    Editar
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-label={`Anular ${compra.descripcion || "compra"}`}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        anular(compra)
                                    }}
                                >
                                    Anular
                                </Button>
                            </div>

                            {abierta && (
                                <div
                                    className="pt-3"
                                    style={{
                                        borderTop:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    {cargandoCuotas && (
                                        <Cargando texto="Cargando cuotas..." />
                                    )}

                                    {!cargandoCuotas && cuotas.length === 0 && (
                                        <EstadoVacio texto="Sin cuotas." />
                                    )}

                                    {cuotas.map(function (cuota) {
                                        return (
                                            <div
                                                key={cuota.id}
                                                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                                                style={{
                                                    borderBottom:
                                                        "1px solid var(--color-border)",
                                                }}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm">
                                                        Cuota {cuota.numero}
                                                        <span
                                                            className="ml-2 text-xs"
                                                            style={{
                                                                color: colorEstado(
                                                                    cuota.estado
                                                                ),
                                                            }}
                                                        >
                                                            {ETIQUETA_ESTADO[
                                                                cuota.estado
                                                            ] ?? cuota.estado}
                                                        </span>
                                                    </p>

                                                    <p
                                                        className="text-xs"
                                                        style={{
                                                            color: "var(--color-muted-foreground)",
                                                        }}
                                                    >
                                                        Período{" "}
                                                        {periodoCorto(
                                                            cuota.periodo
                                                        )}{" "}
                                                        · Vence{" "}
                                                        {fechaCorta(
                                                            cuota.fecha_vencimiento
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p
                                                        className="text-sm"
                                                        style={{
                                                            fontFamily:
                                                                "var(--font-mono)",
                                                        }}
                                                    >
                                                        {formatearMonto(
                                                            cuota.monto_base,
                                                            moneda
                                                        )}
                                                    </p>

                                                    <p
                                                        className="text-xs"
                                                        style={{
                                                            fontFamily:
                                                                "var(--font-mono)",
                                                            color: "var(--color-muted-foreground)",
                                                        }}
                                                    >
                                                        Pendiente{" "}
                                                        {formatearMonto(
                                                            cuota.monto_pendiente,
                                                            moneda
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Modal: nueva compra */}
            <Modal
                open={modalNueva}
                title="Nueva compra"
                onClose={function () {
                    setModalNueva(false)
                }}
            >
                <form onSubmit={guardarNueva} className="space-y-4">
                    <Select
                        id="tarjeta"
                        label="Tarjeta"
                        value={formulario.tarjetaId}
                        onChange={function (e) {
                            cambiarTarjeta(e.target.value)
                        }}
                        required
                    >
                        <option value="">Elegí una tarjeta</option>
                        {tarjetasActivas.map(function (t) {
                            return (
                                <option key={t.id} value={t.id}>
                                    {t.nombre} ({t.moneda})
                                </option>
                            )
                        })}
                    </Select>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <MontoInput
                            id="monto"
                            label={`Monto total (${monedaForm})`}
                            moneda={monedaForm}
                            value={formulario.monto}
                            onChange={function (valor) {
                                setFormulario({ ...formulario, monto: valor })
                            }}
                            required
                        />

                        <Input
                            id="cuotas"
                            label="Cantidad de cuotas"
                            type="number"
                            min="1"
                            step="1"
                            value={formulario.cuotas}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    cuotas: e.target.value,
                                })
                            }}
                            required
                        />
                    </div>

                    {cuotaEstimada > 0 && (
                        <p
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            Cuota estimada:{" "}
                            {formatearMonto(cuotaEstimada, monedaForm)}{" "}
                            {monedaForm}
                        </p>
                    )}

                    <Input
                        id="descripcion"
                        label="Descripción (opcional)"
                        value={formulario.descripcion}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                descripcion: e.target.value,
                            })
                        }}
                    />

                    {errorModal && <Mensaje tipo="error">{errorModal}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={function () {
                                setModalNueva(false)
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

            {/* Modal: editar descripción */}
            <Modal
                open={compraEditando !== null}
                title="Editar compra"
                onClose={function () {
                    setCompraEditando(null)
                }}
            >
                <form onSubmit={guardarEdicion} className="space-y-4">
                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Solo se puede cambiar la descripción. Para cambiar el
                        monto o las cuotas, anulá la compra y registrala de
                        nuevo.
                    </p>

                    <Input
                        id="descripcion-edicion"
                        label="Descripción"
                        value={descripcionEdicion}
                        onChange={function (e) {
                            setDescripcionEdicion(e.target.value)
                        }}
                        autoFocus
                    />

                    {errorModal && <Mensaje tipo="error">{errorModal}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={function () {
                                setCompraEditando(null)
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
        </div>
    )
}