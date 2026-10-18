import { useEffect, useState } from "react"
import {
    listarCompras,
    crearCompra,
    editarCompra,
    eliminarCompra,
    listarCuotas,
} from "../services/compraTarjetaService"
import { listarPagosPorCuota, anularPago } from "../services/pagoService"
import { omitirCuota } from "../services/cuotaService"
import { listarCuentas } from "../services/cuentaService"
import { listarCategorias } from "../services/categoriaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import CuotaFila from "./CuotaFila"
import PagoCuotaModal from "./PagoCuotaModal"
import AjustesCuotaModal from "./AjustesCuotaModal"
import {
    type Cuenta,
    type Cuota,
    type Pago,
    fechaCorta,
    puedePagarCuota,
} from "./utilTarjetas"

import { fechaHoy } from "../lib/fechas"
import CategoriaRapida from "../components/ui/CategoriaRapida"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
}

type Categoria = {
    id: number
    nombre: string
    tipo: "INGRESO" | "EGRESO"
    color: string | null
}

type Compra = {
    id: number
    tarjeta_id: number
    tarjeta: string
    monto_base: number
    cantidad_cuotas: number
    fecha_compra: string
    descripcion: string | null
    categoria_id: number | null
    categoria: string | null
    categoria_color: string | null
}

type Formulario = {
    tarjetaId: string
    categoriaId: string
    monto: string
    cuotas: string
    descripcion: string
    fecha: string
}

function formularioVacio(): Formulario {
    return {
        tarjetaId: "",
        categoriaId: "",
        monto: "",
        cuotas: "1",
        descripcion: "",
        fecha: fechaHoy(),
    }
}

type Aviso = { tipo: "error" | "exito"; texto: string } | null

type ComprasTarjetaPageProps = {
    // todas las tarjetas (también las dadas de baja, para saber su moneda)
    tarjetas: Tarjeta[]
    // se llama cuando cambia la deuda de las tarjetas (compra, pago, ajuste...)
    onCambio?: () => void
    onIrACategorias: () => void
}

export default function ComprasTarjetaPage({
    tarjetas,
    onCambio,
    onIrACategorias,
}: ComprasTarjetaPageProps) {
    const [compras, setCompras] = useState<Compra[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    // nueva compra
    const [modalNueva, setModalNueva] = useState(false)
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio)
    const [errorModal, setErrorModal] = useState("")

    // editar descripción
    const [compraEditando, setCompraEditando] = useState<Compra | null>(null)
    const [descripcionEdicion, setDescripcionEdicion] = useState("")

    // cuotas de la compra abierta, con sus pagos
    const [compraAbierta, setCompraAbierta] = useState<number | null>(null)
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [pagosPorCuota, setPagosPorCuota] = useState<Record<number, Pago[]>>(
        {}
    )
    const [cargandoCuotas, setCargandoCuotas] = useState(false)
    const [aviso, setAviso] = useState<Aviso>(null)

    // modales de pago y de ajustes
    const [cuotaPagando, setCuotaPagando] = useState<Cuota | null>(null)
    const [pagoEditando, setPagoEditando] = useState<Pago | null>(null)
    const [cuotaAjustes, setCuotaAjustes] = useState<Cuota | null>(null)

    // ---------- Carga de datos ----------

    async function cargar() {
        try {
            const [datosCompras, datosCategorias] = await Promise.all([
                listarCompras(),
                listarCategorias(),
            ])
            setCompras(datosCompras)
            setCategorias(datosCategorias)
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

    async function cargarCuentas() {
        try {
            setCuentas(await listarCuentas())
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las cuentas"
            )
        }
    }

    async function cargarCuotas(compraId: number) {
        setCargandoCuotas(true)

        try {
            const datos: Cuota[] = await listarCuotas(compraId)
            setCuotas(datos)

            // los pagos de cada cuota
            const pares = await Promise.all(
                datos.map(async function (cuota) {
                    try {
                        const pagos: Pago[] = await listarPagosPorCuota(
                            cuota.id
                        )
                        return [cuota.id, pagos] as const
                    } catch {
                        return [cuota.id, [] as Pago[]] as const
                    }
                })
            )

            const mapa: Record<number, Pago[]> = {}

            for (const [id, pagos] of pares) {
                mapa[id] = pagos
            }

            setPagosPorCuota(mapa)
        } catch (e) {
            setAviso({
                tipo: "error",
                texto:
                    e instanceof Error
                        ? e.message
                        : "No se pudieron cargar las cuotas",
            })
        } finally {
            setCargandoCuotas(false)
        }
    }

    // se llama después de pagar, anular, ajustar u omitir
    async function refrescar() {
        await cargarCuentas()

        if (compraAbierta !== null) {
            await cargarCuotas(compraAbierta)
        }

        onCambio?.()
    }

    useEffect(function () {
        cargar()
        cargarCuentas()
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

    // moneda de la compra que está abierta (la usan los modales)
    const datosCompraAbierta = compras.find(function (c) {
        return c.id === compraAbierta
    })

    const monedaAbierta = datosCompraAbierta
        ? monedaDe(datosCompraAbierta.tarjeta_id)
        : "PYG"

    // ---------- Nueva compra ----------

    function abrirNueva() {
        setFormulario(formularioVacio())
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

        if (!formulario.fecha || formulario.fecha > fechaHoy()) {
            setErrorModal("Elegí una fecha válida (no puede ser futura)")
            return
        }

        if (!formulario.tarjetaId) {
            setErrorModal("Elegí una tarjeta")
            return
        }

        if (!formulario.categoriaId) {
            setErrorModal("Elegí una categoría de egreso")
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
                categoria_id: Number(formulario.categoriaId),
                monto: montoForm,
                cantidad_cuotas: cantidadCuotas,
                descripcion: formulario.descripcion || null,
                fecha_compra: formulario.fecha,
            })

            setMensaje("Compra registrada")
            setModalNueva(false)
            await cargar()
            onCambio?.()
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
                categoria_id: compraEditando.categoria_id,
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

    // ---------- Anular compra ----------

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
                setPagosPorCuota({})
            }

            await cargar()
            onCambio?.()
        } catch (e) {
            // ej: "No se puede anular la compra porque tiene pagos confirmados"
            setError(
                e instanceof Error ? e.message : "No se pudo anular la compra"
            )
        }
    }

    // ---------- Ver cuotas ----------

    async function alternarCuotas(compraId: number) {
        setAviso(null)

        if (compraAbierta === compraId) {
            setCompraAbierta(null)
            setCuotas([])
            setPagosPorCuota({})
            return
        }

        setCompraAbierta(compraId)
        setCuotas([])
        setPagosPorCuota({})
        await cargarCuotas(compraId)
    }

    // ---------- Pagos ----------

    function abrirPago(cuota: Cuota) {
        setAviso(null)
        setPagoEditando(null)
        setCuotaPagando(cuota)
    }

    function abrirEdicionPago(cuota: Cuota, pago: Pago) {
        setAviso(null)
        setPagoEditando(pago)
        setCuotaPagando(cuota)
    }

    function cerrarPago() {
        setCuotaPagando(null)
        setPagoEditando(null)
    }

    async function pagoGuardado() {
        setAviso({
            tipo: "exito",
            texto: pagoEditando ? "Pago actualizado" : "Pago registrado",
        })

        await refrescar()
    }

    async function anularUnPago(pago: Pago) {
        const confirmar = window.confirm(
            "¿Anular este pago? El dinero vuelve a las cuentas."
        )

        if (!confirmar) {
            return
        }

        setAviso(null)

        try {
            await anularPago(pago.id)
            setAviso({ tipo: "exito", texto: "Pago anulado" })
            await refrescar()
        } catch (e) {
            setAviso({
                tipo: "error",
                texto:
                    e instanceof Error
                        ? e.message
                        : "No se pudo anular el pago",
            })
        }
    }

    // ---------- Omitir cuota ----------

    async function omitir(cuota: Cuota) {
        const confirmar = window.confirm(
            `¿Omitir la cuota ${cuota.numero}? Su saldo pasa a la cuota siguiente.`
        )

        if (!confirmar) {
            return
        }

        setAviso(null)

        try {
            await omitirCuota(cuota.id)
            setAviso({
                tipo: "exito",
                texto: `Cuota ${cuota.numero} omitida. El saldo pasó a la siguiente.`,
            })
            await refrescar()
        } catch (e) {
            setAviso({
                tipo: "error",
                texto:
                    e instanceof Error
                        ? e.message
                        : "No se pudo omitir la cuota",
            })
        }
    }

    async function categoriaCreada(id: number) {
        try {
            setCategorias(await listarCategorias())
            setFormulario(function (anterior) {
                return { ...anterior, categoriaId: String(id) }
            })
        } catch (e) {
            setErrorModal(
                e instanceof Error
                    ? e.message
                    : "No se pudieron recargar las categorías"
            )
        }
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

                                    <div
                                        className="flex items-center gap-1.5 text-xs"
                                        style={{
                                            color: compra.categoria
                                                ? "var(--color-foreground)"
                                                : "var(--color-muted-foreground)",
                                        }}
                                    >
                                        {compra.categoria && (
                                            <span
                                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{
                                                    background:
                                                        compra.categoria_color ??
                                                        "var(--color-muted-foreground)",
                                                }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {compra.categoria ?? "Sin categoría"}
                                    </div>

                                    <div
                                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        <span>
                                            {compra.tarjeta} ·{" "}
                                            {fechaCorta(compra.fecha_compra)}
                                        </span>
                                        <span>
                                            {compra.cantidad_cuotas}{" "}
                                            {compra.cantidad_cuotas === 1
                                                ? "cuota"
                                                : "cuotas"}
                                        </span>
                                    </div>
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
                                    className="pt-3 space-y-2"
                                    style={{
                                        borderTop:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    {aviso && (
                                        <Mensaje tipo={aviso.tipo}>
                                            {aviso.texto}
                                        </Mensaje>
                                    )}

                                    {cargandoCuotas && cuotas.length === 0 && (
                                        <Cargando texto="Cargando cuotas..." />
                                    )}

                                    {!cargandoCuotas && cuotas.length === 0 && (
                                        <EstadoVacio texto="Sin cuotas." />
                                    )}

                                    {cuotas.map(function (cuota, indice) {
                                        const siguiente = cuotas[indice + 1]

                                        const tieneSiguiente =
                                            siguiente !== undefined &&
                                            (siguiente.estado === "PENDIENTE" ||
                                                siguiente.estado === "PARCIAL")

                                        return (
                                            <CuotaFila
                                                key={cuota.id}
                                                cuota={cuota}
                                                moneda={moneda}
                                                pagos={
                                                    pagosPorCuota[cuota.id] ?? []
                                                }
                                                puedePagar={puedePagarCuota(
                                                    cuotas,
                                                    cuota
                                                )}
                                                tieneSiguiente={tieneSiguiente}
                                                onPagar={function () {
                                                    abrirPago(cuota)
                                                }}
                                                onEditarPago={function (pago) {
                                                    abrirEdicionPago(cuota, pago)
                                                }}
                                                onAnularPago={anularUnPago}
                                                onAjustes={function () {
                                                    setAviso(null)
                                                    setCuotaAjustes(cuota)
                                                }}
                                                onOmitir={function () {
                                                    omitir(cuota)
                                                }}
                                            />
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

                    <Select
                        id="categoria-compra"
                        label="Categoría de gasto"
                        value={formulario.categoriaId}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                categoriaId: e.target.value,
                            })
                        }}
                        required
                    >
                        <option value="">Elegí una categoría</option>
                        {categorias
                            .filter(function (categoria) {
                                return categoria.tipo === "EGRESO"
                            })
                            .map(function (categoria) {
                                return (
                                    <option
                                        key={categoria.id}
                                        value={categoria.id}
                                    >
                                        {categoria.nombre}
                                    </option>
                                )
                            })}
                    </Select>
                    <div className="flex justify-end">
                        <CategoriaRapida
                            tipo="EGRESO"
                            onCreada={categoriaCreada}
                        />
                    </div>
                    {categorias.every(function (categoria) {
                        return categoria.tipo !== "EGRESO"
                    }) && (
                        <p
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            Todavía no tenés categorías de egreso: creá una con "Crear categoría".
                        </p>
                    )}

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
                        id="fecha-compra"
                        label="Fecha de la compra"
                        type="date"
                        max={fechaHoy()}
                        value={formulario.fecha}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                fecha: e.target.value,
                            })
                        }}
                        required
                    />

                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        La fecha define en qué período cae la primera cuota,
                        según el día de cierre de la tarjeta.
                    </p>

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

            {/* Modal: pagar o editar un pago */}
            <PagoCuotaModal
                cuota={cuotaPagando}
                moneda={monedaAbierta}
                pago={pagoEditando}
                cuentas={cuentas}
                onClose={cerrarPago}
                onGuardado={pagoGuardado}
            />

            {/* Modal: ajustes de una cuota */}
            <AjustesCuotaModal
                cuota={cuotaAjustes}
                moneda={monedaAbierta}
                onClose={function () {
                    setCuotaAjustes(null)
                }}
                onCambio={refrescar}
            />
        </div>
    )
}