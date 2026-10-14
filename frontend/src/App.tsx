import { useState } from "react"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import type { Usuario } from "./types/auth"
import Layout from "./components/layout/Layout"
import type { Vista } from "./components/layout/Layout"
import GlobalPage from "./pages/GlobalPage"
import MensualPage from "./pages/MensualPage"
import TarjetasYComprasPage from "./pages/TarjetasYComprasPage"
import RecurrentesPage from "./pages/RecurrentesPage"
import CategoriasPage from "./pages/CategoriasPage"
import CuentasPage from "./pages/CuentasPage"

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null>(function () {
        const usuarioGuardado = localStorage.getItem("usuario")

        if (!usuarioGuardado) {
            return null
        }

        return JSON.parse(usuarioGuardado)
    })

    const [mostrarRegistro, setMostrarRegistro] = useState(false)
    const [vista, setVista] = useState<Vista>("mensual")

    function cerrarSesion() {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        setUsuario(null)
    }

    if (!usuario) {
        if (mostrarRegistro) {
            return (
                <RegisterPage
                    onRegister={function () {
                        setMostrarRegistro(false)
                    }}
                    onLogin={function () {
                        setMostrarRegistro(false)
                    }}
                />
            )
        }

        return (
            <LoginPage
                onLogin={setUsuario}
                onRegister={function () {
                    setMostrarRegistro(true)
                }}
            />
        )
    }

    return (
        <Layout
            vista={vista}
            onCambiarVista={setVista}
            onCerrarSesion={cerrarSesion}
        >
            {vista === "global" && <GlobalPage />}
            {vista === "mensual" && (
                <MensualPage
                    onIrATarjetas={function () {
                        setVista("tarjetas")
                    }}
                    onIrACategorias={function () {
                        setVista("categorias")
                    }}
                />
            )}
            {vista === "tarjetas" && (
                <TarjetasYComprasPage
                    onIrACategorias={function () {
                        setVista("categorias")
                    }}
                />
            )}
            {vista === "recurrentes" && (
                <RecurrentesPage
                    onIrACategorias={function () {
                        setVista("categorias")
                    }}
                />
            )}
            {vista === "categorias" && <CategoriasPage />}
            {vista === "cuentas" && <CuentasPage />}
        </Layout>
    )
}