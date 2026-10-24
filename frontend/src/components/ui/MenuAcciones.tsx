// =========================================================
// Menú de los tres puntos (⋯) de cada tarjeta o fila
// - Click afuera o Escape lo cierran (Escape devuelve el foco al botón)
// - Al abrir, el foco va a la primera opción
// - Flechas arriba/abajo, Home y End mueven entre opciones
// =========================================================

import { useEffect, useRef, useState } from "react"
import { moverFocoEnMenu } from "../../lib/menuTeclado"

type Accion = {
    label: string
    onClick: () => void
}

type MenuAccionesProps = {
    // describe a qué pertenece el menú, ej. "Cuenta Itaú"
    etiqueta: string
    acciones: Accion[]
}

export default function MenuAcciones({
    etiqueta,
    acciones,
}: MenuAccionesProps) {
    const [abierto, setAbierto] = useState(false)
    const contenedorRef = useRef<HTMLDivElement>(null)
    const botonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // click afuera o Escape cierran el menú
    useEffect(
        function () {
            if (!abierto) {
                return
            }

            function alHacerClick(e: MouseEvent) {
                if (
                    contenedorRef.current &&
                    !contenedorRef.current.contains(e.target as Node)
                ) {
                    setAbierto(false)
                }
            }

            function alPresionar(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    setAbierto(false)
                    botonRef.current?.focus()
                }
            }

            document.addEventListener("mousedown", alHacerClick)
            document.addEventListener("keydown", alPresionar)

            return function () {
                document.removeEventListener("mousedown", alHacerClick)
                document.removeEventListener("keydown", alPresionar)
            }
        },
        [abierto]
    )

    // al abrir, el foco va a la primera opción
    useEffect(
        function () {
            if (!abierto) {
                return
            }

            menuRef.current
                ?.querySelector<HTMLElement>('[role="menuitem"]')
                ?.focus()
        },
        [abierto]
    )

    return (
        <div ref={contenedorRef} className="relative">
            <button
                ref={botonRef}
                type="button"
                aria-label={`Más opciones de ${etiqueta}`}
                aria-haspopup="menu"
                aria-expanded={abierto}
                onClick={function () {
                    setAbierto(!abierto)
                }}
                className="flex items-center justify-center"
                style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    border: "none",
                    background: "transparent",
                    borderRadius: 0,
                    color: "var(--color-muted-foreground)",
                    padding: 0,
                    lineHeight: 1,
                    fontSize: "1.3rem",
                }}
            >
                ⋮
            </button>

            {abierto && (
                <div
                    ref={menuRef}
                    role="menu"
                    aria-label={`Opciones de ${etiqueta}`}
                    onKeyDown={function (e) {
                        moverFocoEnMenu(e, menuRef.current)
                    }}
                    className="absolute right-0 top-full mt-1 z-30 flex flex-col min-w-36 overflow-hidden"
                    style={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "0 4px 12px rgba(28,28,26,0.15)",
                    }}
                >
                    {acciones.map(function (accion) {
                        return (
                            <button
                                key={accion.label}
                                type="button"
                                role="menuitem"
                                onClick={function () {
                                    // el foco vuelve al botón antes de cerrar:
                                    // si la acción abre un modal, al cerrarlo
                                    // el foco no se pierde
                                    botonRef.current?.focus()
                                    setAbierto(false)
                                    accion.onClick()
                                }}
                                className="text-left text-sm px-3 py-2 min-h-11 md:min-h-0"
                            >
                                {accion.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}