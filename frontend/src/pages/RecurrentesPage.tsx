import { useEffect, useState } from "react"
import {
    listarRecurrentes,
    crearRecurrente,
    editarRecurrente,
    eliminarRecurrente,
    generarMovimiento
} from "../services/recurrenteService"
import { listarCategorias } from "../services/categoriaService"
import { listarCuentas } from "../services/cuentaService"

type Recurrente = {
    id: number
    categoria_id: number
    categoria: string
    metodo_pago_id: number | null
    metodo_pago: string | null
    nombre: string
    tipo: string
    monto_base: number
    moneda: string
    frecuencia: string
    proxima_fecha: string | null
    estado: string
}

type Categoria = {
    id: number
    nombre: string
    tipo: string
}

type MetodoPago = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    estado: string
}

type FormularioRecurrente = {
    categoria_id: string
    metodo_pago_id: string
    nombre: string
    tipo: string
    monto_base: string
    moneda: string
    frecuencia: string
    proxima_fecha: string
}

type FiltroTipo = "" | "INGRESO" | "EGRESO"

const formularioInicial: FormularioRecurrente = {
    categoria_id: "",
    metodo_pago_id: "",
    nombre: "",
    tipo: "EGRESO",
    monto_base: "",
    moneda: "PYG",
    frecuencia: "MENSUAL",
    proxima_fecha: ""
}

export default function RecurrentesPage() {
    const [recurrentes, setRecurrentes] = useState<Recurrente[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])

    const [formulario, setFormulario] = useState<FormularioRecurrente>(
        formularioInicial
    )
    const [recurrenteEditando, setRecurrenteEditando] =
        useState<number | null>(null)

    const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("")

    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    async function cargarRecurrentes(tipo: FiltroTipo) {
        try {
            const datos = await listarRecurrentes(
                tipo === "" ? undefined : tipo
            )
            setRecurrentes(datos)
        } catch {
            setError("No se pudieron cargar los recurrentes")
        }
    }

    async function cargarOpciones() {
        try {
            const categoriasDatos = await listarCategorias()
            const metodosDatos = await listarCuentas()

            setCategorias(categoriasDatos)
            setMetodosPago(metodosDatos)
        } catch {
            setError("No se pudieron cargar las categorías y métodos de pago")
        }
    }

    useEffect(function () {
        cargarOpciones()
    }, [])

    useEffect(function () {
        cargarRecurrentes(filtroTipo)
    }, [filtroTipo])

    function manejarCambio(
        evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = evento.target

        setFormulario(function (actual) {
            if (name === "tipo") {
                return {
                    ...actual,
                    tipo: value,
                    categoria_id: ""
                }
            }

            return {
                ...actual,
                [name]: value
            }
        })
    }

    function limpiarFormulario() {
        setFormulario(formularioInicial)
        setRecurrenteEditando(null)
    }

    async function manejarSubmit(
        evento: React.FormEvent<HTMLFormElement>
    ) {
        evento.preventDefault()

        setError("")
        setMensaje("")

        const datos = {
            categoria_id: Number(formulario.categoria_id),
            metodo_pago_id:
                formulario.metodo_pago_id === ""
                    ? null
                    : Number(formulario.metodo_pago_id),
            nombre: formulario.nombre,
            tipo: formulario.tipo,
            monto_base: Number(formulario.monto_base),
            moneda: formulario.moneda,
            frecuencia: formulario.frecuencia,
            proxima_fecha:
                formulario.proxima_fecha === ""
                    ? null
                    : formulario.proxima_fecha
        }

        try {
            if (recurrenteEditando === null) {
                await crearRecurrente(datos)
                setMensaje("Recurrente creado correctamente")
            } else {
                await editarRecurrente(recurrenteEditando, datos)
                setMensaje("Recurrente actualizado correctamente")
            }

            limpiarFormulario()
            await cargarRecurrentes(filtroTipo)
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("No se pudo guardar el recurrente")
            }
        }
    }

    function prepararEdicion(recurrente: Recurrente) {
        setRecurrenteEditando(recurrente.id)

        setFormulario({
            categoria_id: String(recurrente.categoria_id),
            metodo_pago_id:
                recurrente.metodo_pago_id === null
                    ? ""
                    : String(recurrente.metodo_pago_id),
            nombre: recurrente.nombre,
            tipo: recurrente.tipo,
            monto_base: String(recurrente.monto_base),
            moneda: recurrente.moneda,
            frecuencia: recurrente.frecuencia,
            proxima_fecha: recurrente.proxima_fecha ?? ""
        })
    }

    async function manejarEliminar(id: number) {
        const confirmar = window.confirm(
            "¿Querés desactivar este recurrente?"
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarRecurrente(id)

            setMensaje("Recurrente desactivado correctamente")

            if (recurrenteEditando === id) {
                limpiarFormulario()
            }

            await cargarRecurrentes(filtroTipo)
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("No se pudo desactivar el recurrente")
            }
        }
    }

    async function manejarGenerar(recurrente: Recurrente) {
        setError("")
        setMensaje("")

        const respuesta = window.prompt(
            "Monto de este período. Si lo cambiás, el nuevo monto pasa a ser el monto base de los períodos siguientes.",
            String(recurrente.monto_base)
        )

        if (respuesta === null) {
            return
        }

        let monto: number | undefined = undefined

        if (respuesta.trim() !== "") {
            monto = Number(respuesta)

            if (Number.isNaN(monto) || monto <= 0) {
                setError("El monto debe ser un número mayor a 0")
                return
            }
        }

        try {
            const resultado = await generarMovimiento(
                recurrente.id,
                monto
            )

            setMensaje(
                `Movimiento generado. Próxima fecha: ${resultado.proxima_fecha}`
            )

            await cargarRecurrentes(filtroTipo)
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("No se pudo generar el movimiento")
            }
        }
    }

    return (
        <main>
            <h1>Recurrentes</h1>

            {error && <p>{error}</p>}
            {mensaje && <p>{mensaje}</p>}

            <section>
                <h2>
                    {recurrenteEditando === null
                        ? "Nuevo recurrente"
                        : "Editar recurrente"}
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
                        name="tipo"
                        value={formulario.tipo}
                        onChange={manejarCambio}
                    >
                        <option value="EGRESO">Egreso</option>
                        <option value="INGRESO">Ingreso</option>
                    </select>

                    <select
                        name="categoria_id"
                        value={formulario.categoria_id}
                        onChange={manejarCambio}
                        required
                    >
                        <option value="">Seleccioná una categoría</option>

                        {categorias
                            .filter(function (categoria) {
                                return categoria.tipo === formulario.tipo
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
                    </select>

                    <select
                        name="metodo_pago_id"
                        value={formulario.metodo_pago_id}
                        onChange={manejarCambio}
                    >
                        <option value="">Sin método de pago</option>

                        {metodosPago
                            .filter(function (metodo) {
                                return metodo.estado === "ACTIVO"
                            })
                            .map(function (metodo) {
                                return (
                                    <option
                                        key={metodo.id}
                                        value={metodo.id}
                                    >
                                        {metodo.nombre} ({metodo.tipo})
                                    </option>
                                )
                            })}
                    </select>

                    <input
                        name="monto_base"
                        type="number"
                        placeholder="Monto base"
                        value={formulario.monto_base}
                        onChange={manejarCambio}
                        min="0"
                        step="0.01"
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

                    <select
                        name="frecuencia"
                        value={formulario.frecuencia}
                        onChange={manejarCambio}
                    >
                        <option value="DIARIA">Diaria</option>
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                        <option value="BIMESTRAL">Bimestral</option>
                        <option value="TRIMESTRAL">Trimestral</option>
                        <option value="SEMESTRAL">Semestral</option>
                        <option value="ANUAL">Anual</option>
                    </select>

                    <input
                        name="proxima_fecha"
                        type="date"
                        value={formulario.proxima_fecha}
                        onChange={manejarCambio}
                    />

                    <button type="submit">
                        {recurrenteEditando === null
                            ? "Crear recurrente"
                            : "Guardar cambios"}
                    </button>

                    {recurrenteEditando !== null && (
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
                <h2>Recurrentes registrados</h2>

                <select
                    value={filtroTipo}
                    onChange={function (evento) {
                        setFiltroTipo(evento.target.value as FiltroTipo)
                    }}
                >
                    <option value="">Todos</option>
                    <option value="INGRESO">Ingresos</option>
                    <option value="EGRESO">Egresos</option>
                </select>

                {recurrentes.length === 0 ? (
                    <p>No tenés recurrentes registrados.</p>
                ) : (
                    recurrentes.map(function (recurrente) {
                        return (
                            <article key={recurrente.id}>
                                <h3>{recurrente.nombre}</h3>

                                <p>
                                    Tipo: {recurrente.tipo}
                                </p>

                                <p>
                                    Categoría: {recurrente.categoria}
                                </p>

                                <p>
                                    Método de pago:{" "}
                                    {recurrente.metodo_pago ?? "Sin definir"}
                                </p>

                                <p>
                                    Monto base:{" "}
                                    {recurrente.monto_base.toLocaleString(
                                        "es-PY"
                                    )}{" "}
                                    {recurrente.moneda}
                                </p>

                                <p>
                                    Frecuencia: {recurrente.frecuencia}
                                </p>

                                <p>
                                    Próxima fecha:{" "}
                                    {recurrente.proxima_fecha ?? "No definida"}
                                </p>

                                <button
                                    onClick={function () {
                                        manejarGenerar(recurrente)
                                    }}
                                >
                                    Generar movimiento
                                </button>

                                <button
                                    onClick={function () {
                                        prepararEdicion(recurrente)
                                    }}
                                >
                                    Editar
                                </button>

                                <button
                                    onClick={function () {
                                        manejarEliminar(recurrente.id)
                                    }}
                                >
                                    Desactivar
                                </button>
                            </article>
                        )
                    })
                )}
            </section>
        </main>
    )
}