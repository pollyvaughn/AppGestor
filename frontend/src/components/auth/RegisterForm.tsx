import { useState } from "react"
import { registrarUsuario } from "../../services/authService"
import Button from "../ui/Button"
import Input from "../ui/Input"

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
        <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-4 w-full"
        >
            <h1 className="text-lg font-medium">Crear cuenta</h1>

            <Input
                id="nombre"
                label="Nombre"
                value={nombre}
                onChange={function (event) {
                    setNombre(event.target.value)
                }}
                required
            />

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

            <Button type="submit" className="w-full">
                Registrarse
            </Button>
        </form>
    )
}