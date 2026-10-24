// =========================================================
// Navegación con teclado para menús (role="menu")
// Flecha abajo / arriba mueven el foco entre las opciones,
// Home va a la primera y End a la última.
// Lo usan el menú "Nuevo" (Layout) y el menú de los tres puntos (MenuAcciones).
// =========================================================

import type { KeyboardEvent } from "react"

// menu: el contenedor que tiene las opciones (cada una con role="menuitem")
export function moverFocoEnMenu(evento: KeyboardEvent, menu: HTMLElement | null) {
    if (!menu) {
        return
    }

    const opciones = Array.from(
        menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    )

    if (opciones.length === 0) {
        return
    }

    // -1 si el foco no está en ninguna opción
    const actual = opciones.indexOf(document.activeElement as HTMLElement)

    let destino: number

    if (evento.key === "ArrowDown") {
        destino = (actual + 1) % opciones.length
    } else if (evento.key === "ArrowUp") {
        destino = actual <= 0 ? opciones.length - 1 : actual - 1
    } else if (evento.key === "Home") {
        destino = 0
    } else if (evento.key === "End") {
        destino = opciones.length - 1
    } else {
        return
    }

    // evita que la flecha haga scroll de la página
    evento.preventDefault()
    opciones[destino].focus()
}