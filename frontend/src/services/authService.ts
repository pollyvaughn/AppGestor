import { api } from "../lib/api"
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
} from "../types/auth"

export function iniciarSesion(datos: LoginRequest) {
    return api<LoginResponse>("/auth/login", {
        method: "POST",
        body: datos,
    })
}

export async function registrarUsuario(datos: RegisterRequest) {
    await api("/usuarios/", {
        method: "POST",
        body: datos,
    })
}