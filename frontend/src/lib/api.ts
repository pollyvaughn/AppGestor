const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"

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

    let respuesta: Response

    try {
        respuesta = await fetch(`${API_URL}${ruta}`, {
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
    } catch {
        throw new ApiError("No se pudo conectar con el servidor", 0)
    }

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
    }

    if (!respuesta.ok) {
        let mensaje = "Ocurrió un error"

        if (typeof datos?.detail === "string") {
            mensaje = datos.detail
        } else if (Array.isArray(datos?.detail)) {
            // FastAPI devuelve una lista cuando falla la validación (422)
            mensaje = "Revisá los datos ingresados"
        }

        throw new ApiError(mensaje, respuesta.status)
    }

    return datos as T
}