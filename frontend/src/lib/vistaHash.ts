// =========================================================
// Vista <-> hash de la URL (punto 10: que el "atrás" funcione)
//
// Lógica pura (solo texto): no importa React, así se puede probar con
// `node --test` sin compilar. El hook que la usa es useVistaHash.ts.
//
// Formato del hash: "#/mensual", "#/global", etc. La barra después del
// numeral evita que el navegador intente saltar a un elemento de la página
// con ese id (por ejemplo un input con id="cuenta").
// =========================================================

import type { Vista } from "../components/layout/Layout"

// Vista con la que arranca la app cuando la URL no trae ninguna
export const VISTA_INICIAL: Vista = "mensual"

// Record<Vista, true> obliga a listar TODAS las vistas: si alguien agrega
// una vista nueva en Layout.tsx y se olvida de ponerla acá, tsc da error.
const VISTAS_VALIDAS: Record<Vista, true> = {
    global: true,
    mensual: true,
    tarjetas: true,
    recurrentes: true,
    categorias: true,
    cuentas: true,
}

function esVista(texto: string): texto is Vista {
    // hasOwnProperty para que "constructor" o "toString" no pasen como vistas
    return Object.prototype.hasOwnProperty.call(VISTAS_VALIDAS, texto)
}

// "#/global" => "global". Devuelve null si no hay hash o no es una vista
// (el que llama decide qué hacer: la app usa VISTA_INICIAL).
// Tolera "#global", mayúsculas y un "?algo" al final.
export function vistaDesdeHash(hash: string): Vista | null {
    const texto = hash.replace(/^#\/?/, "").split("?")[0].toLowerCase()

    return esVista(texto) ? texto : null
}

// "global" => "#/global"
export function hashDeVista(vista: Vista) {
    return `#/${vista}`
}