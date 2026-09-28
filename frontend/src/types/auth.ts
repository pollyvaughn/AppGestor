export type Usuario = {
    id: number
    nombre: string
    email: string
}

export type LoginRequest = {
    email: string
    password: string
}

export type LoginResponse = {
    access_token: string
    token_type: string
    usuario: Usuario
}