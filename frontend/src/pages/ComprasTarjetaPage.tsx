import { useEffect, useState } from "react"
import {
    listarCompras,
    crearCompra,
    editarCompra,
    eliminarCompra,
    listarCuotas
} from "../services/compraTarjetaService"

import { crearPago } from "../services/pagoService"
import { listarMetodosPago } from "../services/metodoPagoService"

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

type MetodoPago = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    estado: string
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

    const [metodosPago, setMetodosPago] =
        useState<MetodoPago[]>([])

    const [cuotaPagando, setCuotaPagando] =
        useState<Cuota | null>(null)

    const [metodo1Id, setMetodo1Id] = useState("")
    const [metodo1Monto, setMetodo1Monto] = useState("")

    const [metodo2Id, setMetodo2Id] = useState("")
    const [metodo2Monto, setMetodo2Monto] = useState("")

    const [mostrarConfirmacion, setMostrarConfirmacion] =
        useState(false)

    async function cargarCompras() {
        try {
            const datos = await listarCompras()
            setCompras(datos)
        } catch {
            setError("No se pudieron cargar las compras")
        }
    }

    async function cargarMetodosPago() {
        try {
            const datos = await listarMetodosPago()
            setMetodosPago(datos)
        } catch {
            setError("No se pudieron cargar los métodos de pago")
        }
    }

    useEffect(function () {
        cargarCompras()
        cargarMetodosPago()
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

    function manejarPago(cuota: Cuota) {
        setError("")
        setMensaje("")

        setCuotaPagando(cuota)

        setMetodo1Id("")
        setMetodo1Monto(String(cuota.monto_pendiente))

        setMetodo2Id("")
        setMetodo2Monto("")

        setMostrarConfirmacion(false)
    }

    function cancelarPago() {
        setCuotaPagando(null)

        setMetodo1Id("")
        setMetodo1Monto("")

        setMetodo2Id("")
        setMetodo2Monto("")

        setMostrarConfirmacion(false)
    }

    function cambiarMetodo1Monto(valor: string) {
        setMetodo1Monto(valor)

        if (metodo2Id && cuotaPagando) {
            const restante =
                cuotaPagando.monto_pendiente -
                Number(valor || 0)

            setMetodo2Monto(
                String(Math.max(0, restante))
            )
        }
    }

    function cambiarMetodo2Monto(valor: string) {
        setMetodo2Monto(valor)

        if (metodo1Id && cuotaPagando) {
            const restante =
                cuotaPagando.monto_pendiente -
                Number(valor || 0)

            setMetodo1Monto(
                String(Math.max(0, restante))
            )
        }
    }

    function seleccionarMetodo2(valor: string) {
        setMetodo2Id(valor)

        if (valor && cuotaPagando) {
            const restante =
                cuotaPagando.monto_pendiente -
                Number(metodo1Monto || 0)

            setMetodo2Monto(
                String(Math.max(0, restante))
            )
        } else {
            setMetodo2Monto("")

            if (cuotaPagando) {
                setMetodo1Monto(
                    String(cuotaPagando.monto_pendiente)
                )
            }
        }
    }

    function continuarPago() {
        if (cuotaPagando === null) {
            return
        }

        const monto1 = Number(metodo1Monto)
        const monto2 = Number(metodo2Monto)

        if (!metodo1Id) {
            setError("Seleccioná el primer método de pago")
            return
        }

        if (monto1 <= 0) {
            setError(
                "El monto del primer método debe ser mayor a 0"
            )
            return
        }

        if (metodo2Id && monto2 <= 0) {
            setError(
                "El monto del segundo método debe ser mayor a 0"
            )
            return
        }

        if (
            metodo1Id === metodo2Id &&
            metodo2Id !== ""
        ) {
            setError(
                "Los métodos de pago deben ser diferentes"
            )
            return
        }

        const total = monto1 + monto2

        if (total !== cuotaPagando.monto_pendiente) {
            setError(
                `Los métodos deben sumar exactamente ${cuotaPagando.monto_pendiente}`
            )
            return
        }

        setError("")
        setMostrarConfirmacion(true)
    }

    async function confirmarPago() {
        if (cuotaPagando === null) {
            return
        }

        const monto1 = Number(metodo1Monto)
        const monto2 = Number(metodo2Monto)

        const metodos = [
            {
                metodo_pago_id: Number(metodo1Id),
                monto: monto1
            }
        ]

        if (metodo2Id) {
            metodos.push({
                metodo_pago_id: Number(metodo2Id),
                monto: monto2
            })
        }

        try {
            setError("")
            setMensaje("")

            await crearPago(
                cuotaPagando.id,
                cuotaPagando.monto_pendiente,
                metodos
            )

            setMensaje("Pago registrado correctamente")

            cancelarPago()

            if (compraSeleccionada !== null) {
                await verCuotas(compraSeleccionada)
            }
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("No se pudo registrar el pago")
            }
        }
    }

    const metodo1 = metodosPago.find(function (metodo) {
        return String(metodo.id) === metodo1Id
    })

    const metodo2 = metodosPago.find(function (metodo) {
        return String(metodo.id) === metodo2Id
    })

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

                    {monto &&
                        cantidadCuotas &&
                        Number(cantidadCuotas) > 0 && (
                            <p>
                                Cuota estimada: Gs.{" "}
                                {(
                                    Number(monto) /
                                    Number(cantidadCuotas)
                                ).toLocaleString("es-PY")}
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
                                <h3>
                                    {compra.descripcion ||
                                        "Compra sin descripción"}
                                </h3>

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

                                        {cuotas.map(function (
                                            cuota,
                                            indice
                                        ) {
                                            const cuotaAnterior =
                                                cuotas[indice - 1]

                                            const puedePagar =
                                                cuota.estado !== "PAGADA" &&
                                                (
                                                    indice === 0 ||
                                                    cuotaAnterior.estado ===
                                                        "PAGADA"
                                                )

                                            return (
                                                <div key={cuota.id}>
                                                    <p>
                                                        Cuota{" "}
                                                        {cuota.numero} —{" "}
                                                        {cuota.monto_base} —{" "}
                                                        {cuota.estado}
                                                    </p>

                                                    <p>
                                                        Pendiente:{" "}
                                                        {cuota.monto_pendiente}
                                                    </p>

                                                    {puedePagar && (
                                                        <button
                                                            onClick={function () {
                                                                manejarPago(
                                                                    cuota
                                                                )
                                                            }}
                                                        >
                                                            Pagar cuota
                                                        </button>
                                                    )}

                                                    {cuota.estado !==
                                                        "PAGADA" &&
                                                        !puedePagar && (
                                                            <p>
                                                                Esperando
                                                                pago de cuotas
                                                                anteriores
                                                            </p>
                                                        )}
                                                </div>
                                            )
                                        })}
                                    </section>
                                )}
                            </article>
                        )
                    })
                )}
            </section>

            {cuotaPagando !== null && (
                <div>
                    {!mostrarConfirmacion ? (
                        <section>
                            <h2>
                                Pagar cuota {cuotaPagando.numero}
                            </h2>

                            <p>
                                Pendiente:{" "}
                                {cuotaPagando.monto_pendiente.toLocaleString(
                                    "es-PY"
                                )}
                            </p>

                            <div>
                                <h3>Primer método</h3>

                                <select
                                    value={metodo1Id}
                                    onChange={function (evento) {
                                        setMetodo1Id(
                                            evento.target.value
                                        )
                                    }}
                                >
                                    <option value="">
                                        Seleccioná un método
                                    </option>

                                    {metodosPago
                                        .filter(function (metodo) {
                                            return (
                                                metodo.estado ===
                                                "ACTIVO"
                                            )
                                        })
                                        .map(function (metodo) {
                                            return (
                                                <option
                                                    key={metodo.id}
                                                    value={metodo.id}
                                                >
                                                    {metodo.nombre} (
                                                    {metodo.tipo})
                                                </option>
                                            )
                                        })}
                                </select>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={metodo1Monto}
                                    onChange={function (evento) {
                                        cambiarMetodo1Monto(
                                            evento.target.value
                                        )
                                    }}
                                />
                            </div>

                            <div>
                                <h3>
                                    Segundo método (opcional)
                                </h3>

                                <select
                                    value={metodo2Id}
                                    onChange={function (evento) {
                                        seleccionarMetodo2(
                                            evento.target.value
                                        )
                                    }}
                                >
                                    <option value="">
                                        Sin segundo método
                                    </option>

                                    {metodosPago
                                        .filter(function (metodo) {
                                            return (
                                                metodo.estado ===
                                                    "ACTIVO" &&
                                                String(metodo.id) !==
                                                    metodo1Id
                                            )
                                        })
                                        .map(function (metodo) {
                                            return (
                                                <option
                                                    key={metodo.id}
                                                    value={metodo.id}
                                                >
                                                    {metodo.nombre} (
                                                    {metodo.tipo})
                                                </option>
                                            )
                                        })}
                                </select>

                                {metodo2Id && (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={metodo2Monto}
                                        onChange={function (evento) {
                                            cambiarMetodo2Monto(
                                                evento.target.value
                                            )
                                        }}
                                    />
                                )}
                            </div>

                            <p>
                                Total:{" "}
                                {(
                                    Number(metodo1Monto || 0) +
                                    Number(metodo2Monto || 0)
                                ).toLocaleString("es-PY")}
                            </p>

                            <button
                                type="button"
                                onClick={continuarPago}
                            >
                                Continuar
                            </button>

                            <button
                                type="button"
                                onClick={cancelarPago}
                            >
                                Cancelar
                            </button>
                        </section>
                    ) : (
                        <section>
                            <h2>Confirmar pago</h2>

                            <p>
                                Cuota: {cuotaPagando.numero}
                            </p>

                            <p>
                                Pendiente:{" "}
                                {cuotaPagando.monto_pendiente.toLocaleString(
                                    "es-PY"
                                )}
                            </p>

                            <hr />

                            <p>
                                {metodo1?.nombre}:{" "}
                                {Number(
                                    metodo1Monto
                                ).toLocaleString("es-PY")}
                            </p>

                            {metodo2Id && (
                                <p>
                                    {metodo2?.nombre}:{" "}
                                    {Number(
                                        metodo2Monto
                                    ).toLocaleString("es-PY")}
                                </p>
                            )}

                            <p>
                                Total:{" "}
                                {(
                                    Number(metodo1Monto || 0) +
                                    Number(metodo2Monto || 0)
                                ).toLocaleString("es-PY")}
                            </p>

                            <button
                                type="button"
                                onClick={function () {
                                    setMostrarConfirmacion(false)
                                }}
                            >
                                Volver
                            </button>

                            <button
                                type="button"
                                onClick={confirmarPago}
                            >
                                Confirmar pago
                            </button>
                        </section>
                    )}
                </div>
            )}
        </main>
    )
}