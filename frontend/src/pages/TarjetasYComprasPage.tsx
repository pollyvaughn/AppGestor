// =========================================================
// Pantalla Tarjetas: panel de tarjetas + pestañas Resúmenes / Compras
//
// Cambios del punto 7:
// - abrirNuevaCompra: el menú "Nuevo > Compra con tarjeta" (en App) pide
//   abrir el formulario de compra. Esta pantalla cambia a la pestaña
//   "Compras con tarjeta" y, cuando las tarjetas ya cargaron, le pasa el
//   pedido a ComprasTarjetaPage. Cuando se atiende, avisa con
//   onNuevaCompraAtendida para que App apague el pedido (si no, al volver
//   a esta pantalla el formulario se abriría solo).
// - versionDatos: sube cuando se carga un movimiento o transferencia desde
//   el menú Nuevo. Se recargan resúmenes y cuentas para que los saldos del
//   aviso de sobregiro no queden viejos.
// =========================================================

import { useEffect, useState } from "react"
import TarjetasPage from "./TarjetasPage"
import ResumenesTarjeta from "./ResumenesTarjeta"
import ComprasTarjetaPage from "./ComprasTarjetaPage"
import { listarTarjetas } from "../services/tarjetaService"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
}

type Pestana = "resumenes" | "compras"

const PESTANAS: { key: Pestana; label: string }[] = [
    { key: "resumenes", label: "Resúmenes" },
    { key: "compras", label: "Compras con tarjeta" },
]

type TarjetasYComprasPageProps = {
    // sube con cada movimiento o transferencia cargados desde el menú Nuevo
    versionDatos?: number
    // true = el menú Nuevo pidió abrir el formulario de nueva compra
    abrirNuevaCompra?: boolean
    // se llama cuando el pedido ya se atendió
    onNuevaCompraAtendida?: () => void
}

export default function TarjetasYComprasPage({
    versionDatos = 0,
    abrirNuevaCompra = false,
    onNuevaCompraAtendida,
}: TarjetasYComprasPageProps) {
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    // false hasta que termina la primera carga de tarjetas (con o sin error)
    const [tarjetasListas, setTarjetasListas] = useState(false)
    const [version, setVersion] = useState(0)
    const [versionCompras, setVersionCompras] = useState(0)
    // si llega un pedido de compra al montar, se arranca en la pestaña Compras
    const [pestana, setPestana] = useState<Pestana>(
        abrirNuevaCompra ? "compras" : "resumenes"
    )

    async function cargarTarjetas() {
        try {
            setTarjetas(await listarTarjetas())
        } catch {
            setTarjetas([])
        } finally {
            setTarjetasListas(true)
        }
    }

    // vuelve a cargar también el panel de tarjetas (deuda y disponible)
    function refrescarTodo() {
        setVersion(function (v) {
            return v + 1
        })
        cargarTarjetas()
    }

    // pagar un resumen cambia cuotas de varias compras: se recarga la lista
    function alPagarResumen() {
        setVersionCompras(function (v) {
            return v + 1
        })
        refrescarTodo()
    }

    useEffect(function () {
        cargarTarjetas()
    }, [])

    // si ya estás en Tarjetas y llega el pedido, se pasa a la pestaña Compras
    useEffect(
        function () {
            if (abrirNuevaCompra) {
                setPestana("compras")
            }
        },
        [abrirNuevaCompra]
    )

    return (
        <div className="space-y-10">
            <TarjetasPage key={version} onCambio={cargarTarjetas} />

            <div>
                <div
                    role="tablist"
                    aria-label="Resúmenes y compras con tarjeta"
                    className="flex overflow-x-auto mb-6"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                    {PESTANAS.map(function (item) {
                        const activa = pestana === item.key

                        return (
                            <button
                                key={item.key}
                                id={`tab-${item.key}`}
                                type="button"
                                role="tab"
                                aria-selected={activa}
                                aria-controls={`panel-${item.key}`}
                                onClick={function () {
                                    setPestana(item.key)
                                }}
                                className="shrink-0 whitespace-nowrap text-xs px-4 py-2 min-h-11"
                                style={{
                                    fontWeight: activa ? 600 : 400,
                                    color: activa
                                        ? "var(--color-foreground)"
                                        : "var(--color-muted-foreground)",
                                    borderBottom: activa
                                        ? "2px solid var(--color-foreground)"
                                        : "2px solid transparent",
                                }}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                {/* Los dos paneles quedan montados y se oculta el que no está activo:
                    así no se pierde lo que estabas viendo (cuotas abiertas, etc.)
                    y la lógica de refresco de arriba sigue funcionando igual. */}
                <div
                    role="tabpanel"
                    id="panel-resumenes"
                    aria-labelledby="tab-resumenes"
                    hidden={pestana !== "resumenes"}
                >
                    <ResumenesTarjeta
                        tarjetas={tarjetas}
                        version={version + versionDatos}
                        onCambio={alPagarResumen}
                    />
                </div>

                <div
                    role="tabpanel"
                    id="panel-compras"
                    aria-labelledby="tab-compras"
                    hidden={pestana !== "compras"}
                >
                    <ComprasTarjetaPage
                        key={versionCompras}
                        tarjetas={tarjetas}
                        onCambio={refrescarTodo}
                        version={versionDatos}
                        pedirNuevaCompra={abrirNuevaCompra && tarjetasListas}
                        onPedidoAtendido={onNuevaCompraAtendida}
                    />
                </div>
            </div>
        </div>
    )
}