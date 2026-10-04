import { useState } from "react"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import type { Usuario } from "./types/auth"
import TarjetasYComprasPage from "./pages/TarjetasYComprasPage"

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null>(function () {
        const usuarioGuardado = localStorage.getItem("usuario")

        if (!usuarioGuardado) {
            return null
        }

        return JSON.parse(usuarioGuardado)
    })

    const [mostrarRegistro, setMostrarRegistro] = useState(false)

    function cerrarSesion() {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        setUsuario(null)
    }

    function iniciarSesion(usuario: Usuario) {
        setUsuario(usuario)
    }

    function irARegistro() {
        setMostrarRegistro(true)
    }

    function irALogin() {
        setMostrarRegistro(false)
    }

    function registroExitoso() {
        setMostrarRegistro(false)
    }

    if (!usuario) {
        if (mostrarRegistro) {
            return (
                <RegisterPage
                    onRegister={registroExitoso}
                    onLogin={irALogin}
                 />
            )
        }

        return (
            <LoginPage
                onLogin={iniciarSesion}
                onRegister={irARegistro}
            />
)
    }

    return (
    <>
        <TarjetasYComprasPage />

        <button onClick={cerrarSesion}>
            Cerrar sesión
        </button>
    </>
    )
}