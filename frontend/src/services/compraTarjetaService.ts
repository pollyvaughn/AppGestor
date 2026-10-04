const API_URL = "http://127.0.0.1:8000"

function obtenerHeaders() {
    const token = localStorage.getItem("token")

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    }
}

export async function listarCompras() {
    const respuesta = await fetch(`${API_URL}/compras-tarjeta/`, {
        headers: obtenerHeaders()
    })

    if (!respuesta.ok) {
        throw new Error("No se pudieron obtener las compras")
    }

    return respuesta.json()
}

export async function crearCompra(datos: object) {
    const respuesta = await fetch(`${API_URL}/compras-tarjeta/`, {
        method: "POST",
        headers: obtenerHeaders(),
        body: JSON.stringify(datos)
    })

    if (!respuesta.ok) {
        throw new Error("No se pudo crear la compra")
    }

    return respuesta.json()
}

export async function editarCompra(
    id: number,
    datos: object
) {
    const respuesta = await fetch(
        `${API_URL}/compras-tarjeta/${id}`,
        {
            method: "PUT",
            headers: obtenerHeaders(),
            body: JSON.stringify(datos)
        }
    )

    if (!respuesta.ok) {
        throw new Error("No se pudo editar la compra")
    }

    return respuesta.json()
}

export async function eliminarCompra(id: number) {
    const respuesta = await fetch(
        `${API_URL}/compras-tarjeta/${id}`,
        {
            method: "DELETE",
            headers: obtenerHeaders()
        }
    )

    if (!respuesta.ok) {
        throw new Error("No se pudo eliminar la compra")
    }

    return respuesta.json()
}

export async function listarCuotas(compraId: number) {
    const respuesta = await fetch(
        `${API_URL}/compras-tarjeta/${compraId}/cuotas`,
        {
            headers: obtenerHeaders()
        }
    )

    if (!respuesta.ok) {
        throw new Error("No se pudieron obtener las cuotas")
    }

    return respuesta.json()
}