import { useEffect, useState } from "react"
import {
    listarCategorias,
    crearCategoria,
    editarCategoria,
    eliminarCategoria,
    reactivarCategoria,
} from "../services/categoriaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import Select from "../components/ui/Select"
import ColorPicker from "../components/ui/ColorPicker"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import MenuAcciones from "../components/ui/MenuAcciones"
import Pestanas from "../components/ui/Pestanas"

type Tipo = "INGRESO" | "EGRESO"

type Categoria = {
    id: number
    nombre: string
    tipo: Tipo
    color: string | null
    // MySQL devuelve BOOLEAN como 1 o 0
    estado: boolean | number
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
    const [cargando, setCargando] = useState(true)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")
    const [vista, setVista] = useState<"activas" | "desactivadas">("activas")

    // el aviso de éxito se va solo a los 4 segundos
    useEffect(
        function () {
            if (!mensaje) {
                return
            }

            const temporizador = setTimeout(function () {
                setMensaje("")
            }, 4000)

            return function () {
                clearTimeout(temporizador)
            }
        },
        [mensaje]
    )

    async function cargar() {
        try {
            // true: trae también las desactivadas, para poder reactivarlas
            const datos = await listarCategorias(true)
            setCategorias(datos)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las categorías"
            )
        } finally {
            setCargando(false)
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

    // El backend no borra la categoría: la marca como inactiva.
    // Los movimientos anteriores siguen mostrándola.
    async function desactivar(categoria: Categoria) {
        const confirmar = window.confirm(
            `¿Desactivar la categoría "${categoria.nombre}"? Deja de aparecer al registrar movimientos, pero los movimientos anteriores la conservan. Después la podés reactivar.`
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarCategoria(categoria.id)
            setMensaje("Categoría desactivada")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo desactivar la categoría"
            )
        }
    }

    async function reactivar(categoria: Categoria) {
        setError("")
        setMensaje("")

        try {
            await reactivarCategoria(categoria.id)
            setMensaje("Categoría reactivada")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo reactivar la categoría"
            )
        }
    }

    const activas = categorias.filter(function (c) {
        return Boolean(c.estado)
    })

    const desactivadas = categorias.filter(function (c) {
        return !c.estado
    })

    function renderLista(titulo: string, tipo: Tipo) {
        const lista = (vista === "activas" ? activas : desactivadas).filter(
            function (c) {
                return c.tipo === tipo
            }
        )

        return (
            <section
                className="flex flex-col overflow-hidden p-6"
                style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    minHeight: 0,
                    maxHeight: "75dvh",
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

                <div
                    className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
                    style={{
                        overscrollBehavior: "contain",
                    }}
                >
                    {lista.length === 0 && (
                        <EstadoVacio
                            texto={
                                vista === "activas"
                                    ? "Sin categorías."
                                    : "No tenés categorías desactivadas."
                            }
                        />
                    )}

                    {lista.map(function (categoria) {
                        const desactivada = !Boolean(categoria.estado)

                        return (
                            <div
                                key={categoria.id}
                                className="flex items-center justify-between gap-3 py-2.5"
                                style={{
                                    borderBottom: "1px solid var(--color-border)",
                                }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{
                                            background:
                                                categoria.color ??
                                                COLOR_POR_DEFECTO,
                                            opacity: desactivada ? 0.5 : 1,
                                        }}
                                    />
                                    <span
                                        className="text-sm truncate"
                                        style={{
                                            color: desactivada
                                                ? "var(--color-muted-foreground)"
                                                : "inherit",
                                        }}
                                    >
                                        {categoria.nombre}
                                        {vista === "desactivadas" && (
                                            <span className="text-xs">
                                                {" · "}
                                                {categoria.tipo === "INGRESO"
                                                    ? "Ingreso"
                                                    : "Egreso"}
                                            </span>
                                        )}
                                    </span>
                                </div>

                                {vista === "activas" ? (
                                    <div className="shrink-0">
                                        <MenuAcciones
                                            etiqueta={categoria.nombre}
                                            acciones={[
                                                {
                                                    label: "Editar",
                                                    onClick: function () {
                                                        abrirEdicion(categoria)
                                                    },
                                                },
                                                {
                                                    label: "Desactivar",
                                                    onClick: function () {
                                                        desactivar(categoria)
                                                    },
                                                },
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        aria-label={`Reactivar ${categoria.nombre}`}
                                        className="!py-1 !text-xs shrink-0"
                                        onClick={function () {
                                            reactivar(categoria)
                                        }}
                                    >
                                        Reactivar
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Categorías</h1>

                <Button type="button" onClick={abrirNueva}>
                    + Nueva categoría
                </Button>
            </div>

            {error && !modalAbierto && <Mensaje tipo="error">{error}</Mensaje>}

            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}

            {cargando ? (
                <Cargando />
            ) : (
                <>
                    <Pestanas
                        idBase="categorias"
                        etiqueta="Filtrar categorías"
                        pestanas={[
                            { key: "activas", label: "Activadas" },
                            { key: "desactivadas", label: "Desactivadas" },
                        ]}
                        value={vista}
                        onChange={function (key) {
                            if (key === "activas" || key === "desactivadas") {
                                setVista(key)
                            }
                        }}
                    />

                    <div
                        id={`categorias-panel-${vista}`}
                        role="tabpanel"
                        aria-labelledby={`categorias-tab-${vista}`}
                        tabIndex={0}
                        className="grid gap-6 grid-cols-1 md:grid-cols-2"
                    >
                        {renderLista("Egresos", "EGRESO")}
                        {renderLista("Ingresos", "INGRESO")}
                    </div>
                </>
            )}

            <Modal
                open={modalAbierto}
                title={
                    editando === null ? "Nueva categoría" : "Editar categoría"
                }
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
        </div>
    )
}