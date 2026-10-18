import { useEffect, useState } from "react"
import { listarMovimientos } from "../services/movimientoService"
import { listarCuentas } from "../services/cuentaService"
import { listarTarjetas } from "../services/tarjetaService"
import { listarCategorias } from "../services/categoriaService"
import {
    guardarPresupuesto,
    listarPresupuestos,
    quitarPresupuesto,
} from "../services/presupuestoService"
import {
    type Movimiento,
    esContable,
    flujoNeto,
    patrimonioPorMoneda,
    totalesPorMoneda,
} from "../lib/movimientos"
import { formatearMonto } from "../lib/moneda"
import {
    type ClavePeriodo,
    dentroDe,
    diasEnPeriodo,
    fechaCorta,
    mesesEnPeriodo,
    periodoActual,
    periodoAnterior,
} from "../lib/periodo"
import {
    formatearPorcentaje,
    ratioEndeudamiento,
    tasaAhorro,
    variacionPorcentual,
} from "../lib/resumen"
import { composicionPorCategoria, serieMensual } from "../lib/graficos"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import KpiCard from "../components/ui/KpiCard"
import SelectorPeriodo from "../components/ui/SelectorPeriodo"
import EvolucionChart from "../components/global/EvolucionChart"
import ComposicionGastoChart from "../components/global/ComposicionGastoChart"
import RitmoGastoChart from "../components/global/RitmoGastoChart"
import TablaMensual from "../components/global/TablaMensual"
import AlertaSaldoNegativo from "../components/ui/AlertaSaldoNegativo"

const estiloCard = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
}

const estiloTitulo = {
    color: "var(--color-muted-foreground)",
    fontFamily: "var(--font-mono)",
}

const SIN_TOTALES = { ingresos: 0, egresos: 0 }

function textoOperaciones(cantidad: number) {
    return cantidad === 1 ? "1 operación" : `${cantidad} operaciones`
}

type Cuenta = {
    nombre: string
    tipo: string
    moneda: string
    saldo: number
}

type Tarjeta = {
    moneda: string
    deuda_actual: number
}

type Categoria = {
    id: number
    color: string | null
}

export default function GlobalPage({ version = 0 }: { version?: number }) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [topes, setTopes] = useState<Record<string, number>>({})
    const [monedaElegida, setMonedaElegida] = useState("")
    const [periodoClave, setPeriodoClave] = useState<ClavePeriodo>("mes")
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")

    async function cargar() {
        try {
            const [movs, ctas, tjs, cats, presupuestos] = await Promise.all([
                listarMovimientos(),
                listarCuentas(),
                listarTarjetas(),
                listarCategorias(),
                // si falla (ej. falta la migración) la página sigue sin topes
                listarPresupuestos().catch(function () {
                    return []
                }),
            ])
            setMovimientos(movs)
            setCuentas(ctas)
            setTarjetas(tjs)
            setCategorias(cats)

            const mapa: Record<string, number> = {}

            for (const presupuesto of presupuestos) {
                mapa[presupuesto.moneda] = Number(presupuesto.tope_mensual)
            }

            setTopes(mapa)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los datos globales"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [version])

    // ---------- Datos calculados ----------

    const contables = movimientos.filter(esContable)

    const monedas = Array.from(
        new Set(
            contables
                .map(function (m) {
                    return m.moneda
                })
                .concat(
                    cuentas.map(function (cuenta) {
                        return cuenta.moneda
                    }),
                    tarjetas.map(function (tarjeta) {
                        return tarjeta.moneda
                    })
                )
        )
    ).sort()

    // si todavía no eligió moneda (o la elegida ya no existe): guaraníes si hay, si no la primera
    const moneda = monedas.includes(monedaElegida)
        ? monedaElegida
        : monedas.includes("PYG")
          ? "PYG"
          : monedas[0]

    // Periodo elegido y el tramo equivalente anterior (para comparar)
    const periodo = periodoActual(periodoClave)
    const anterior = periodoAnterior(periodoClave, periodo)

    const delPeriodo = contables.filter(function (m) {
        return dentroDe(m, periodo)
    })
    const delAnterior = contables.filter(function (m) {
        return dentroDe(m, anterior)
    })

    const totales = totalesPorMoneda(delPeriodo)[moneda] ?? SIN_TOTALES
    const totalesAnterior =
        totalesPorMoneda(delAnterior)[moneda] ?? SIN_TOTALES

    const ingresos = totales.ingresos
    const egresos = totales.egresos
    const flujo = flujoNeto(totales)

    const cantidadEgresos = delPeriodo.filter(function (m) {
        return m.moneda === moneda && m.tipo === "EGRESO"
    }).length

    // Estos dos son de hoy: no dependen del periodo elegido
    const disponible = patrimonioPorMoneda(cuentas)[moneda] ?? 0
    const deudaTarjetas = tarjetas.reduce(function (total, tarjeta) {
        return tarjeta.moneda === moneda
            ? total + Number(tarjeta.deuda_actual)
            : total
    }, 0)
    const posicionNeta = disponible - deudaTarjetas

    // KPIs
    const ahorro = tasaAhorro(ingresos, egresos)
    const variacion = variacionPorcentual(egresos, totalesAnterior.egresos)

    // Métricas secundarias
    const dias = diasEnPeriodo(periodo)
    const promedioDiario = egresos / dias
    const ingresoPromedioMensual = ingresos / mesesEnPeriodo(periodo)
    const endeudamiento = ratioEndeudamiento(
        deudaTarjetas,
        ingresoPromedioMensual
    )

    // Datos de los gráficos
    const serie = serieMensual(contables, moneda)

    const colores: Record<number, string> = {}

    for (const categoria of categorias) {
        if (categoria.color) {
            colores[categoria.id] = categoria.color
        }
    }

    const porcionesGasto = composicionPorCategoria(
        delPeriodo,
        moneda,
        colores,
        "EGRESO"
    )
    const porcionesIngreso = composicionPorCategoria(
        delPeriodo,
        moneda,
        colores,
        "INGRESO"
    )

    // Tope mensual de la moneda elegida
    async function guardarTope(valor: number) {
        await guardarPresupuesto(moneda, valor)
        setTopes({ ...topes, [moneda]: valor })
    }

    async function quitarTope() {
        await quitarPresupuesto(moneda)

        const copia = { ...topes }
        delete copia[moneda]
        setTopes(copia)
    }

    // Fila de una métrica secundaria
    function fila(titulo: string, valor: string, detalle: string) {
        return (
            <div key={titulo}>
                <dt className="text-xs" style={estiloTitulo}>
                    {titulo}
                </dt>
                <dd
                    className="text-lg font-light break-words"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    {valor}
                </dd>
                <dd
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    {detalle}
                </dd>
            </div>
        )
    }

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <h1 className="text-lg font-medium">Global</h1>

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {!cargando && <AlertaSaldoNegativo cuentas={cuentas} />}
            {cargando && <Cargando />}

            {!cargando && !error && monedas.length === 0 && (
                <EstadoVacio texto="Todavía no hay movimientos ni cuentas para resumir." />
            )}

            {!cargando && monedas.length > 0 && (
                <>
                    {/* Fila 1: selector de periodo y moneda + 4 KPIs */}
                    <div className="space-y-3">
                        <SelectorPeriodo
                            value={periodoClave}
                            onChange={setPeriodoClave}
                        />

                        <p
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            Del {fechaCorta(periodo.desde)} al{" "}
                            {fechaCorta(periodo.hasta)}. Se compara con el
                            mismo tramo anterior ({fechaCorta(anterior.desde)}{" "}
                            al {fechaCorta(anterior.hasta)}).
                        </p>

                        {monedas.length > 1 && (
                            <div
                                role="group"
                                aria-label="Moneda"
                                className="flex flex-wrap items-center gap-2"
                            >
                                <span
                                    className="text-xs"
                                    style={estiloTitulo}
                                    aria-hidden="true"
                                >
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
                        )}
                    </div>

                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            titulo="Liquidez real"
                            valor={formatearMonto(disponible, moneda)}
                            unidad={moneda}
                            detalle="Saldo actual de tus cuentas"
                            color={
                                disponible >= 0
                                    ? "var(--color-income)"
                                    : "var(--color-expense)"
                            }
                        />

                        <KpiCard
                            titulo="Tasa de ahorro"
                            valor={
                                ahorro === null
                                    ? "—"
                                    : formatearPorcentaje(ahorro)
                            }
                            detalle={
                                ahorro === null
                                    ? "Sin ingresos en el periodo"
                                    : `Flujo neto: ${flujo >= 0 ? "+" : "−"}${formatearMonto(Math.abs(flujo), moneda)} ${moneda}`
                            }
                            color={
                                ahorro === null
                                    ? "var(--color-muted-foreground)"
                                    : ahorro >= 0
                                      ? "var(--color-income)"
                                      : "var(--color-expense)"
                            }
                        />

                        <KpiCard
                            titulo="Gastos del periodo"
                            valor={formatearMonto(egresos, moneda)}
                            unidad={moneda}
                            detalle={textoOperaciones(cantidadEgresos)}
                            color="var(--color-expense)"
                        />

                        <KpiCard
                            titulo="Variación de gasto"
                            valor={
                                variacion === null
                                    ? "—"
                                    : formatearPorcentaje(variacion, true)
                            }
                            detalle={
                                variacion === null
                                    ? "Sin gastos en el periodo anterior"
                                    : `Antes: ${formatearMonto(totalesAnterior.egresos, moneda)} ${moneda}`
                            }
                            color={
                                variacion === null || variacion === 0
                                    ? "var(--color-muted-foreground)"
                                    : variacion > 0
                                      ? "var(--color-expense)"
                                      : "var(--color-income)"
                            }
                        />
                    </div>

                    {/* Fila 2: evolución histórica + composición del gasto */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                        <EvolucionChart datos={serie} moneda={moneda} />

                        <ComposicionGastoChart
                            gastos={porcionesGasto}
                            ingresos={porcionesIngreso}
                            totalGastos={egresos}
                            totalIngresos={ingresos}
                            moneda={moneda}
                        />
                    </div>

                    {/* Fila 3: ritmo de gasto + métricas secundarias */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                        <RitmoGastoChart
                            movimientos={contables}
                            moneda={moneda}
                            tope={topes[moneda] ?? null}
                            onGuardarTope={guardarTope}
                            onQuitarTope={quitarTope}
                        />

                        <section className="p-4 sm:p-6" style={estiloCard}>
                            <h2 className="text-xs mb-4" style={estiloTitulo}>
                                Métricas del periodo
                            </h2>

                            <dl className="grid gap-5 grid-cols-1">
                                {fila(
                                    "Promedio de gasto diario",
                                    `${formatearMonto(promedioDiario, moneda)} ${moneda}`,
                                    `${dias} ${dias === 1 ? "día" : "días"} en el periodo`
                                )}

                                {fila(
                                    "Ratio de endeudamiento",
                                    endeudamiento === null
                                        ? "—"
                                        : formatearPorcentaje(endeudamiento),
                                    endeudamiento === null
                                        ? "Sin ingresos en el periodo para comparar"
                                        : `Deuda en tarjetas sobre un ingreso promedio de ${formatearMonto(ingresoPromedioMensual, moneda)} ${moneda} al mes`
                                )}

                                {fila(
                                    "Deuda pendiente en tarjetas",
                                    `${formatearMonto(deudaTarjetas, moneda)} ${moneda}`,
                                    "Cuotas pendientes hoy"
                                )}

                                {fila(
                                    "Posición neta",
                                    `${formatearMonto(posicionNeta, moneda)} ${moneda}`,
                                    "Liquidez real menos deuda pendiente"
                                )}
                            </dl>
                        </section>
                    </div>

                    {/* Fila 4: tabla desplegable */}
                    <TablaMensual datos={serie} moneda={moneda} />
                </>
            )}
        </div>
    )
}