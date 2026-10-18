import { useEffect, useState } from "react"
import { listarResumenes } from "../services/resumenService"
import { listarCuentas } from "../services/cuentaService"
import Button from "../components/ui/Button"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import { fechaHoy } from "../lib/fechas"
import PagoResumenModal from "./PagoResumenModal"
import {
    type Cuenta,
    type Resumen,
    fechaCorta,
    periodoCorto,
} from "../lib/tarjetas"

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
}

type Grupo = { tarjeta: Tarjeta; resumenes: Resumen[] }

type ResumenesTarjetaProps = {
    tarjetas: Tarjeta[]
    // sube cuando cambia algo en la pantalla (compra, pago...) para recargar
    version: number
    // se llama después de pagar un resumen
    onCambio: () => void
}

export default function ResumenesTarjeta({
    tarjetas,
    version,
    onCambio,
}: ResumenesTarjetaProps) {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")
    const [pagando, setPagando] = useState<{
        tarjeta: Tarjeta
        resumen: Resumen
    } | null>(null)
    const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})

    async function cargar() {
        try {
            const activas = tarjetas.filter(function (t) {
                return t.estado === "ACTIVA"
            })

            const [lista, ctas] = await Promise.all([
                Promise.all(
                    activas.map(async function (tarjeta) {
                        const datos = await listarResumenes(tarjeta.id)

                        return {
                            tarjeta: tarjeta,
                            resumenes: datos.resumenes as Resumen[],
                        }
                    })
                ),
                listarCuentas(),
            ])

            setGrupos(
                lista.filter(function (g) {
                    return g.resumenes.length > 0
                })
            )
            setCuentas(ctas)
            setError("")
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los resúmenes"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(
        function () {
            cargar()
        },
        [tarjetas, version]
    )

    function resumenPagado() {
        setMensaje("Resumen pagado")
        onCambio()
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">Resúmenes a pagar</h2>

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && !error && grupos.length === 0 && (
                <EstadoVacio texto="No tenés resúmenes pendientes." />
            )}

            {grupos.map(function (grupo) {
                return grupo.resumenes.map(function (r) {
                    const clave = `${grupo.tarjeta.id}-${r.periodo}`
                    const abierto = abiertos[clave] === true
                    const moneda = grupo.tarjeta.moneda
                    const vencido =
                        r.fecha_vencimiento !== null &&
                        r.fecha_vencimiento.slice(0, 10) < fechaHoy()

                    return (
                        <div
                            key={clave}
                            className="p-4 sm:p-5 space-y-3"
                            style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium break-words">
                                        {grupo.tarjeta.nombre} · Resumen{" "}
                                        {periodoCorto(r.periodo)}
                                    </p>

                                    <p
                                        className="text-xs"
                                        style={{
                                            color: vencido
                                                ? "var(--color-expense)"
                                                : "var(--color-muted-foreground)",
                                        }}
                                    >
                                        {vencido ? "Vencido el " : "Vence "}
                                        {fechaCorta(r.fecha_vencimiento)} ·{" "}
                                        {r.lineas.length}{" "}
                                        {r.lineas.length === 1
                                            ? "cuota"
                                            : "cuotas"}
                                    </p>
                                </div>

                                <div className="text-right shrink-0">
                                    <p
                                        className="text-lg font-light"
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            color: "var(--color-expense)",
                                        }}
                                    >
                                        {formatearMonto(
                                            r.total_pendiente,
                                            moneda
                                        )}{" "}
                                        <span className="text-sm">{moneda}</span>
                                    </p>

                                    {r.pago_minimo !== null && (
                                        <p
                                            className="text-xs"
                                            style={{
                                                color: "var(--color-muted-foreground)",
                                            }}
                                        >
                                            Mínimo ref.:{" "}
                                            {formatearMonto(
                                                r.pago_minimo,
                                                moneda
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {r.puede_pagar ? (
                                    <Button
                                        type="button"
                                        className="!py-1 !text-xs"
                                        aria-label={`Pagar resumen ${periodoCorto(r.periodo)} de ${grupo.tarjeta.nombre}`}
                                        onClick={function () {
                                            setMensaje("")
                                            setPagando({
                                                tarjeta: grupo.tarjeta,
                                                resumen: r,
                                            })
                                        }}
                                    >
                                        Pagar resumen
                                    </Button>
                                ) : (
                                    <span
                                        className="text-xs"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        Primero hay que pagar el resumen anterior.
                                    </span>
                                )}

                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-expanded={abierto}
                                    className="!py-1 !text-xs"
                                    onClick={function () {
                                        setAbiertos({
                                            ...abiertos,
                                            [clave]: !abierto,
                                        })
                                    }}
                                >
                                    {abierto ? "Ocultar detalle" : "Ver detalle"}
                                </Button>
                            </div>

                            {abierto && (
                                <ul
                                    className="pt-2"
                                    style={{
                                        borderTop:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    {r.lineas.map(function (linea) {
                                        return (
                                            <li
                                                key={linea.cuota_id}
                                                className="flex items-center justify-between gap-3 py-2 text-xs"
                                                style={{
                                                    borderBottom:
                                                        "1px solid var(--color-border)",
                                                }}
                                            >
                                                <span className="min-w-0 break-words">
                                                    {linea.descripcion ||
                                                        "Compra sin descripción"}{" "}
                                                    · cuota {linea.numero}/
                                                    {linea.cantidad_cuotas}
                                                </span>

                                                <span
                                                    className="shrink-0"
                                                    style={{
                                                        fontFamily:
                                                            "var(--font-mono)",
                                                    }}
                                                >
                                                    {formatearMonto(
                                                        linea.monto_pendiente,
                                                        moneda
                                                    )}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    )
                })
            })}

            <PagoResumenModal
                tarjetaId={pagando ? pagando.tarjeta.id : null}
                resumen={pagando ? pagando.resumen : null}
                moneda={pagando ? pagando.tarjeta.moneda : "PYG"}
                cuentas={cuentas}
                onClose={function () {
                    setPagando(null)
                }}
                onGuardado={resumenPagado}
            />
        </div>
    )
}