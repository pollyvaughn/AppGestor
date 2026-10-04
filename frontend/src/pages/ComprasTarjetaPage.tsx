import { useEffect, useState } from "react"
import {
    listarCompras,
    crearCompra,
    editarCompra,
    eliminarCompra,
    listarCuotas
} from "../services/compraTarjetaService"

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

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
}

type Props = {
    tarjetas: Tarjeta[]
}

export default function ComprasTarjetaPage({ tarjetas }: Props) {
    const [compras, setCompras] = useState<Compra[]>([])
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [compraSeleccionada, setCompraSeleccionada] =
        useState<number | null>(null)

    const [tarjetaId, setTarjetaId] = useState("")
    const [monto, setMonto] = useState("")
    const [cantidadCuotas, setCantidadCuotas] = useState("")
    const [descripcion, setDescripcion] = useState("")

    const [compraEditando, setCompraEditando] =
        useState<number | null>(null)

    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    async function cargarCompras() {
        try {
            const datos = await listarCompras()
            setCompras(datos)
        } catch {
            setError("No se pudieron cargar las compras")
        }
    }

    useEffect(function () {
        cargarCompras()
    }, [])

    function limpiarFormulario() {
        setTarjetaId("")
        setMonto("")
        setCantidadCuotas("")
        setDescripcion("")
        setCompraEditando(null)
    }

    async function manejarSubmit(
        evento: React.FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault()

        setError("")
        setMensaje("")

        try {
            if (compraEditando === null) {
                await crearCompra({
                    tarjeta_id: Number(tarjetaId),
                    monto: Number(monto),
                    cantidad_cuotas: Number(cantidadCuotas),
                    descripcion:
                        descripcion === ""
                            ? null
                            : descripcion
                })

                setMensaje("Compra registrada correctamente")
            } else {
                await editarCompra(compraEditando, {
                    tarjeta_id: Number(tarjetaId),
                    monto: Number(monto),
                    cantidad_cuotas: Number(cantidadCuotas),
                    descripcion:
                        descripcion === ""
                            ? null
                            : descripcion
                })

                setMensaje("Compra actualizada correctamente")
            }

            limpiarFormulario()
            await cargarCompras()
        } catch {
            setError("No se pudo guardar la compra")
        }
    }

    function prepararEdicion(compra: Compra) {
        setCompraEditando(compra.id)

        setTarjetaId(String(compra.tarjeta_id))
        setMonto(String(compra.monto_base))
        setCantidadCuotas(String(compra.cantidad_cuotas))
        setDescripcion("")
    }

    async function manejarEliminar(id: number) {
        const confirmar = window.confirm(
            "¿Querés eliminar esta compra?"
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarCompra(id)

            setMensaje("Compra eliminada correctamente")

            if (compraSeleccionada === id) {
                setCompraSeleccionada(null)
                setCuotas([])
            }

            await cargarCompras()
        } catch {
            setError("No se pudo eliminar la compra")
        }
    }

    async function verCuotas(compraId: number) {
        setError("")

        try {
            const datos = await listarCuotas(compraId)

            setCuotas(datos)
            setCompraSeleccionada(compraId)
        } catch {
            setError("No se pudieron cargar las cuotas")
        }
    }

    return (
        <main>
            <h1>Compras con tarjeta</h1>

            {error && <p>{error}</p>}
            {mensaje && <p>{mensaje}</p>}

            <section>
                <h2>
                    {compraEditando === null
                        ? "Nueva compra"
                        : "Editar compra"}
                </h2>

                <form onSubmit={manejarSubmit}>
                    <select
                        value={tarjetaId}
                        onChange={function (evento) {
                            setTarjetaId(evento.target.value)
                        }}
                        required
                        disabled={compraEditando !== null}
                    >
                        <option value="">
                            Seleccioná una tarjeta
                        </option>

                        {tarjetas.map(function (tarjeta) {
                            return (
                                <option
                                    key={tarjeta.id}
                                    value={tarjeta.id}
                                >
                                    {tarjeta.nombre} ({tarjeta.moneda})
                                </option>
                            )
                        })}
                    </select>

                    <input
                        type="number"
                        placeholder="Monto total de la compra"
                        value={monto}
                        onChange={function (evento) {
                            setMonto(evento.target.value)
                        }}
                        min="0"
                        step="0.01"
                        required
                        disabled={compraEditando !== null}
                    />

                    <input
                        type="number"
                        placeholder="Cantidad de cuotas"
                        value={cantidadCuotas}
                        onChange={function (evento) {
                            setCantidadCuotas(evento.target.value)
                        }}
                        min="1"
                        required
                        disabled={compraEditando !== null}
                    />

                    {monto && cantidadCuotas && Number(cantidadCuotas) > 0 && (
                        <p>
                            Cuota estimada: Gs.{" "}
                            {(Number(monto) / Number(cantidadCuotas)).toLocaleString("es-PY")}
                        </p>
                    )}

                    <input
                        type="text"
                        placeholder="Descripción"
                        value={descripcion}
                        onChange={function (evento) {
                            setDescripcion(evento.target.value)
                        }}
                    />

                    <button type="submit">
                        {compraEditando === null
                            ? "Registrar compra"
                            : "Guardar cambios"}
                    </button>

                    {compraEditando !== null && (
                        <button
                            type="button"
                            onClick={limpiarFormulario}
                        >
                            Cancelar
                        </button>
                    )}
                </form>
            </section>

            <section>
                <h2>Compras registradas</h2>

                {compras.length === 0 ? (
                    <p>No tenés compras registradas.</p>
                ) : (
                    compras.map(function (compra) {
                        return (
                            <article key={compra.id}>
                                <h3>{compra.descripcion || "Compra sin descripción"}</h3>

                                <p>
                                    Tarjeta: {compra.tarjeta}
                                </p>
                                <p>
                                    Monto: {compra.monto_base}
                                </p>

                                <p>
                                    Cuotas: {compra.cantidad_cuotas}
                                </p>

                                <p>
                                    Fecha: {compra.fecha_compra}
                                </p>

                                <button
                                    onClick={function () {
                                        prepararEdicion(compra)
                                    }}
                                >
                                    Editar
                                </button>

                                <button
                                    onClick={function () {
                                        manejarEliminar(compra.id)
                                    }}
                                >
                                    Eliminar
                                </button>

                                <button
                                    onClick={function () {
                                        verCuotas(compra.id)
                                    }}
                                >
                                    Ver cuotas
                                </button>

                                {compraSeleccionada === compra.id && (
                                    <section>
                                        <h4>Cuotas</h4>

                                        {cuotas.map(function (cuota) {
                                            return (
                                                <p key={cuota.id}>
                                                    Cuota {cuota.numero} —
                                                    {" "}
                                                    {cuota.monto_base}
                                                    {" — "}
                                                    {cuota.estado}
                                                </p>
                                            )
                                        })}
                                    </section>
                                )}
                            </article>
                        )
                    })
                )}
            </section>
        </main>
    )
}