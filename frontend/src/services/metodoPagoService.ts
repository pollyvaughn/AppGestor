const API_URL = "http://127.0.0.1:8000"

function obtenerHeaders() {
    const token = localStorage.getItem("token")

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    }
}

export async function listarMetodosPago() {
    const respuesta = await fetch(`${API_URL}/metodos-pago/`, {
        headers: obtenerHeaders()
    })

    if (!respuesta.ok) {
        throw new Error("No se pudieron obtener los métodos de pago")
    }

    return respuesta.json()
}