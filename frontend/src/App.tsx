import { useEffect, useState } from "react"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import type { Usuario } from "./types/auth"
import { listarCuentas } from "./services/cuentaService"
import Layout from "./components/layout/Layout"
import type { Vista } from "./components/layout/Layout"
import GlobalPage from "./pages/GlobalPage"
import MensualPage from "./pages/MensualPage"
import TarjetasYComprasPage from "./pages/TarjetasYComprasPage"
import RecurrentesPage from "./pages/RecurrentesPage"
import CategoriasPage from "./pages/CategoriasPage"
import CuentasPage from "./pages/CuentasPage"
import ConfiguracionInicialPage from "./pages/ConfiguracionInicialPage"
import Cargando from "./components/ui/Cargando"
import Mensaje from "./components/ui/Mensaje"
import Button from "./components/ui/Button"

type EstadoConfiguracion = "cargando" | "requerida" | "completa" | "error"
type CuentaConfiguracion = { tipo: string }

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
    const [estadoConfiguracion, setEstadoConfiguracion] =
        useState<EstadoConfiguracion>("cargando")
    const [errorConfiguracion, setErrorConfiguracion] = useState("")
    const [intentoConfiguracion, setIntentoConfiguracion] = useState(0)

    useEffect(
        function () {
            if (!usuario) {
                setEstadoConfiguracion("cargando")
                return
            }

            let activo = true
            setEstadoConfiguracion("cargando")
            setErrorConfiguracion("")

            listarCuentas()
                .then(function (cuentas: CuentaConfiguracion[]) {
                    if (!activo) return
                    const tieneCuentaDeDinero = cuentas.some(function (cuenta) {
                        return cuenta.tipo !== "TARJETA_CREDITO"
                    })
                    setEstadoConfiguracion(
                        tieneCuentaDeDinero ? "completa" : "requerida"
                    )
                })
                .catch(function (error) {
                    if (!activo) return
                    setErrorConfiguracion(
                        error instanceof Error
                            ? error.message
                            : "No se pudo comprobar la configuración inicial"
                    )
                    setEstadoConfiguracion("error")
                })

            return function () {
                activo = false
            }
        },
        [usuario, intentoConfiguracion]
    )

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

    if (estadoConfiguracion === "cargando") {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <Cargando />
            </main>
        )
    }

    if (estadoConfiguracion === "error") {
        return (
            <main className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-lg space-y-4">
                    <Mensaje tipo="error">{errorConfiguracion}</Mensaje>
                    <Button
                        type="button"
                        onClick={function () {
                            setIntentoConfiguracion(function (actual) {
                                return actual + 1
                            })
                        }}
                    >
                        Reintentar
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={cerrarSesion}
                    >
                        Cerrar sesión
                    </Button>
                </div>
            </main>
        )
    }

    if (estadoConfiguracion === "requerida") {
        return (
            <ConfiguracionInicialPage
                onCompletar={function () {
                    setEstadoConfiguracion("completa")
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