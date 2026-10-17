// Tope mensual de gasto que el usuario define a mano para el gráfico de
// ritmo. Se guarda en este navegador, por usuario y por moneda. No viaja
// a la base de datos.

function clave(moneda: string) {
    let usuarioId = "anonimo"

    try {
        const guardado = localStorage.getItem("usuario")

        if (guardado) {
            usuarioId = String(JSON.parse(guardado).id)
        }
    } catch {
    }

    return `tope-gasto:${usuarioId}:${moneda}`
}

export function leerTope(moneda: string): number | null {
    try {
        const texto = localStorage.getItem(clave(moneda))

        if (texto === null) {
            return null
        }

        const valor = Number(texto)

        return valor > 0 ? valor : null
    } catch {
        return null
    }
}

export function guardarTope(moneda: string, valor: number | null) {
    try {
        if (valor === null) {
            localStorage.removeItem(clave(moneda))
        } else {
            localStorage.setItem(clave(moneda), String(valor))
        }
    } catch {
    }
}