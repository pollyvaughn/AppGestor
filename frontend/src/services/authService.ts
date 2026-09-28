import type { LoginRequest, LoginResponse } from "../types/auth"

const API_URL = "http://127.0.0.1:8000"

export async function iniciarSesion(
    datos: LoginRequest
): Promise<LoginResponse> {
    const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
    })

    const resultado = await respuesta.json()

    if (!respuesta.ok) {
        throw new Error(resultado.detail || "Error al iniciar sesión")
    }

    return resultado
}