import { useEffect, useState } from "react"
import { listarMovimientos } from "../services/movimientoService"
import {
    type Movimiento,
    esContable,
    mesDe,
    nombreMes,
} from "../lib/movimientos"
import { formatearMonto } from "../lib/moneda"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

const estiloTitulo = {
    color: "var(--color-muted-foreground)",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
}

function etiquetaMes(mes: string) {
    // "2026-09" => "Sep 26"
    return `${nombreMes(mes).slice(0, 3)} ${mes.slice(2, 4)}`
}

export default function GlobalPage() {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [monedaElegida, setMonedaElegida] = useState("")
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")

    async function cargar() {
        try {
            setMovimientos(await listarMovimientos())
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los movimientos"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    // ---------- Datos calculados ----------

    const contables = movimientos.filter(esContable)

    const monedas = Array.from(
        new Set(
            contables.map(function (m) {
                return m.moneda
            })
        )
    ).sort()

    // si todavía no eligió moneda (o la elegida ya no existe), usa la primera
    const moneda = monedas.includes(monedaElegida) ? monedaElegida : monedas[0]

    const deLaMoneda = contables.filter(function (m) {
        return m.moneda === moneda
    })

    let ingresos = 0
    let egresos = 0
    const porMes: Record<string, { ingresos: number; egresos: number }> = {}
    const porCategoria: Record<string, number> = {}

    for (const m of deLaMoneda) {
        const monto = Number(m.monto)
        const clave = mesDe(m)

        if (!porMes[clave]) {
            porMes[clave] = { ingresos: 0, egresos: 0 }
        }

        if (m.tipo === "INGRESO") {
            ingresos += monto
            porMes[clave].ingresos += monto
        } else {
            egresos += monto
            porMes[clave].egresos += monto

            const categoria = m.categoria ?? "Sin categoría"
            porCategoria[categoria] = (porCategoria[categoria] ?? 0) + monto
        }
    }

    const balance = ingresos - egresos

    const meses = Object.keys(porMes).sort().slice(-12)
    const promedio = meses.length > 0 ? balance / meses.length : 0

    const maximoMes = Math.max(
        1,
        ...meses.map(function (mes) {
            return Math.max(porMes[mes].ingresos, porMes[mes].egresos)
        })
    )

    const categorias = Object.entries(porCategoria).sort(function (a, b) {
        return b[1] - a[1]
    })
    const maximoCategoria = categorias.length > 0 ? categorias[0][1] : 1

    const resumen = [
        { titulo: "Balance total", valor: balance, color: balance >= 0 ? "var(--color-income)" : "var(--color-expense)" },
        { titulo: "Ingresos totales", valor: ingresos, color: "var(--color-income)" },
        { titulo: "Gastos totales", valor: egresos, color: "var(--color-expense)" },
        { titulo: "Balance medio / mes", valor: promedio, color: "var(--color-foreground)" },
    ]

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <h1 className="text-lg font-medium">Global</h1>

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && !error && monedas.length === 0 && (
                <EstadoVacio texto="Todavía no hay movimientos." />
            )}

            {!cargando && monedas.length > 0 && (
                <>
                    {/* Selector de moneda */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs" style={estiloTitulo}>
                            Moneda
                        </span>

                        {monedas.map(function (mon) {
                            const activa = mon === moneda

                            return (
                                <button
                                    key={mon}
                                    type="button"
                                    onClick={function () {
                                        setMonedaElegida(mon)
                                    }}
                                    className="px-3 py-1.5 text-xs"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--color-border)",
                                        background: activa
                                            ? "var(--color-foreground)"
                                            : "transparent",
                                        color: activa
                                            ? "var(--color-background)"
                                            : "var(--color-muted-foreground)",
                                    }}
                                >
                                    {mon}
                                </button>
                            )
                        })}
                    </div>

                    {/* Tarjetas resumen */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {resumen.map(function (r) {
                            return (
                                <div key={r.titulo} className="p-5 space-y-2" style={estiloCard}>
                                    <p className="text-xs" style={estiloTitulo}>
                                        {r.titulo}
                                    </p>
                                    <p
                                        className="text-xl font-light break-words"
                                        style={{ fontFamily: "var(--font-mono)", color: r.color }}
                                    >
                                        {formatearMonto(r.valor, moneda)}{" "}
                                        <span className="text-sm">{moneda}</span>
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Evolución mensual */}
                    <section className="p-6" style={estiloCard}>
                        <h2 className="text-xs mb-5" style={estiloTitulo}>
                            Evolución mensual
                        </h2>

                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-3" style={{ minWidth: "min-content" }}>
                                {meses.map(function (mes) {
                                    const d = porMes[mes]

                                    return (
                                        <div
                                            key={mes}
                                            className="flex flex-col items-center gap-1 shrink-0"
                                            style={{ width: "44px" }}
                                        >
                                            <div
                                                className="flex items-end gap-1 w-full"
                                                style={{ height: "120px" }}
                                            >
                                                <div
                                                    className="flex-1"
                                                    title={`Ingresos: ${formatearMonto(d.ingresos, moneda)}`}
                                                    style={{
                                                        height: `${(d.ingresos / maximoMes) * 100}%`,
                                                        minHeight: d.ingresos > 0 ? "2px" : "0",
                                                        background: "var(--color-income)",
                                                        borderRadius: "2px 2px 0 0",
                                                    }}
                                                />
                                                <div
                                                    className="flex-1"
                                                    title={`Gastos: ${formatearMonto(d.egresos, moneda)}`}
                                                    style={{
                                                        height: `${(d.egresos / maximoMes) * 100}%`,
                                                        minHeight: d.egresos > 0 ? "2px" : "0",
                                                        background: "var(--color-expense)",
                                                        borderRadius: "2px 2px 0 0",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className="text-xs"
                                                style={{
                                                    color: "var(--color-muted-foreground)",
                                                    fontFamily: "var(--font-mono)",
                                                    fontSize: "10px",
                                                }}
                                            >
                                                {etiquetaMes(mes)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                                <span className="w-3 h-2 rounded" style={{ background: "var(--color-income)" }} />
                                Ingresos
                            </span>
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                                <span className="w-3 h-2 rounded" style={{ background: "var(--color-expense)" }} />
                                Gastos
                            </span>
                        </div>
                    </section>

                    {/* Gastos por categoría */}
                    <section className="p-6" style={estiloCard}>
                        <h2 className="text-xs mb-5" style={estiloTitulo}>
                            Gastos por categoría
                        </h2>

                        {categorias.length === 0 && (
                            <EstadoVacio texto="Sin gastos en esta moneda." />
                        )}

                        <div className="space-y-4">
                            {categorias.map(function ([nombre, total]) {
                                return (
                                    <div key={nombre} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm truncate">{nombre}</span>
                                            <span
                                                className="text-xs shrink-0"
                                                style={{ fontFamily: "var(--font-mono)" }}
                                            >
                                                {formatearMonto(total, moneda)} {moneda}
                                            </span>
                                        </div>
                                        <div
                                            className="h-1.5 w-full rounded-full"
                                            style={{ background: "var(--color-muted)" }}
                                        >
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${(total / maximoCategoria) * 100}%`,
                                                    background: "var(--color-expense)",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}