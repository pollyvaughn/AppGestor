import { useEffect, useRef, useState } from "react"
import {
    listarMovimientos,
    crearMovimiento,
    editarMovimiento,
    eliminarMovimiento,
} from "../services/movimientoService"
import { listarCategorias } from "../services/categoriaService"
import { listarCuentas } from "../services/cuentaService"
import {
    type Movimiento,
    MESES,
    esContable,
    mesActual,
    mesDe,
    nombreMes,
} from "../lib/movimientos"
import { formatearMonto } from "../lib/moneda"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Select from "../components/ui/Select"
import MontoInput from "../components/ui/MontoInput"
import Modal from "../components/ui/Modal"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import CategoriaShortcut from "../components/ui/CategoriaShortcut"

type Tipo = "INGRESO" | "EGRESO"

type Filtro = "TODOS" | Tipo

type Categoria = {
    id: number
    nombre: string
    tipo: Tipo
    color: string | null
}

type CategoriaResumen = {
    id: number | null
    nombre: string
    total: number
    color: string
}

type FiltroCategoria = {
    tipo: Tipo
    categoriaId: number | null
    nombre: string
}

type Cuenta = { id: number; nombre: string; tipo: string; moneda: string }

type MensualPageProps = {
    onIrATarjetas: () => void
    onIrACategorias: () => void
}

type Formulario = {
    tipo: Tipo
    categoriaId: string
    cuentaId: string
    moneda: string
    monto: string
    fecha: string
    descripcion: string
}

const MONEDAS = ["PYG", "USD", "EUR", "ARS", "BRL"]

const COLOR_POR_DEFECTO = "#7A7873"

const SIN_CATEGORIA = "Sin categoría"

const FILTROS: { key: Filtro; label: string }[] = [
    { key: "TODOS", label: "Todos" },
    { key: "INGRESO", label: "Ingresos" },
    { key: "EGRESO", label: "Gastos" },
]

// Texto para los movimientos que no son ingreso ni gasto
const ETIQUETA_TIPO: Record<string, string> = {
    TRANSFERENCIA: "Transferencia",
    PAGO_TARJETA: "Pago de tarjeta",
    AJUSTE: "Ajuste",
}

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

// "2026-10-10T00:00:00" => "10/10/2026"
function fechaCorta(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-")
    return `${dia}/${mes}/${anio}`
}

function fechaHoy() {
    const h = new Date()
    const mes = String(h.getMonth() + 1).padStart(2, "0")
    const dia = String(h.getDate()).padStart(2, "0")
    return `${h.getFullYear()}-${mes}-${dia}`
}

function textoOperaciones(cantidad: number) {
    return cantidad === 1 ? "1 operación" : `${cantidad} operaciones`
}

function formularioVacio(): Formulario {
    return {
        tipo: "EGRESO",
        categoriaId: "",
        cuentaId: "",
        moneda: "PYG",
        monto: "",
        fecha: fechaHoy(),
        descripcion: "",
    }
}

export default function MensualPage({
    onIrATarjetas,
    onIrACategorias,
}: MensualPageProps) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [mes, setMes] = useState(mesActual())
    const [monedaElegida, setMonedaElegida] = useState("")
    const [filtro, setFiltro] = useState<Filtro>("TODOS")
    const [categoriaFiltro, setCategoriaFiltro] =
        useState<FiltroCategoria | null>(null)
    const [categoriasExpandidas, setCategoriasExpandidas] = useState({
        INGRESO: false,
        EGRESO: false,
    })
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio())

    // mes tiene la forma "2026-10": lo separamos en año y número de mes (1 a 12)
    const [anioSel, numeroMesSel] = mes.split("-").map(Number)
    const mesElegidoRef = useRef<HTMLButtonElement>(null)

    function cambiarAnio(delta: number) {
        setMes(`${anioSel + delta}-${String(numeroMesSel).padStart(2, "0")}`)
    }

    function elegirMes(indice: number) {
        setMes(`${anioSel}-${String(indice + 1).padStart(2, "0")}`)
    }

    // en celular la fila de meses se desplaza: dejamos el mes elegido a la vista
    useEffect(
        function () {
            mesElegidoRef.current?.scrollIntoView({
                inline: "center",
                block: "nearest",
            })
        },
        [mes]
    )

    async function cargar() {
        try {
            const [movs, cats, ctas] = await Promise.all([
                listarMovimientos(),
                listarCategorias(),
                listarCuentas(),
            ])
            setMovimientos(movs)
            setCategorias(cats)
            setCuentas(ctas)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los datos"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    // ---------- Abrir el formulario ----------

    function abrirNuevo() {
        setEditando(null)
        setFormulario(formularioVacio())
        setError("")
        setModalAbierto(true)
    }

    function abrirEdicion(m: Movimiento) {
        setEditando(m.id)
        setFormulario({
            tipo: m.tipo as Tipo,
            categoriaId: m.categoria_id ? String(m.categoria_id) : "",
            cuentaId: m.metodo_pago_id ? String(m.metodo_pago_id) : "",
            moneda: m.moneda,
            monto: String(Number(m.monto)),
            fecha: m.fecha.slice(0, 10),
            descripcion: m.descripcion ?? "",
        })
        setError("")
        setModalAbierto(true)
    }

    // ---------- Cambios dentro del formulario ----------

    function cambiarTipo(tipo: Tipo) {
        // al cambiar el tipo, la categoría anterior ya no sirve
        setFormulario({ ...formulario, tipo: tipo, categoriaId: "" })
    }

    function cambiarCuenta(cuentaId: string) {
        const cuenta = cuentas.find(function (c) {
            return String(c.id) === cuentaId
        })

        setFormulario({
            ...formulario,
            cuentaId: cuentaId,
            // si eligió cuenta, la moneda es la de la cuenta
            moneda: cuenta ? cuenta.moneda : formulario.moneda,
        })
    }

    function cambiarMoneda(moneda: string) {
        setFormulario({
            ...formulario,
            moneda: moneda,
            // guaraníes no tienen decimales
            monto:
                moneda === "PYG"
                    ? String(Math.trunc(Number(formulario.monto || 0)))
                    : formulario.monto,
        })
    }

    // ---------- Guardar ----------

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")
        setMensaje("")

        if (Number(formulario.monto) <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        const datos = {
            tipo: formulario.tipo,
            categoria_id: Number(formulario.categoriaId) || null,
            metodo_pago_id: Number(formulario.cuentaId) || null,
            descripcion: formulario.descripcion || null,
            monto: Number(formulario.monto),
            moneda: formulario.moneda,
            fecha: formulario.fecha || null,
        }

        try {
            if (editando === null) {
                await crearMovimiento(datos)
                setMensaje("Movimiento creado")
            } else {
                await editarMovimiento(editando, datos)
                setMensaje("Movimiento actualizado")
            }

            setModalAbierto(false)
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar el movimiento"
            )
        }
    }

    // ---------- Anular ----------

    async function anular(m: Movimiento) {
        const confirmar = window.confirm("¿Anular este movimiento?")

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarMovimiento(m.id)
            setMensaje("Movimiento anulado")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo anular el movimiento"
            )
        }
    }

    // ---------- Datos calculados ----------

    function puedeEditar(m: Movimiento) {
        if (m.tipo !== "INGRESO" && m.tipo !== "EGRESO") {
            return false
        }

        const cuenta = cuentas.find(function (c) {
            return c.id === m.metodo_pago_id
        })

        // las compras con tarjeta se manejan en la pestaña Tarjetas
        return !(cuenta && cuenta.tipo === "TARJETA_CREDITO")
    }

    function colorDe(m: Movimiento) {
        const categoria = categorias.find(function (c) {
            return c.id === m.categoria_id
        })

        return categoria?.color ?? COLOR_POR_DEFECTO
    }

    const delMes = movimientos.filter(function (m) {
        return mesDe(m) === mes && m.estado !== "ANULADO"
    })

    // Los montos de monedas distintas no se pueden sumar: si el mes tiene
    // más de una moneda, se elige cuál mirar.
    const monedas = Array.from(
        new Set(
            delMes.map(function (m) {
                return m.moneda
            })
        )
    ).sort()

    const moneda = monedas.includes(monedaElegida)
        ? monedaElegida
        : (monedas[0] ?? "PYG")

    const delMesMoneda = delMes.filter(function (m) {
        return m.moneda === moneda
    })

    // Lo contable (ingresos y gastos confirmados) alimenta los totales
    const contables = delMesMoneda.filter(esContable)

    let ingresos = 0
    let egresos = 0
    let cantidadIngresos = 0
    let cantidadEgresos = 0
    const porCategoriaIngreso: Record<string, CategoriaResumen> = {}
    const porCategoriaEgreso: Record<string, CategoriaResumen> = {}

    for (const m of contables) {
        const monto = Number(m.monto)

        if (m.tipo === "INGRESO") {
            ingresos += monto
            cantidadIngresos += 1

            const key = `INGRESO:${m.categoria_id ?? "sin-categoria"}`
            const categoria = porCategoriaIngreso[key] ?? {
                id: m.categoria_id,
                nombre: m.categoria ?? SIN_CATEGORIA,
                total: 0,
                color: m.categoria ? colorDe(m) : COLOR_POR_DEFECTO,
            }
            categoria.total += monto
            porCategoriaIngreso[key] = categoria
        } else {
            egresos += monto
            cantidadEgresos += 1

            const key = `EGRESO:${m.categoria_id ?? "sin-categoria"}`
            const categoria = porCategoriaEgreso[key] ?? {
                id: m.categoria_id,
                nombre: m.categoria ?? SIN_CATEGORIA,
                total: 0,
                color: m.categoria ? colorDe(m) : COLOR_POR_DEFECTO,
            }
            categoria.total += monto
            porCategoriaEgreso[key] = categoria
        }
    }

    const balance = ingresos - egresos

    // Porcentaje de lo ingresado que no se gastó (solo tiene sentido si hubo ingresos)
    const tasaAhorro =
        ingresos > 0 ? Math.round((balance / ingresos) * 100) : null
    const anchoBarra =
        tasaAhorro === null ? 0 : Math.min(Math.max(tasaAhorro, 0), 100)

    const categoriasIngreso = Object.values(porCategoriaIngreso).sort(function (a, b) {
        return b.total - a.total
    })
    const categoriasGasto = Object.values(porCategoriaEgreso).sort(function (a, b) {
        return b.total - a.total
    })
    const mayorGasto = categoriasGasto[0]
    const menorGasto = categoriasGasto[categoriasGasto.length - 1]
    const maximoCategoriaIngreso =
        categoriasIngreso.length > 0 ? categoriasIngreso[0].total : 1
    const maximoCategoriaGasto =
        categoriasGasto.length > 0 ? categoriasGasto[0].total : 1

    const visibles = delMesMoneda.filter(function (m) {
        if (filtro !== "TODOS" && m.tipo !== filtro) {
            return false
        }

        if (
            categoriaFiltro !== null &&
            (m.tipo !== categoriaFiltro.tipo ||
                m.categoria_id !== categoriaFiltro.categoriaId)
        ) {
            return false
        }

        return true
    })

    const categoriasDelTipo = categorias.filter(function (c) {
        return c.tipo === formulario.tipo
    })

    const cuentasUsables = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO"
    })

    const cuentaElegida = formulario.cuentaId !== ""

    // al cambiar de mes o de moneda, el filtro por categoría deja de aplicar
    useEffect(
        function () {
            setCategoriaFiltro(null)
        },
        [mes, moneda]
    )

    function elegirCategoria(tipo: Tipo, categoria: CategoriaResumen) {
        if (
            categoriaFiltro?.tipo === tipo &&
            categoriaFiltro.categoriaId === categoria.id
        ) {
            setCategoriaFiltro(null)
            return
        }

        setCategoriaFiltro({
            tipo,
            categoriaId: categoria.id,
            nombre: categoria.nombre,
        })
        setFiltro(tipo)
    }

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Mensual</h1>

                <Button type="button" onClick={abrirNuevo}>
                    + Nuevo movimiento
                </Button>
            </div>

            {/* Selector de año y mes */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        aria-label="Año anterior"
                        onClick={function () {
                            cambiarAnio(-1)
                        }}
                    >
                        ‹
                    </Button>

                    <span
                        className="text-sm font-medium text-center w-14"
                        style={{ fontFamily: "var(--font-mono)" }}
                        aria-live="polite"
                    >
                        {anioSel}
                    </span>

                    <Button
                        type="button"
                        variant="secondary"
                        aria-label="Año siguiente"
                        onClick={function () {
                            cambiarAnio(1)
                        }}
                    >
                        ›
                    </Button>

                    {mes !== mesActual() && (
                        <Button
                            type="button"
                            variant="secondary"
                            className="!text-xs"
                            onClick={function () {
                                setMes(mesActual())
                            }}
                        >
                            Hoy
                        </Button>
                    )}
                </div>

                <div
                    role="group"
                    aria-label={`Meses de ${anioSel}`}
                    className="flex items-center gap-1 overflow-x-auto pb-1"
                >
                    {MESES.map(function (nombre, indice) {
                        const elegido = indice + 1 === numeroMesSel
                        const esHoy =
                            `${anioSel}-${String(indice + 1).padStart(2, "0")}` ===
                            mesActual()

                        return (
                            <button
                                key={nombre}
                                ref={elegido ? mesElegidoRef : undefined}
                                type="button"
                                aria-pressed={elegido}
                                aria-label={`${nombre} ${anioSel}`}
                                onClick={function () {
                                    elegirMes(indice)
                                }}
                                className="shrink-0 text-xs px-3 py-1.5 min-h-11 md:min-h-0"
                                style={{
                                    borderRadius: "var(--radius-sm)",
                                    fontWeight: elegido ? 500 : 400,
                                    background: elegido
                                        ? "var(--color-foreground)"
                                        : "transparent",
                                    color: elegido
                                        ? "var(--color-background)"
                                        : esHoy
                                          ? "var(--color-foreground)"
                                          : "var(--color-muted-foreground)",
                                    border:
                                        esHoy && !elegido
                                            ? "1px solid var(--color-border)"
                                            : "1px solid transparent",
                                }}
                            >
                                {nombre}
                            </button>
                        )
                    })}
                </div>
            </div>

            {error && !modalAbierto && <Mensaje tipo="error">{error}</Mensaje>}
            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && delMes.length === 0 && (
                <section className="p-6" style={estiloCard}>
                    <EstadoVacio
                        texto={`Sin movimientos en ${nombreMes(mes)}. Usá "+ Nuevo movimiento" para registrar el primero.`}
                    />
                </section>
            )}

            {!cargando && delMes.length > 0 && (
                <>
                    {/* Selector de moneda: solo si el mes tiene más de una */}
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

                    {/* Resumen del mes */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                        <div
                            className="p-5 sm:p-6 flex flex-col justify-between"
                            style={{
                                background: "var(--color-foreground)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <span
                                className="text-xs"
                                style={{
                                    color: "var(--color-accent)",
                                    fontFamily: "var(--font-mono)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                Balance {nombreMes(mes)}
                            </span>

                            <p
                                className="mt-4 text-3xl font-light break-words"
                                style={{
                                    color: "var(--color-background)",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                {balance >= 0 ? "+" : "−"}
                                {formatearMonto(Math.abs(balance), moneda)}{" "}
                                <span
                                    className="text-sm"
                                    style={{ color: "var(--color-accent)" }}
                                >
                                    {moneda}
                                </span>
                            </p>

                            <div className="mt-4">
                                <div
                                    className="h-1 w-full rounded-full"
                                    style={{ background: "rgba(255,255,255,0.2)" }}
                                    aria-hidden="true"
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${anchoBarra}%`,
                                            background: "var(--color-background)",
                                        }}
                                    />
                                </div>

                                <p
                                    className="mt-2 text-xs"
                                    style={{ color: "var(--color-accent)" }}
                                >
                                    {tasaAhorro === null
                                        ? "Sin ingresos este mes"
                                        : tasaAhorro >= 0
                                          ? `Ahorraste el ${tasaAhorro}% de tus ingresos`
                                          : "Gastaste más de lo que ingresaste"}
                                </p>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col justify-between" style={estiloCard}>
                            <span className="text-xs" style={estiloTitulo}>
                                Ingresos
                            </span>
                            <p
                                className="mt-4 text-2xl font-light break-words"
                                style={{
                                    color: "var(--color-income)",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                {formatearMonto(ingresos, moneda)}{" "}
                                <span className="text-sm">{moneda}</span>
                            </p>
                            <p
                                className="mt-2 text-xs"
                                style={{ color: "var(--color-muted-foreground)" }}
                            >
                                {textoOperaciones(cantidadIngresos)}
                            </p>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col justify-between" style={estiloCard}>
                            <span className="text-xs" style={estiloTitulo}>
                                Gastos
                            </span>
                            <p
                                className="mt-4 text-2xl font-light break-words"
                                style={{
                                    color: "var(--color-expense)",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                {formatearMonto(egresos, moneda)}{" "}
                                <span className="text-sm">{moneda}</span>
                            </p>
                            <p
                                className="mt-2 text-xs"
                                style={{ color: "var(--color-muted-foreground)" }}
                            >
                                {textoOperaciones(cantidadEgresos)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-2 space-y-6 self-start">
                            {[
                                {
                                    tipo: "INGRESO" as const,
                                    titulo: "Ingresos por categoría",
                                    vacio: "Sin ingresos este mes.",
                                    categorias: categoriasIngreso,
                                    maximo: maximoCategoriaIngreso,
                                    total: ingresos,
                                },
                                {
                                    tipo: "EGRESO" as const,
                                    titulo: "Gastos por categoría",
                                    vacio: "Sin gastos este mes.",
                                    categorias: categoriasGasto,
                                    maximo: maximoCategoriaGasto,
                                    total: egresos,
                                },
                            ].map(function (grupo) {
                                const expandida = categoriasExpandidas[grupo.tipo]
                                const visibles = expandida
                                    ? grupo.categorias
                                    : grupo.categorias.slice(0, 5)

                                return (
                                    <section
                                        key={grupo.tipo}
                                        className="p-4 sm:p-6"
                                        style={estiloCard}
                                    >
                                        <h2 className="text-xs mb-1" style={estiloTitulo}>
                                            {grupo.titulo}
                                        </h2>
                                        <p
                                            className="text-xs mb-4"
                                            style={{ color: "var(--color-muted-foreground)" }}
                                        >
                                            Tocá una categoría para ver solo sus movimientos.
                                        </p>

                                        {grupo.tipo === "EGRESO" &&
                                            categoriasGasto.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                    {[
                                                        {
                                                            titulo: "Mayor gasto",
                                                            categoria: mayorGasto,
                                                        },
                                                        ...(categoriasGasto.length > 1
                                                            ? [
                                                                  {
                                                                      titulo: "Menor gasto",
                                                                      categoria: menorGasto,
                                                                  },
                                                              ]
                                                            : []),
                                                    ].map(function (resumen) {
                                                        const porcentaje =
                                                            resumen.categoria && egresos > 0
                                                                ? Math.round(
                                                                      (resumen.categoria.total /
                                                                          egresos) *
                                                                          100
                                                                  )
                                                                : 0

                                                        return (
                                                            <div
                                                                key={resumen.titulo}
                                                                className="p-3 space-y-1"
                                                                style={{
                                                                    background:
                                                                        "var(--color-muted)",
                                                                    borderRadius:
                                                                        "var(--radius-sm)",
                                                                }}
                                                            >
                                                                <p
                                                                    className="text-xs"
                                                                    style={{
                                                                        color: "var(--color-muted-foreground)",
                                                                    }}
                                                                >
                                                                    {resumen.titulo}
                                                                </p>
                                                                <p className="text-sm font-medium truncate">
                                                                    {resumen.categoria?.nombre}
                                                                </p>
                                                                <p
                                                                    className="text-xs"
                                                                    style={{
                                                                        fontFamily:
                                                                            "var(--font-mono)",
                                                                    }}
                                                                >
                                                                    {resumen.categoria
                                                                        ? `${formatearMonto(
                                                                              resumen.categoria.total,
                                                                              moneda
                                                                          )} ${moneda} · ${porcentaje}% del gasto`
                                                                        : ""}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                        {grupo.categorias.length === 0 && (
                                            <EstadoVacio texto={grupo.vacio} />
                                        )}

                                        <ul
                                            id={`categorias-${grupo.tipo.toLowerCase()}-mensual`}
                                            className="space-y-1"
                                        >
                                            {visibles.map(function (categoria) {
                                                const activa =
                                                    categoriaFiltro?.tipo === grupo.tipo &&
                                                    categoriaFiltro.categoriaId === categoria.id

                                                return (
                                                    <li
                                                        key={`${grupo.tipo}:${categoria.id ?? "sin-categoria"}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-pressed={activa}
                                                            onClick={function () {
                                                                elegirCategoria(grupo.tipo, categoria)
                                                            }}
                                                            className="w-full text-left p-2 min-h-11 md:min-h-0 space-y-1.5"
                                                            style={{
                                                                borderRadius: "var(--radius-sm)",
                                                                background: activa
                                                                    ? "var(--color-muted)"
                                                                    : "transparent",
                                                            }}
                                                        >
                                                            <span className="flex items-center justify-between gap-3">
                                                                <span className="flex items-center gap-2 min-w-0">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full shrink-0"
                                                                        style={{ background: categoria.color }}
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span
                                                                        className="text-sm truncate"
                                                                        style={{ fontWeight: activa ? 600 : 400 }}
                                                                    >
                                                                        {categoria.nombre}
                                                                    </span>
                                                                </span>
                                                                <span
                                                                    className="text-xs shrink-0"
                                                                    style={{ fontFamily: "var(--font-mono)" }}
                                                                >
                                                                    {formatearMonto(categoria.total, moneda)} {moneda}
                                                                </span>
                                                            </span>

                                                            <span
                                                                className="block h-1.5 w-full rounded-full"
                                                                style={{ background: "var(--color-muted)" }}
                                                                aria-hidden="true"
                                                            >
                                                                <span
                                                                    className="block h-full rounded-full"
                                                                    style={{
                                                                        width: `${
                                                                            grupo.tipo === "EGRESO" &&
                                                                            grupo.total > 0
                                                                                ? (categoria.total /
                                                                                      grupo.total) *
                                                                                  100
                                                                                : (categoria.total /
                                                                                      grupo.maximo) *
                                                                                  100
                                                                        }%`,
                                                                        background: categoria.color,
                                                                    }}
                                                                />
                                                            </span>
                                                        </button>
                                                    </li>
                                                )
                                            })}
                                        </ul>

                                        {grupo.categorias.length > 5 && (
                                            <button
                                                type="button"
                                                aria-expanded={expandida}
                                                aria-controls={`categorias-${grupo.tipo.toLowerCase()}-mensual`}
                                                onClick={function () {
                                                    setCategoriasExpandidas({
                                                        ...categoriasExpandidas,
                                                        [grupo.tipo]: !expandida,
                                                    })
                                                }}
                                                className="mt-3 text-xs underline min-h-11 md:min-h-0"
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

                        {/* Movimientos */}
                        <section
                            className="lg:col-span-3 p-4 sm:p-6"
                            style={estiloCard}
                        >
                            <h2 className="text-xs mb-4" style={estiloTitulo}>
                                Movimientos
                            </h2>

                            <div
                                role="group"
                                aria-label="Filtrar movimientos por tipo"
                                className="flex flex-wrap gap-2 mb-4"
                            >
                                {FILTROS.map(function (f) {
                                    const activo = filtro === f.key

                                    return (
                                        <Button
                                            key={f.key}
                                            type="button"
                                            variant={activo ? "primary" : "secondary"}
                                            aria-pressed={activo}
                                            className="!py-1 !text-xs"
                                            onClick={function () {
                                                setFiltro(f.key)
                                            }}
                                        >
                                            {f.label}
                                        </Button>
                                    )
                                })}
                            </div>

                            {categoriaFiltro !== null && (
                                <div
                                    className="flex items-center justify-between gap-3 mb-3 px-3 py-2"
                                    style={{
                                        background: "var(--color-muted)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-sm)",
                                    }}
                                >
                                    <span className="text-xs">
                                        Categoría de{" "}
                                        <strong>
                                            {categoriaFiltro.tipo === "INGRESO" ? "ingreso" : "egreso"}:{" "}
                                            {categoriaFiltro.nombre}
                                        </strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={function () {
                                            setCategoriaFiltro(null)
                                        }}
                                        className="text-xs underline min-h-11 md:min-h-0"
                                        style={{ color: "var(--color-muted-foreground)" }}
                                    >
                                        Quitar filtro
                                    </button>
                                </div>
                            )}

                            {visibles.length === 0 && (
                                <EstadoVacio texto="No hay movimientos con este filtro." />
                            )}

                            <ul>
                                {visibles.map(function (m) {
                                    const signo =
                                        m.tipo === "INGRESO"
                                            ? "+"
                                            : m.tipo === "EGRESO"
                                              ? "−"
                                              : ""

                                    const etiquetaTipo = ETIQUETA_TIPO[m.tipo]
                                    const metodoPago = cuentas.find(function (cuenta) {
                                        return cuenta.id === m.metodo_pago_id
                                    })
                                    const color = esContable(m)
                                        ? colorDe(m)
                                        : COLOR_POR_DEFECTO
                                    const titulo =
                                        m.descripcion ||
                                        m.categoria ||
                                        etiquetaTipo ||
                                        m.tipo
                                    const inicial = (
                                        m.categoria ??
                                        etiquetaTipo ??
                                        titulo
                                    )
                                        .charAt(0)
                                        .toUpperCase()

                                    return (
                                        <li
                                            key={m.id}
                                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                                            style={{ borderBottom: "1px solid var(--color-border)" }}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <span
                                                    className="shrink-0 w-8 h-8 flex items-center justify-center text-xs font-medium"
                                                    style={{
                                                        background: `${color}22`,
                                                        color: color,
                                                        borderRadius: "var(--radius-sm)",
                                                    }}
                                                    aria-hidden="true"
                                                >
                                                    {inicial}
                                                </span>

                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {titulo}
                                                    </p>
                                                    <p
                                                        className="text-xs flex flex-wrap items-center gap-x-1.5 gap-y-1"
                                                        style={{ color: "var(--color-muted-foreground)" }}
                                                    >
                                                        <span>{fechaCorta(m.fecha)}</span>
                                                        {m.categoria && <span>· {m.categoria}</span>}
                                                        {etiquetaTipo && <span>· {etiquetaTipo}</span>}
                                                        {m.metodo_pago && (
                                                            <span
                                                                className="px-1.5"
                                                                style={{
                                                                    background: "var(--color-muted)",
                                                                    borderRadius: "3px",
                                                                    fontFamily: "var(--font-mono)",
                                                                    fontSize: "11px",
                                                                }}
                                                            >
                                                                {metodoPago?.tipo === "TARJETA_CREDITO"
                                                                    ? `Tarjeta de crédito · ${m.metodo_pago}`
                                                                    : m.metodo_pago}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span
                                                    className="text-sm"
                                                    style={{
                                                        fontFamily: "var(--font-mono)",
                                                        color: !esContable(m)
                                                            ? "var(--color-muted-foreground)"
                                                            : m.tipo === "INGRESO"
                                                              ? "var(--color-income)"
                                                              : "var(--color-expense)",
                                                    }}
                                                >
                                                    {signo}
                                                    {formatearMonto(m.monto, m.moneda)} {m.moneda}
                                                </span>

                                                {puedeEditar(m) && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            aria-label={`Editar ${titulo}`}
                                                            className="!py-1 !text-xs"
                                                            onClick={function () {
                                                                abrirEdicion(m)
                                                            }}
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            aria-label={`Anular ${titulo}`}
                                                            className="!py-1 !text-xs"
                                                            onClick={function () {
                                                                anular(m)
                                                            }}
                                                        >
                                                            Anular
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    </div>
                </>
            )}

            <Modal
                open={modalAbierto}
                title={editando === null ? "Nuevo movimiento" : "Editar movimiento"}
                onClose={function () {
                    setModalAbierto(false)
                }}
            >
                <form onSubmit={guardar} className="space-y-4">
                    <Select
                        id="tipo"
                        label="Tipo"
                        value={formulario.tipo}
                        onChange={function (e) {
                            cambiarTipo(e.target.value as Tipo)
                        }}
                    >
                        <option value="EGRESO">Egreso</option>
                        <option value="INGRESO">Ingreso</option>
                    </Select>

                    <Select
                        id="categoria"
                        label="Categoría"
                        value={formulario.categoriaId}
                        onChange={function (e) {
                            setFormulario({ ...formulario, categoriaId: e.target.value })
                        }}
                    >
                        <option value="">Sin categoría</option>
                        {categoriasDelTipo.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            )
                        })}
                    </Select>
                    <div className="flex justify-end">
                        <CategoriaShortcut onClick={onIrACategorias} />
                    </div>

                    <Select
                        id="cuenta"
                        label="Cuenta"
                        value={formulario.cuentaId}
                        onChange={function (e) {
                            cambiarCuenta(e.target.value)
                        }}
                    >
                        <option value="">Sin cuenta</option>
                        {cuentasUsables.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} ({c.moneda})
                                </option>
                            )
                        })}
                    </Select>

                    <div
                        className="flex flex-wrap items-center justify-between gap-2 p-3"
                        style={{
                            background: "var(--color-muted)",
                            borderRadius: "var(--radius-sm)",
                        }}
                    >
                        <p
                            className="text-xs flex-1"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            Las compras con tarjeta se registran en la pestaña Tarjetas, donde se crean sus cuotas.
                        </p>
                        <button
                            type="button"
                            onClick={function () {
                                setModalAbierto(false)
                                onIrATarjetas()
                            }}
                            className="text-xs underline min-h-11 md:min-h-0"
                            style={{ color: "var(--color-foreground)" }}
                        >
                            Ir a Tarjetas
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {!cuentaElegida && (
                            <Select
                                id="moneda"
                                label="Moneda"
                                value={formulario.moneda}
                                onChange={function (e) {
                                    cambiarMoneda(e.target.value)
                                }}
                            >
                                {MONEDAS.map(function (mon) {
                                    return (
                                        <option key={mon} value={mon}>
                                            {mon}
                                        </option>
                                    )
                                })}
                            </Select>
                        )}

                        <MontoInput
                            id="monto"
                            label={`Monto (${formulario.moneda})`}
                            moneda={formulario.moneda}
                            value={formulario.monto}
                            onChange={function (valor) {
                                setFormulario({ ...formulario, monto: valor })
                            }}
                            required
                        />
                    </div>

                    <Input
                        id="fecha"
                        label="Fecha"
                        type="date"
                        value={formulario.fecha}
                        onChange={function (e) {
                            setFormulario({ ...formulario, fecha: e.target.value })
                        }}
                        required
                    />

                    <Input
                        id="descripcion"
                        label="Descripción (opcional)"
                        value={formulario.descripcion}
                        onChange={function (e) {
                            setFormulario({ ...formulario, descripcion: e.target.value })
                        }}
                    />

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={function () {
                                setModalAbierto(false)
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1">
                            Guardar
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
