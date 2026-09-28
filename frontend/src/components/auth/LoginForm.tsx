import { useState } from "react"
import { iniciarSesion } from "../../services/authService"
import type { Usuario } from "../../types/auth"

type LoginFormProps = {
    onLogin: (usuario: Usuario) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError("")

        try {
            const resultado = await iniciarSesion({
                email: email,
                password: password,
            })

            localStorage.setItem("token", resultado.access_token)
            localStorage.setItem("usuario", JSON.stringify(resultado.usuario))

            onLogin(resultado.usuario)
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("Error al iniciar sesión")
            }
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h1>Iniciar sesión</h1>

            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={function (event) {
                        setEmail(event.target.value)
                    }}
                    required
                />
            </div>

            <div>
                <label htmlFor="password">Contraseña</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={function (event) {
                        setPassword(event.target.value)
                    }}
                    required
                />
            </div>

            {error && <p>{error}</p>}

            <button type="submit">
                Iniciar sesión
            </button>
        </form>
    )
}