import { useEffect, useState } from "react"
import { listarMovimientos } from "../services/movimientoService"
import { listarCuentas } from "../services/cuentaService"
import { listarTarjetas } from "../services/tarjetaService"
import { listarCategorias } from "../services/categoriaService"
import { listarRecurrentes } from "../services/recurrenteService"
import { listarResumenes } from "../services/resumenService"
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
import { fechaHoy } from "../lib/fechas"
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
import {
    composicionPorCategoria,
    composicionPorMetodo,
    serieDiaria,
    serieMensual,
} from "../lib/graficos"
import {
    type RecurrenteProximo,
    type ResumenPendiente,
    compromisosProximos,
    totalApartado,
} from "../lib/apartado"
import MetodoPagoChart from "../components/global/MetodoPagoChart"
import DisponibleRealCard from "../components/global/DisponibleRealCard"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import KpiCard from "../components/ui/KpiCard"
import Pestanas from "../components/ui/Pestanas"
import SelectorPeriodo from "../components/ui/SelectorPeriodo"
import EvolucionChart from "../components/global/EvolucionChart"
import ComposicionGastoChart from "../components/global/ComposicionGastoChart"
import RitmoGastoChart from "../components/global/RitmoGastoChart"
import TablaMensual from "../components/global/TablaMensual"
import AlertaSaldoNegativo from "../components/ui/AlertaSaldoNegativo"
import AlertaTope from "../components/global/AlertaTope"

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

type PestanaGlobal = "resumen" | "evolucion" | "gastos"

const PESTANAS: { key: PestanaGlobal; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "evolucion", label: "Evolución" },
    { key: "gastos", label: "Gastos" },
]

function textoOperaciones(cantidad: number) {
    return cantidad === 1 ? "1 operación" : `${cantidad} operaciones`
}

type Cuenta = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    saldo: number
}

type Tarjeta = {
    id: number
    nombre: string
    moneda: string
    estado: string
    deuda_actual: number
}

type Categoria = {
    id: number
    color: string | null
}

// Resúmenes pendientes de todas las tarjetas activas. Si una falla,
// el resto de la página sigue funcionando.
async function cargarResumenes(
    tarjetas: Tarjeta[]
): Promise<ResumenPendiente[]> {
    const activas = tarjetas.filter(function (t) {
        return t.estado === "ACTIVA"
    })

    const listas = await Promise.all(
        activas.map(async function (t) {
            try {
                const datos = await listarResumenes(t.id)

                return datos.resumenes.map(function (r: any) {
                    return {
                        tarjeta: t.nombre,
                        moneda: t.moneda,
                        fecha_vencimiento: r.fecha_vencimiento,
                        total_pendiente: Number(r.total_pendiente),
                    }
                })
            } catch {
                return []
            }
        })
    )

    return listas.flat()
}

export default function GlobalPage({ version = 0 }: { version?: number }) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [recurrentes, setRecurrentes] = useState<RecurrenteProximo[]>([])
    const [resumenes, setResumenes] = useState<ResumenPendiente[]>([])
    const [topes, setTopes] = useState<Record<string, number>>({})
    const [monedaElegida, setMonedaElegida] = useState("")
    const [periodoClave, setPeriodoClave] = useState<ClavePeriodo>("mes")
    const [pestana, setPestana] = useState<PestanaGlobal>("resumen")
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")

    async function cargar() {
        try {
            const [movs, ctas, tjs, cats, presupuestos, recs] =
                await Promise.all([
                    listarMovimientos(),
                    listarCuentas(),
                    listarTarjetas(),
                    listarCategorias(),
                    // si falla (ej. falta la migración) la página sigue sin topes
                    listarPresupuestos().catch(function () {
                        return []
                    }),
                    listarRecurrentes().catch(function () {
                        return []
                    }),
                ])
            setMovimientos(movs)
            setCuentas(ctas)
            setTarjetas(tjs)
            setCategorias(cats)
            setRecurrentes(recs)
            setResumenes(await cargarResumenes(tjs))

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

    // Estos son de hoy: no dependen del periodo elegido
    const disponible = patrimonioPorMoneda(cuentas)[moneda] ?? 0
    const deudaTarjetas = tarjetas.reduce(function (total, tarjeta) {
        return tarjeta.moneda === moneda
            ? total + Number(tarjeta.deuda_actual)
            : total
    }, 0)
    const posicionNeta = disponible - deudaTarjetas

    // Apartado: compromisos de los próximos 30 días (ver lib/apartado.ts)
    const idsTarjeta = new Set<number>(
        cuentas
            .filter(function (c) {
                return c.tipo === "TARJETA_CREDITO"
            })
            .map(function (c) {
                return c.id
            })
    )

    const compromisos = compromisosProximos(
        resumenes,
        recurrentes,
        idsTarjeta,
        fechaHoy()
    ).filter(function (c) {
        return c.moneda === moneda
    })
    const apartado = totalApartado(compromisos, moneda)

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
    const serieDia = serieDiaria(contables, moneda, periodo)

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

    const tiposPorCuenta: Record<number, string> = {}

    for (const cuenta of cuentas) {
        tiposPorCuenta[cuenta.id] = cuenta.tipo
    }

    const porcionesMetodo = composicionPorMetodo(
        delPeriodo,
        moneda,
        tiposPorCuenta
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
            {!cargando && <AlertaTope movimientos={contables} moneda={moneda} tope={topes[moneda] ?? null} />}
            {cargando && <Cargando />}

            {!cargando && !error && monedas.length === 0 && (
                <EstadoVacio texto="Todavía no hay movimientos ni cuentas para resumir." />
            )}

            {!cargando && monedas.length > 0 && (
                <>
                    {/* Selector de periodo y moneda: vale para todas las pestañas */}
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

                    <Pestanas
                        idBase="global"
                        etiqueta="Secciones de Global"
                        pestanas={PESTANAS}
                        value={pestana}
                        onChange={function (clave) {
                            setPestana(clave as PestanaGlobal)
                        }}
                    />

                    {/* Solo se dibuja la pestaña activa: así los gráficos
                        se miden bien al aparecer. */}
                    <div
                        role="tabpanel"
                        id={`global-panel-${pestana}`}
                        aria-labelledby={`global-tab-${pestana}`}
                        className="space-y-6"
                    >
                        {pestana === "resumen" && (
                            <>
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

                                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                                    <DisponibleRealCard
                                        liquidez={disponible}
                                        apartado={apartado}
                                        compromisos={compromisos}
                                        moneda={moneda}
                                    />

                                    <section
                                        className="p-4 sm:p-6"
                                        style={estiloCard}
                                    >
                                        <h2
                                            className="text-xs mb-4"
                                            style={estiloTitulo}
                                        >
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
                            </>
                        )}

                        {pestana === "evolucion" && (
                            <>
                                <EvolucionChart
                                    datos={serie}
                                    datosDiarios={serieDia}
                                    periodo={periodo}
                                    moneda={moneda}
                                />

                                <TablaMensual datos={serie} moneda={moneda} />
                            </>
                        )}

                        {pestana === "gastos" && (
                            <>
                                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                                    <ComposicionGastoChart
                                        gastos={porcionesGasto}
                                        ingresos={porcionesIngreso}
                                        totalGastos={egresos}
                                        totalIngresos={ingresos}
                                        moneda={moneda}
                                    />

                                    <MetodoPagoChart
                                        porciones={porcionesMetodo}
                                        total={egresos}
                                        moneda={moneda}
                                    />
                                </div>

                                <RitmoGastoChart
                                    movimientos={contables}
                                    moneda={moneda}
                                    tope={topes[moneda] ?? null}
                                    onGuardarTope={guardarTope}
                                    onQuitarTope={quitarTope}
                                />
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}