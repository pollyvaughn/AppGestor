import { useState } from "react"
import LoginPage from "./pages/LoginPage"
import type { Usuario } from "./types/auth"

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null>(function () {
        const usuarioGuardado = localStorage.getItem("usuario")

        if (!usuarioGuardado) {
            return null
        }

        return JSON.parse(usuarioGuardado)
    })

    function cerrarSesion() {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        setUsuario(null)
    }

    function iniciarSesion(usuario: Usuario) {
        setUsuario(usuario)
    }

    if (!usuario) {
        return <LoginPage onLogin={iniciarSesion} />
    }

    return (
        <main>
            <h1>Bienvenido, {usuario.nombre}</h1>

            <button onClick={cerrarSesion}>
                Cerrar sesión
            </button>
        </main>
    )
}