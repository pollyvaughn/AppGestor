import { useEffect, useState } from "react"
import {
    listarTarjetas,
    crearTarjeta,
    editarTarjeta,
    eliminarTarjeta
} from "../services/tarjetaService"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
    limite_credito: number
    fecha_cierre: number
    fecha_vencimiento: number
    porcentaje_pago_minimo: number | null
}

type FormularioTarjeta = {
    nombre: string
    moneda: string
    limite_credito: string
    fecha_cierre: string
    fecha_vencimiento: string
    porcentaje_pago_minimo: string
}

const formularioInicial: FormularioTarjeta = {
    nombre: "",
    moneda: "PYG",
    limite_credito: "",
    fecha_cierre: "",
    fecha_vencimiento: "",
    porcentaje_pago_minimo: ""
}

export default function TarjetasPage() {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    const [formulario, setFormulario] = useState<FormularioTarjeta>(
        formularioInicial
    )
    const [tarjetaEditando, setTarjetaEditando] = useState<number | null>(null)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    async function cargarTarjetas() {
        try {
            const datos = await listarTarjetas()
            setTarjetas(datos)
        } catch {
            setError("No se pudieron cargar las tarjetas")
        }
    }

    useEffect(function () {
        cargarTarjetas()
    }, [])

    function manejarCambio(
        evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = evento.target

        setFormulario(function (actual) {
            return {
                ...actual,
                [name]: value
            }
        })
    }

    function limpiarFormulario() {
        setFormulario(formularioInicial)
        setTarjetaEditando(null)
    }

    async function manejarSubmit(
        evento: React.FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault()

        setError("")
        setMensaje("")

        const datos = {
            nombre: formulario.nombre,
            moneda: formulario.moneda,
            limite_credito: Number(formulario.limite_credito),
            fecha_cierre: Number(formulario.fecha_cierre),
            fecha_vencimiento: Number(formulario.fecha_vencimiento),
            porcentaje_pago_minimo:
                formulario.porcentaje_pago_minimo === ""
                    ? null
                    : Number(formulario.porcentaje_pago_minimo)
        }

        try {
            if (tarjetaEditando === null) {
                await crearTarjeta(datos)
                setMensaje("Tarjeta creada correctamente")
            } else {
                await editarTarjeta(tarjetaEditando, datos)
                setMensaje("Tarjeta actualizada correctamente")
            }

            limpiarFormulario()
            await cargarTarjetas()
        } catch {
            setError("No se pudo guardar la tarjeta")
        }
    }

    function prepararEdicion(tarjeta: Tarjeta) {
        setTarjetaEditando(tarjeta.id)

        setFormulario({
            nombre: tarjeta.nombre,
            moneda: tarjeta.moneda,
            limite_credito: String(tarjeta.limite_credito),
            fecha_cierre: String(tarjeta.fecha_cierre),
            fecha_vencimiento: String(tarjeta.fecha_vencimiento),
            porcentaje_pago_minimo:
                tarjeta.porcentaje_pago_minimo === null
                    ? ""
                    : String(tarjeta.porcentaje_pago_minimo)
        })
    }

    async function manejarEliminar(id: number) {
        const confirmar = window.confirm(
            "¿Querés dar de baja esta tarjeta?"
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarTarjeta(id)

            setMensaje("Tarjeta dada de baja correctamente")

            if (tarjetaEditando === id) {
                limpiarFormulario()
            }

            await cargarTarjetas()
        } catch {
            setError("No se pudo dar de baja la tarjeta")
        }
    }

    return (
        <main>
            <h1>Mis tarjetas</h1>

            {error && <p>{error}</p>}
            {mensaje && <p>{mensaje}</p>}

            <section>
                <h2>
                    {tarjetaEditando === null
                        ? "Nueva tarjeta"
                        : "Editar tarjeta"}
                </h2>

                <form onSubmit={manejarSubmit}>
                    <input
                        name="nombre"
                        placeholder="Nombre"
                        value={formulario.nombre}
                        onChange={manejarCambio}
                        required
                    />

                    <select
                        name="moneda"
                        value={formulario.moneda}
                        onChange={manejarCambio}
                    >
                        <option value="PYG">PYG</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="ARS">ARS</option>
                        <option value="BRL">BRL</option>
                    </select>

                    <input
                        name="limite_credito"
                        type="number"
                        placeholder="Límite de crédito"
                        value={formulario.limite_credito}
                        onChange={manejarCambio}
                        min="0"
                        step="0.01"
                        required
                    />

                    <input
                        name="fecha_cierre"
                        type="number"
                        placeholder="Día de cierre"
                        value={formulario.fecha_cierre}
                        onChange={manejarCambio}
                        min="1"
                        max="31"
                        required
                    />

                    <input
                        name="fecha_vencimiento"
                        type="number"
                        placeholder="Día de vencimiento"
                        value={formulario.fecha_vencimiento}
                        onChange={manejarCambio}
                        min="1"
                        max="31"
                        required
                    />

                    <input
                        name="porcentaje_pago_minimo"
                        type="number"
                        placeholder="% pago mínimo"
                        value={formulario.porcentaje_pago_minimo}
                        onChange={manejarCambio}
                        min="0"
                        max="100"
                        step="0.01"
                    />

                    <button type="submit">
                        {tarjetaEditando === null
                            ? "Crear tarjeta"
                            : "Guardar cambios"}
                    </button>

                    {tarjetaEditando !== null && (
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
                <h2>Tarjetas registradas</h2>

                {tarjetas.length === 0 ? (
                    <p>No tenés tarjetas registradas.</p>
                ) : (
                    tarjetas.map(function (tarjeta) {
                        return (
                            <article key={tarjeta.id}>
                                <h3>{tarjeta.nombre}</h3>

                                <p>
                                    Límite: {tarjeta.limite_credito}{" "}
                                    {tarjeta.moneda}
                                </p>

                                <p>
                                    Cierre: día {tarjeta.fecha_cierre}
                                </p>

                                <p>
                                    Vencimiento: día{" "}
                                    {tarjeta.fecha_vencimiento}
                                </p>

                                <p>
                                    Pago mínimo:{" "}
                                    {tarjeta.porcentaje_pago_minimo ?? "No definido"}%
                                </p>

                                <p>
                                    Estado: {tarjeta.estado}
                                </p>

                                <button
                                    onClick={function () {
                                        prepararEdicion(tarjeta)
                                    }}
                                >
                                    Editar
                                </button>

                                <button
                                    onClick={function () {
                                        manejarEliminar(tarjeta.id)
                                    }}
                                >
                                    Dar de baja
                                </button>
                            </article>
                        )
                    })
                )}
            </section>
        </main>
    )
}