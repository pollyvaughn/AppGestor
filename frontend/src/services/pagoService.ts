const API_URL = "http://127.0.0.1:8000"

type MetodoPago = {
    metodo_pago_id: number
    monto: number
}

export async function crearPago(
    cuotaId: number,
    monto: number,
    metodos: MetodoPago[]
) {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(`${API_URL}/pagos/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            cuota_id: cuotaId,
            monto: monto,
            metodos: metodos
        })
    })

    if (!respuesta.ok) {
        const error = await respuesta.json()
        throw new Error(error.detail || "No se pudo registrar el pago")
    }

    return await respuesta.json()
}

export async function editarPago(
    pagoId: number,
    cuotaId: number,
    monto: number,
    metodos: MetodoPago[]
) {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(`${API_URL}/pagos/${pagoId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            cuota_id: cuotaId,
            monto: monto,
            metodos: metodos
        })
    })

    if (!respuesta.ok) {
        const error = await respuesta.json()
        throw new Error(error.detail || "No se pudo editar el pago")
    }

    return await respuesta.json()
}

export async function listarPagosPorCuota(
    cuotaId: number
) {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(
        `${API_URL}/pagos/cuota/${cuotaId}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    )

    if (!respuesta.ok) {
        const error = await respuesta.json()
        throw new Error(
            error.detail || "No se pudieron obtener los pagos"
        )
    }

    return await respuesta.json()
}