import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { crearCategoria } from "../../services/categoriaService"
import Button from "./Button"
import ColorPicker from "./ColorPicker"
import Input from "./Input"
import Mensaje from "./Mensaje"
import Modal from "./Modal"

type Tipo = "INGRESO" | "EGRESO"

type CategoriaRapidaProps = {
    tipo: Tipo
    // se llama con el id de la categoría recién creada
    onCreada: (id: number) => void
}

const COLOR_POR_DEFECTO = "#7A7873"

export default function CategoriaRapida({
    tipo,
    onCreada,
}: CategoriaRapidaProps) {
    const [abierto, setAbierto] = useState(false)
    const [nombre, setNombre] = useState("")
    const [color, setColor] = useState(COLOR_POR_DEFECTO)
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)

    useEffect(
        function () {
            if (!abierto) {
                return
            }

            setNombre("")
            setColor(COLOR_POR_DEFECTO)
            setError("")
            setGuardando(false)
        },
        [abierto]
    )

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        // este modal vive dentro del formulario de otro: el submit no debe subir
        evento.stopPropagation()
        setError("")

        const limpio = nombre.trim()

        if (limpio === "") {
            setError("Escribí un nombre")
            return
        }

        setGuardando(true)

        try {
            const resultado = await crearCategoria({
                nombre: limpio,
                tipo: tipo,
                color: color,
            })

            setAbierto(false)
            onCreada(resultado.id)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo crear la categoría"
            )
        } finally {
            setGuardando(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={function () {
                    setAbierto(true)
                }}
                className="text-xs underline underline-offset-2 min-h-11 md:min-h-0"
                style={{ color: "var(--color-muted-foreground)" }}
            >
                Crear categoría
            </button>

            {createPortal(
                <Modal
                    open={abierto}
                    title={
                        tipo === "INGRESO"
                            ? "Nueva categoría de ingreso"
                            : "Nueva categoría de egreso"
                    }
                    onClose={function () {
                        setAbierto(false)
                    }}
                >
                    <form onSubmit={guardar} className="space-y-4">
                        <Input
                            id="categoria-rapida-nombre"
                            label="Nombre"
                            value={nombre}
                            onChange={function (e) {
                                setNombre(e.target.value)
                            }}
                            maxLength={100}
                            required
                            autoFocus
                        />

                        <ColorPicker
                            label="Color"
                            value={color}
                            onChange={setColor}
                        />

                        {error && <Mensaje tipo="error">{error}</Mensaje>}

                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={function () {
                                    setAbierto(false)
                                }}
                            >
                                Cancelar
                            </Button>

                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={guardando}
                            >
                                Guardar
                            </Button>
                        </div>
                    </form>
                </Modal>,
                document.body
            )}
        </>
    )
}