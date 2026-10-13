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
    const [categoriasExpandidas, setCategoriasExpandidas] = useState({
        INGRESO: false,
        EGRESO: false,
    })
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
    const porCategoriaIngreso: Record<
        string,
        { id: number | null; nombre: string; total: number }
    > = {}
    const porCategoriaEgreso: Record<
        string,
        { id: number | null; nombre: string; total: number }
    > = {}

    for (const m of deLaMoneda) {
        const monto = Number(m.monto)
        const clave = mesDe(m)

        if (!porMes[clave]) {
            porMes[clave] = { ingresos: 0, egresos: 0 }
        }

        if (m.tipo === "INGRESO") {
            ingresos += monto
            porMes[clave].ingresos += monto

            const key = `INGRESO:${m.categoria_id ?? "sin-categoria"}`
            const categoria = porCategoriaIngreso[key] ?? {
                id: m.categoria_id,
                nombre: m.categoria ?? "Sin categoría",
                total: 0,
            }
            categoria.total += monto
            porCategoriaIngreso[key] = categoria
        } else {
            egresos += monto
            porMes[clave].egresos += monto

            const key = `EGRESO:${m.categoria_id ?? "sin-categoria"}`
            const categoria = porCategoriaEgreso[key] ?? {
                id: m.categoria_id,
                nombre: m.categoria ?? "Sin categoría",
                total: 0,
            }
            categoria.total += monto
            porCategoriaEgreso[key] = categoria
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

    const categoriasIngreso = Object.values(porCategoriaIngreso).sort(function (a, b) {
        return b.total - a.total
    })
    const categoriasEgreso = Object.values(porCategoriaEgreso).sort(function (a, b) {
        return b.total - a.total
    })
    const maximoCategoriaIngreso =
        categoriasIngreso.length > 0 ? categoriasIngreso[0].total : 1
    const maximoCategoriaEgreso =
        categoriasEgreso.length > 0 ? categoriasEgreso[0].total : 1

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
                    <div
                        role="group"
                        aria-label="Moneda"
                        className="flex flex-wrap items-center gap-2"
                    >
                        <span className="text-xs" style={estiloTitulo} aria-hidden="true">
                            Moneda
                        </span>

                        {monedas.map(function (mon) {
                            const activa = mon === moneda

                            return (
                                <button
                                    key={mon}
                                    type="button"
                                    aria-pressed={activa}
                                    onClick={function () {
                                        setMonedaElegida(mon)
                                    }}
                                    className="px-3 py-1.5 min-h-11 md:min-h-0 text-xs"
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
                    <section className="p-4 sm:p-6" style={estiloCard}>
                        <h2 className="text-xs mb-5" style={estiloTitulo}>
                            Evolución mensual
                        </h2>

                        {/* El gráfico es solo visual: los mismos datos están en la tabla de abajo */}
                        <div className="overflow-x-auto" aria-hidden="true">
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
                                                    style={{
                                                        height: `${(d.ingresos / maximoMes) * 100}%`,
                                                        minHeight: d.ingresos > 0 ? "2px" : "0",
                                                        background: "var(--color-income)",
                                                        borderRadius: "2px 2px 0 0",
                                                    }}
                                                />
                                                <div
                                                    className="flex-1"
                                                    style={{
                                                        height: `${(d.egresos / maximoMes) * 100}%`,
                                                        minHeight: d.egresos > 0 ? "2px" : "0",
                                                        background: "var(--color-expense)",
                                                        borderRadius: "2px 2px 0 0",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    color: "var(--color-muted-foreground)",
                                                    fontFamily: "var(--font-mono)",
                                                    fontSize: "11px",
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

                        <details className="mt-4 text-sm">
                            <summary className="cursor-pointer min-h-11 md:min-h-0 flex items-center">
                                Ver datos en tabla
                            </summary>

                            <div className="overflow-x-auto">
                                <table className="w-full mt-2 text-xs">
                                    <caption className="sr-only">
                                        Ingresos y gastos por mes en {moneda}
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th scope="col" className="text-left py-1">Mes</th>
                                            <th scope="col" className="text-right py-1">Ingresos</th>
                                            <th scope="col" className="text-right py-1">Gastos</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontFamily: "var(--font-mono)" }}>
                                        {meses.map(function (mes) {
                                            return (
                                                <tr
                                                    key={mes}
                                                    style={{ borderTop: "1px solid var(--color-border)" }}
                                                >
                                                    <th scope="row" className="text-left font-normal py-1.5">
                                                        {etiquetaMes(mes)}
                                                    </th>
                                                    <td
                                                        className="text-right py-1.5"
                                                        style={{ color: "var(--color-income)" }}
                                                    >
                                                        {formatearMonto(porMes[mes].ingresos, moneda)}
                                                    </td>
                                                    <td
                                                        className="text-right py-1.5"
                                                        style={{ color: "var(--color-expense)" }}
                                                    >
                                                        {formatearMonto(porMes[mes].egresos, moneda)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                tipo: "INGRESO" as const,
                                titulo: "Ingresos por categoría",
                                vacio: "Sin ingresos en esta moneda.",
                                categorias: categoriasIngreso,
                                maximo: maximoCategoriaIngreso,
                                color: "var(--color-income)",
                            },
                            {
                                tipo: "EGRESO" as const,
                                titulo: "Gastos por categoría",
                                vacio: "Sin gastos en esta moneda.",
                                categorias: categoriasEgreso,
                                maximo: maximoCategoriaEgreso,
                                color: "var(--color-expense)",
                            },
                        ].map(function (grupo) {
                            const expandida = categoriasExpandidas[grupo.tipo]
                            const visibles = expandida
                                ? grupo.categorias
                                : grupo.categorias.slice(0, 5)

                            return (
                                <section
                                    key={grupo.tipo}
                                    className="p-4 sm:p-6 self-start"
                                    style={estiloCard}
                                >
                                    <h2 className="text-xs mb-5" style={estiloTitulo}>
                                        {grupo.titulo}
                                    </h2>

                                    {grupo.categorias.length === 0 && (
                                        <EstadoVacio texto={grupo.vacio} />
                                    )}

                                    <div
                                        id={`categorias-${grupo.tipo.toLowerCase()}-global`}
                                        className="space-y-4"
                                    >
                                        {visibles.map(function (categoria) {
                                            return (
                                                <div
                                                    key={`${grupo.tipo}:${categoria.id ?? "sin-categoria"}`}
                                                    className="space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm truncate">
                                                            {categoria.nombre}
                                                        </span>
                                                        <span
                                                            className="text-xs shrink-0"
                                                            style={{ fontFamily: "var(--font-mono)" }}
                                                        >
                                                            {formatearMonto(categoria.total, moneda)} {moneda}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="h-1.5 w-full rounded-full"
                                                        style={{ background: "var(--color-muted)" }}
                                                        aria-hidden="true"
                                                    >
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${(categoria.total / grupo.maximo) * 100}%`,
                                                                background: grupo.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {grupo.categorias.length > 5 && (
                                        <button
                                            type="button"
                                            aria-expanded={expandida}
                                            aria-controls={`categorias-${grupo.tipo.toLowerCase()}-global`}
                                            onClick={function () {
                                                setCategoriasExpandidas({
                                                    ...categoriasExpandidas,
                                                    [grupo.tipo]: !expandida,
                                                })
                                            }}
                                            className="mt-4 text-xs underline min-h-11 md:min-h-0"
                                            style={{ color: "var(--color-muted-foreground)" }}
                                        >
                                            {expandida
                                                ? "Ver menos"
                                                : `Ver más (+${grupo.categorias.length - 5})`}
                                        </button>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
