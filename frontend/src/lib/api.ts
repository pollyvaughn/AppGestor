const API_URL = "http://127.0.0.1:8000"

export class ApiError extends Error {
    status: number

    constructor(mensaje: string, status: number) {
        super(mensaje)
        this.status = status
    }
}

type Opciones = {
    method?: string
    body?: unknown
}

export async function api<T = any>(
    ruta: string,
    opciones: Opciones = {}
): Promise<T> {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: opciones.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body:
            opciones.body !== undefined
                ? JSON.stringify(opciones.body)
                : undefined
    })

    // Token vencido: cerrar sesión y volver al login
    if (respuesta.status === 401 && token) {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        window.location.reload()
        throw new ApiError("La sesión expiró", 401)
    }

    let datos: any = null

    try {
        datos = await respuesta.json()
    } catch {
        // la respuesta no trajo JSON
    }

    if (!respuesta.ok) {
        const mensaje =
            typeof datos?.detail === "string"
                ? datos.detail
                : "Ocurrió un error"

        throw new ApiError(mensaje, respuesta.status)
    }

    return datos as T
}