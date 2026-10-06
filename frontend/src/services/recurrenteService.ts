const API_URL = "http://127.0.0.1:8000"

function obtenerHeaders() {
    const token = localStorage.getItem("token")

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    }
}

async function crearError(
    respuesta: Response,
    mensajePorDefecto: string
) {
    try {
        const error = await respuesta.json()

        if (typeof error.detail === "string") {
            return new Error(error.detail)
        }
    } catch {
        // si no vino un JSON, usamos el mensaje por defecto
    }

    return new Error(mensajePorDefecto)
}

export async function listarRecurrentes(tipo?: "INGRESO" | "EGRESO") {
    const parametros = tipo ? `?tipo=${tipo}` : ""

    const respuesta = await fetch(
        `${API_URL}/recurrentes/${parametros}`,
        {
            headers: obtenerHeaders()
        }
    )

    if (!respuesta.ok) {
        throw await crearError(
            respuesta,
            "No se pudieron obtener los recurrentes"
        )
    }

    return respuesta.json()
}

export async function crearRecurrente(datos: object) {
    const respuesta = await fetch(`${API_URL}/recurrentes/`, {
        method: "POST",
        headers: obtenerHeaders(),
        body: JSON.stringify(datos)
    })

    if (!respuesta.ok) {
        throw await crearError(
            respuesta,
            "No se pudo crear el recurrente"
        )
    }

    return respuesta.json()
}

export async function editarRecurrente(id: number, datos: object) {
    const respuesta = await fetch(`${API_URL}/recurrentes/${id}`, {
        method: "PUT",
        headers: obtenerHeaders(),
        body: JSON.stringify(datos)
    })

    if (!respuesta.ok) {
        throw await crearError(
            respuesta,
            "No se pudo editar el recurrente"
        )
    }

    return respuesta.json()
}

export async function eliminarRecurrente(id: number) {
    const respuesta = await fetch(`${API_URL}/recurrentes/${id}`, {
        method: "DELETE",
        headers: obtenerHeaders()
    })

    if (!respuesta.ok) {
        throw await crearError(
            respuesta,
            "No se pudo desactivar el recurrente"
        )
    }

    return respuesta.json()
}

export async function generarMovimiento(id: number, monto?: number) {
    const parametros = monto !== undefined ? `?monto=${monto}` : ""

    const respuesta = await fetch(
        `${API_URL}/recurrentes/${id}/generar${parametros}`,
        {
            method: "POST",
            headers: obtenerHeaders()
        }
    )

    if (!respuesta.ok) {
        throw await crearError(
            respuesta,
            "No se pudo generar el movimiento"
        )
    }

    return respuesta.json()
}