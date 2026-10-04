const API_URL = "http://127.0.0.1:8000"

function obtenerHeaders() {
    const token = localStorage.getItem("token")

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    }
}

export async function listarTarjetas() {
    const respuesta = await fetch(`${API_URL}/tarjetas/`, {
        headers: obtenerHeaders()
    })

    if (!respuesta.ok) {
        throw new Error("No se pudieron obtener las tarjetas")
    }

    return respuesta.json()
}

export async function crearTarjeta(datos: object) {
    const respuesta = await fetch(`${API_URL}/tarjetas/`, {
        method: "POST",
        headers: obtenerHeaders(),
        body: JSON.stringify(datos)
    })

    if (!respuesta.ok) {
        throw new Error("No se pudo crear la tarjeta")
    }

    return respuesta.json()
}

export async function editarTarjeta(id: number, datos: object) {
    const respuesta = await fetch(`${API_URL}/tarjetas/${id}`, {
        method: "PUT",
        headers: obtenerHeaders(),
        body: JSON.stringify(datos)
    })

    if (!respuesta.ok) {
        throw new Error("No se pudo editar la tarjeta")
    }

    return respuesta.json()
}

export async function eliminarTarjeta(id: number) {
    const respuesta = await fetch(`${API_URL}/tarjetas/${id}`, {
        method: "DELETE",
        headers: obtenerHeaders()
    })

    if (!respuesta.ok) {
        throw new Error("No se pudo dar de baja la tarjeta")
    }

    return respuesta.json()
}