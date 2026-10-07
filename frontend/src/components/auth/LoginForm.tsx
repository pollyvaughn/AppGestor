import { useState } from "react"
import { iniciarSesion } from "../../services/authService"
import type { Usuario } from "../../types/auth"
import Button from "../ui/Button"
import Input from "../ui/Input"

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
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
            <h1 className="text-lg font-medium">Iniciar sesión</h1>

            <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={function (event) {
                    setEmail(event.target.value)
                }}
                required
            />

            <Input
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={function (event) {
                    setPassword(event.target.value)
                }}
                required
            />

            {error && (
                <p className="text-sm" style={{ color: "var(--color-expense)" }}>
                    {error}
                </p>
            )}

            <Button type="submit" className="w-full">Iniciar sesión</Button>
        </form>
    )
}