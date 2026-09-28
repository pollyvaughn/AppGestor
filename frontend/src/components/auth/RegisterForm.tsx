import { useState } from "react"
import { registrarUsuario } from "../../services/authService"

type RegisterFormProps = {
    onRegister: () => void
}

export default function RegisterForm({ onRegister }: RegisterFormProps) {
    const [nombre, setNombre] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError("")

        try {
            await registrarUsuario({
                nombre: nombre,
                email: email,
                password: password,
            })

            onRegister()
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("Error al registrar usuario")
            }
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h1>Crear cuenta</h1>

            <div>
                <label htmlFor="nombre">Nombre</label>
                <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={function (event) {
                        setNombre(event.target.value)
                    }}
                    required
                />
            </div>

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
                Registrarse
            </button>
        </form>
    )
}