import { useEffect, useState } from "react"
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
    esContable,
    mesActual,
    mesDe,
    moverMes,
    nombreMes,
    totalesPorMoneda,
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

type Tipo = "INGRESO" | "EGRESO"

type Filtro = "TODOS" | Tipo

type Categoria = { id: number; nombre: string; tipo: Tipo }

type Cuenta = { id: number; nombre: string; tipo: string; moneda: string }

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

function fechaHoy() {
    const h = new Date()
    const mes = String(h.getMonth() + 1).padStart(2, "0")
    const dia = String(h.getDate()).padStart(2, "0")
    return `${h.getFullYear()}-${mes}-${dia}`
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

export default function MensualPage() {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [mes, setMes] = useState(mesActual())
    const [filtro, setFiltro] = useState<Filtro>("TODOS")
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio())

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

    const delMes = movimientos.filter(function (m) {
        return mesDe(m) === mes && m.estado !== "ANULADO"
    })

    // los totales siempre cuentan todo el mes, sin importar el filtro
    const totales = totalesPorMoneda(delMes)

    const visibles = delMes.filter(function (m) {
        return filtro === "TODOS" || m.tipo === filtro
    })

    const categoriasDelTipo = categorias.filter(function (c) {
        return c.tipo === formulario.tipo
    })

    const cuentasUsables = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO"
    })

    const cuentaElegida = formulario.cuentaId !== ""

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Mensual</h1>

                <Button type="button" onClick={abrirNuevo}>
                    + Nuevo movimiento
                </Button>
            </div>

            {/* Selector de mes */}
            <div className="flex items-end justify-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    aria-label="Mes anterior"
                    onClick={function () {
                        setMes(moverMes(mes, -1))
                    }}
                >
                    ‹
                </Button>

                <div className="w-44">
                    <Input
                        type="month"
                        aria-label={`Mes: ${nombreMes(mes)}`}
                        value={mes}
                        onChange={function (e) {
                            if (e.target.value) {
                                setMes(e.target.value)
                            }
                        }}
                    />
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    aria-label="Mes siguiente"
                    onClick={function () {
                        setMes(moverMes(mes, 1))
                    }}
                >
                    ›
                </Button>
            </div>

            {error && !modalAbierto && <Mensaje tipo="error">{error}</Mensaje>}
            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && (
                <>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {Object.entries(totales).map(function ([moneda, t]) {
                            return (
                                <div
                                    key={moneda}
                                    className="p-5 space-y-1"
                                    style={{
                                        background: "var(--color-card)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-lg)",
                                    }}
                                >
                                    <p
                                        className="text-xs"
                                        style={{ color: "var(--color-muted-foreground)" }}
                                    >
                                        Balance {moneda}
                                    </p>
                                    <p
                                        className="text-2xl font-light break-words"
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {formatearMonto(t.ingresos - t.egresos, moneda)}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--color-income)" }}>
                                        Ingresos {formatearMonto(t.ingresos, moneda)}
                                    </p>
                                    <p className="text-xs" style={{ color: "var(--color-expense)" }}>
                                        Gastos {formatearMonto(t.egresos, moneda)}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    <section
                        className="p-4 sm:p-6"
                        style={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-lg)",
                        }}
                    >
                        {/* Filtro por tipo */}
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

                        {visibles.length === 0 && (
                            <EstadoVacio
                                texto={
                                    delMes.length === 0
                                        ? "Sin movimientos este mes."
                                        : "No hay movimientos de este tipo."
                                }
                            />
                        )}

                        {visibles.map(function (m) {
                            const signo =
                                m.tipo === "INGRESO"
                                    ? "+"
                                    : m.tipo === "EGRESO"
                                      ? "−"
                                      : ""

                            const etiquetaTipo = ETIQUETA_TIPO[m.tipo]

                            return (
                                <div
                                    key={m.id}
                                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                                    style={{ borderBottom: "1px solid var(--color-border)" }}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm truncate">
                                            {m.descripcion || m.categoria || etiquetaTipo || m.tipo}
                                        </p>
                                        <p
                                            className="text-xs"
                                            style={{ color: "var(--color-muted-foreground)" }}
                                        >
                                            {m.fecha.slice(0, 10)}
                                            {etiquetaTipo ? ` · ${etiquetaTipo}` : ""} ·{" "}
                                            {m.categoria ?? "—"} · {m.metodo_pago ?? "—"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span
                                            className="text-sm shrink-0"
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
                                            <div className="flex gap-2 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    aria-label={`Editar ${m.descripcion || m.categoria || "movimiento"}`}
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
                                                    aria-label={`Anular ${m.descripcion || m.categoria || "movimiento"}`}
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
                                </div>
                            )
                        })}
                    </section>
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
