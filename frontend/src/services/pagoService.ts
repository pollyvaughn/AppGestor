const API_URL = "http://127.0.0.1:8000"

export async function crearPago(
    cuotaId: number,
    monto: number
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
            monto: monto
        })
    })

    if (!respuesta.ok) {
        const error = await respuesta.json()
        throw new Error(error.detail || "No se pudo registrar el pago")
    }

    return await respuesta.json()
}