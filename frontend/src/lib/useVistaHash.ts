// =========================================================
// Hook: la vista actual vive en el hash de la URL
//
// La URL es la única fuente de verdad:
//   - cambiar de vista = cambiar el hash, y el navegador guarda cada cambio
//     en el historial, así que los botones atrás/adelante andan solos
//   - atrás/adelante (o editar la URL a mano) disparan "hashchange" y el
//     estado se actualiza desde ahí
// Uso en App.tsx: const [vista, setVista] = useVistaHash()
// =========================================================

import { useCallback, useEffect, useState } from "react"
import type { Vista } from "../components/layout/Layout"
import { VISTA_INICIAL, hashDeVista, vistaDesdeHash } from "./vistaHash"

export function useVistaHash(): [Vista, (vista: Vista) => void] {
    // al abrir la app (o recargar) arranca en la vista que diga la URL
    const [vista, setVista] = useState<Vista>(function () {
        return vistaDesdeHash(window.location.hash) ?? VISTA_INICIAL
    })

    useEffect(function () {
        function sincronizar() {
            const desdeLaUrl = vistaDesdeHash(window.location.hash)

            if (desdeLaUrl === null) {
                // hash vacío o inválido: se escribe el de la vista inicial.
                // replaceState reemplaza la entrada actual (no suma una al
                // historial), así el atrás no cae en una URL sin vista.
                window.history.replaceState(null, "", hashDeVista(VISTA_INICIAL))
                setVista(VISTA_INICIAL)
                return
            }

            setVista(desdeLaUrl)
        }

        // una vez al montar, para dejar escrito el hash si venía vacío
        sincronizar()

        window.addEventListener("hashchange", sincronizar)

        return function () {
            window.removeEventListener("hashchange", sincronizar)
        }
    }, [])

    // Cambiar de vista = asignar el hash (suma una entrada al historial).
    // Si ya estamos en esa vista no hace nada: evita entradas repetidas
    // cuando se toca dos veces la misma pestaña.
    const irA = useCallback(function (nueva: Vista) {
        const destino = hashDeVista(nueva)

        if (window.location.hash === destino) {
            return
        }

        window.location.hash = destino
    }, [])

    return [vista, irA]
}