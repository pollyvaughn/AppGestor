import { useEffect, useState } from "react"
import {
    listarCategorias,
    crearCategoria,
    editarCategoria,
    eliminarCategoria,
} from "../services/categoriaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import Select from "../components/ui/Select"
import ColorPicker from "../components/ui/ColorPicker"

type Tipo = "INGRESO" | "EGRESO"

type Categoria = {
    id: number
    nombre: string
    tipo: Tipo
    color: string | null
}

type Formulario = {
    nombre: string
    tipo: Tipo
    color: string
}

const COLOR_POR_DEFECTO = "#7A7873"

const formularioInicial: Formulario = {
    nombre: "",
    tipo: "EGRESO",
    color: COLOR_POR_DEFECTO,
}

export default function CategoriasPage() {
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    async function cargar() {
        try {
            const datos = await listarCategorias()
            setCategorias(datos)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las categorías"
            )
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    function abrirNueva() {
        setEditando(null)
        setFormulario(formularioInicial)
        setError("")
        setModalAbierto(true)
    }

    function abrirEdicion(categoria: Categoria) {
        setEditando(categoria.id)
        setFormulario({
            nombre: categoria.nombre,
            tipo: categoria.tipo,
            color: categoria.color ?? COLOR_POR_DEFECTO,
        })
        setError("")
        setModalAbierto(true)
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")
        setMensaje("")

        try {
            if (editando === null) {
                await crearCategoria(formulario)
                setMensaje("Categoría creada")
            } else {
                await editarCategoria(editando, formulario)
                setMensaje("Categoría actualizada")
            }

            setModalAbierto(false)
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar la categoría"
            )
        }
    }

    async function eliminar(categoria: Categoria) {
        const confirmar = window.confirm(
            `¿Eliminar la categoría "${categoria.nombre}"?`
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarCategoria(categoria.id)
            setMensaje("Categoría eliminada")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo eliminar la categoría"
            )
        }
    }

    function renderLista(titulo: string, tipo: Tipo) {
        const lista = categorias.filter(function (c) {
            return c.tipo === tipo
        })

        return (
            <section
                className="p-6"
                style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                }}
            >
                <h2
                    className="text-xs mb-4"
                    style={{
                        color: "var(--color-muted-foreground)",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    {titulo}
                </h2>

                {lista.length === 0 && (
                    <p
                        className="text-sm"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Sin categorías.
                    </p>
                )}

                {lista.map(function (categoria) {
                    return (
                        <div
                            key={categoria.id}
                            className="flex items-center justify-between py-2.5"
                            style={{
                                borderBottom: "1px solid var(--color-border)",
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        background:
                                            categoria.color ??
                                            COLOR_POR_DEFECTO,
                                    }}
                                />
                                <span className="text-sm">
                                    {categoria.nombre}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        abrirEdicion(categoria)
                                    }}
                                >
                                    Editar
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        eliminar(categoria)
                                    }}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </section>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-medium">Categorías</h1>

                <Button type="button" onClick={abrirNueva}>
                    + Nueva categoría
                </Button>
            </div>

            {error && !modalAbierto && (
                <p className="text-sm" style={{ color: "var(--color-expense)" }}>
                    {error}
                </p>
            )}

            {mensaje && (
                <p className="text-sm" style={{ color: "var(--color-income)" }}>
                    {mensaje}
                </p>
            )}

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {renderLista("Egresos", "EGRESO")}
                {renderLista("Ingresos", "INGRESO")}
            </div>

            <Modal
                open={modalAbierto}
                title={editando === null ? "Nueva categoría" : "Editar categoría"}
                onClose={function () {
                    setModalAbierto(false)
                }}
            >
                <form onSubmit={guardar} className="space-y-4">
                    <Input
                        id="nombre"
                        label="Nombre"
                        value={formulario.nombre}
                        onChange={function (e) {
                            setFormulario({ ...formulario, nombre: e.target.value })
                        }}
                        required
                        autoFocus
                    />

                    <Select
                        id="tipo"
                        label="Tipo"
                        value={formulario.tipo}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                tipo: e.target.value as Tipo,
                            })
                        }}
                    >
                        <option value="EGRESO">Egreso</option>
                        <option value="INGRESO">Ingreso</option>
                    </Select>

                    <ColorPicker
                        label="Color"
                        value={formulario.color}
                        onChange={function (color) {
                            setFormulario({ ...formulario, color: color })
                        }}
                    />

                    {error && (
                        <p
                            className="text-sm"
                            style={{ color: "var(--color-expense)" }}
                        >
                            {error}
                        </p>
                    )}

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
        </div>
    )
}