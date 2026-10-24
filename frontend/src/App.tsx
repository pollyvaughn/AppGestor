// =========================================================
// App: sesión, configuración inicial, navegación y modales globales
//
// Cambios
// - "aviso" ahora lleva tipo (error o éxito) y se muestra fijo arriba a la
//   derecha: antes salía arriba de la página (fuera de pantalla si estabas
//   más abajo) y los errores se veían en verde como si fueran éxito.
// - "Compra con tarjeta" (menú Nuevo) y "Nueva compra con tarjeta" (modal de
//   movimiento) abren directo el formulario de compra: App va a Tarjetas y
//   deja un pedido pendiente que TarjetasYComprasPage atiende y apaga.
// - Tarjetas y Recurrentes se actualizan cuando se carga un movimiento o una
//   transferencia (saldos al día en los avisos de sobregiro).
// =========================================================

import { useEffect, useState } from "react"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import type { Usuario } from "./types/auth"
import { listarCuentas } from "./services/cuentaService"
import Layout from "./components/layout/Layout"
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
import MovimientoModal from "./components/movimientos/MovimientoModal"
import TransferenciaModal from "./components/movimientos/TransferenciaModal"
import { useVistaHash } from "./lib/useVistaHash"

type EstadoConfiguracion = "cargando" | "requerida" | "completa" | "error"
type CuentaConfiguracion = { tipo: string }

// Aviso flotante: éxito se va a los 4 segundos, error a los 6
type Aviso = { tipo: "error" | "exito"; texto: string } | null

export default function App() {
    const [usuario, setUsuario] = useState<Usuario | null>(function () {
        const usuarioGuardado = localStorage.getItem("usuario")

        if (!usuarioGuardado) {
            return null
        }

        return JSON.parse(usuarioGuardado)
    })
    const [modalMovimiento, setModalMovimiento] = useState(false)
    const [versionDatos, setVersionDatos] = useState(0)
    const [aviso, setAviso] = useState<Aviso>(null)

    // true = falta abrir el formulario de nueva compra con tarjeta.
    // Lo apaga TarjetasYComprasPage cuando lo atiende.
    const [abrirCompraPendiente, setAbrirCompraPendiente] = useState(false)

    const [mostrarRegistro, setMostrarRegistro] = useState(false)
    const [vista, setVista] = useVistaHash()
    const [estadoConfiguracion, setEstadoConfiguracion] =
        useState<EstadoConfiguracion>("cargando")
    const [errorConfiguracion, setErrorConfiguracion] = useState("")
    const [intentoConfiguracion, setIntentoConfiguracion] = useState(0)
    const [modalTransferencia, setModalTransferencia] = useState(false)
    const [cuentasTransferencia, setCuentasTransferencia] = useState<any[]>([])

    // el aviso se va solo (los errores duran más para poder leerlos)
    useEffect(
        function () {
            if (!aviso) {
                return
            }

            const temporizador = setTimeout(
                function () {
                    setAviso(null)
                },
                aviso.tipo === "error" ? 6000 : 4000
            )

            return function () {
                clearTimeout(temporizador)
            }
        },
        [aviso]
    )

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

    async function abrirTransferencia() {
        try {
            setCuentasTransferencia(await listarCuentas())
            setModalTransferencia(true)
        } catch (e) {
            setAviso({
                tipo: "error",
                texto:
                    e instanceof Error
                        ? e.message
                        : "No se pudieron cargar las cuentas",
            })
        }
    }

    // Va a Tarjetas y deja el pedido de abrir el formulario de nueva compra
    function abrirNuevaCompra() {
        setAbrirCompraPendiente(true)
        setVista("tarjetas")
    }

    // las vistas que muestran saldos y movimientos se recargan
    function datosCambiaron() {
        setVersionDatos(function (v) {
            return v + 1
        })
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
        <>
            <Layout
                vista={vista}
                onCambiarVista={setVista}
                onCerrarSesion={cerrarSesion}
                onNuevoMovimiento={function () {
                    setModalMovimiento(true)
                }}
                onTransferir={abrirTransferencia}
                onNuevaCompra={abrirNuevaCompra}
            >
                {vista === "global" && <GlobalPage version={versionDatos} />}
                {vista === "mensual" && (
                    <MensualPage
                        version={versionDatos}
                        onIrATarjetas={abrirNuevaCompra}
                    />
                )}
                {vista === "tarjetas" && (
                    <TarjetasYComprasPage
                        versionDatos={versionDatos}
                        abrirNuevaCompra={abrirCompraPendiente}
                        onNuevaCompraAtendida={function () {
                            setAbrirCompraPendiente(false)
                        }}
                    />
                )}
                {/* key: se vuelve a montar al cargar un movimiento, así sus
                    cuentas y saldos quedan al día */}
                {vista === "recurrentes" && (
                    <RecurrentesPage key={versionDatos} />
                )}
                {vista === "categorias" && <CategoriasPage />}
                {vista === "cuentas" && <CuentasPage version={versionDatos} />}
            </Layout>

            {/* Aviso flotante: se ve aunque la página esté scrolleada y
                queda por encima de los modales */}
            {aviso && (
                <div
                    className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[60]"
                    style={{
                        boxShadow: "0 4px 12px rgba(28,28,26,0.15)",
                        borderRadius: "var(--radius-sm)",
                    }}
                >
                    <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>
                </div>
            )}

            <MovimientoModal
                open={modalMovimiento}
                movimiento={null}
                onClose={function () {
                    setModalMovimiento(false)
                }}
                onGuardado={function (mensaje) {
                    setAviso({ tipo: "exito", texto: mensaje })
                    datosCambiaron()
                }}
                onIrATarjetas={abrirNuevaCompra}
            />
            <TransferenciaModal
                open={modalTransferencia}
                cuentas={cuentasTransferencia}
                onClose={function () {
                    setModalTransferencia(false)
                }}
                onGuardado={function () {
                    setAviso({ tipo: "exito", texto: "Transferencia registrada" })
                    datosCambiaron()
                }}
            />
        </>
    )
}