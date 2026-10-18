import { useEffect, useState } from "react"
import {
    listarRecurrentes,
    crearRecurrente,
    editarRecurrente,
    eliminarRecurrente,
    generarMovimiento,
} from "../services/recurrenteService"
import { listarCategorias } from "../services/categoriaService"
import { listarCuentas } from "../services/cuentaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import { avisoSaldo } from "../lib/saldo"
import CategoriaRapida from "../components/ui/CategoriaRapida"

type Tipo = "INGRESO" | "EGRESO"

type Filtro = "TODOS" | Tipo

type Recurrente = {
    id: number
    categoria_id: number
    categoria: string
    metodo_pago_id: number | null
    metodo_pago: string | null
    nombre: string
    tipo: Tipo
    monto_base: number
    moneda: string
    frecuencia: string
    proxima_fecha: string | null
}

type Categoria = { id: number; nombre: string; tipo: Tipo }

type Cuenta = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    saldo: number
}

type Formulario = {
    nombre: string
    tipo: Tipo
    categoriaId: string
    cuentaId: string
    moneda: string
    monto: string
    frecuencia: string
    proximaFecha: string
}

const MONEDAS = ["PYG", "USD", "EUR", "ARS", "BRL"]

type RecurrentesPageProps = {
    onIrACategorias: () => void
}

const FILTROS: { key: Filtro; label: string }[] = [
    { key: "TODOS", label: "Todos" },
    { key: "INGRESO", label: "Ingresos" },
    { key: "EGRESO", label: "Gastos" },
]

const FRECUENCIAS: { key: string; label: string }[] = [
    { key: "DIARIA", label: "Diaria" },
    { key: "SEMANAL", label: "Semanal" },
    { key: "QUINCENAL", label: "Quincenal" },
    { key: "MENSUAL", label: "Mensual" },
    { key: "BIMESTRAL", label: "Bimestral" },
    { key: "TRIMESTRAL", label: "Trimestral" },
    { key: "SEMESTRAL", label: "Semestral" },
    { key: "ANUAL", label: "Anual" },
]

function etiquetaFrecuencia(clave: string) {
    const frecuencia = FRECUENCIAS.find(function (f) {
        return f.key === clave
    })

    return frecuencia ? frecuencia.label : clave
}

function fechaHoy() {
    const h = new Date()
    const mes = String(h.getMonth() + 1).padStart(2, "0")
    const dia = String(h.getDate()).padStart(2, "0")
    return `${h.getFullYear()}-${mes}-${dia}`
}

// "2026-11-10" => "10/11/2026"
function fechaCorta(fecha: string) {
    const f = fecha.slice(0, 10)
    return `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`
}

function formularioVacio(): Formulario {
    return {
        nombre: "",
        tipo: "EGRESO",
        categoriaId: "",
        cuentaId: "",
        moneda: "PYG",
        monto: "",
        frecuencia: "MENSUAL",
        proximaFecha: fechaHoy(),
    }
}

export default function RecurrentesPage({
    onIrACategorias,
}: RecurrentesPageProps) {
    const [recurrentes, setRecurrentes] = useState<Recurrente[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [filtro, setFiltro] = useState<Filtro>("TODOS")
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    // crear / editar
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio())

    // generar movimiento
    const [generando, setGenerando] = useState<Recurrente | null>(null)
    const [montoGenerar, setMontoGenerar] = useState("")
    const [cuentaGenerar, setCuentaGenerar] = useState("")

    const [errorModal, setErrorModal] = useState("")

    // ---------- Carga de datos ----------

    async function cargar() {
        try {
            const [recs, cats, ctas] = await Promise.all([
                listarRecurrentes(),
                listarCategorias(),
                listarCuentas(),
            ])
            setRecurrentes(recs)
            setCategorias(cats)
            setCuentas(ctas)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los recurrentes"
            )
        } finally {
            setCargando(false)
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    // ---------- Formulario: crear y editar ----------

    function abrirNuevo() {
        setEditando(null)
        setFormulario(formularioVacio())
        setErrorModal("")
        setModalAbierto(true)
    }

    function abrirEdicion(r: Recurrente) {
        setEditando(r.id)
        setFormulario({
            nombre: r.nombre,
            tipo: r.tipo,
            categoriaId: String(r.categoria_id),
            cuentaId: r.metodo_pago_id ? String(r.metodo_pago_id) : "",
            moneda: r.moneda,
            monto: String(Number(r.monto_base)),
            frecuencia: r.frecuencia,
            proximaFecha: r.proxima_fecha ? r.proxima_fecha.slice(0, 10) : "",
        })
        setErrorModal("")
        setModalAbierto(true)
    }

    function cambiarTipo(tipo: Tipo) {
        const cuentaActual = cuentas.find(function (c) {
            return String(c.id) === formulario.cuentaId
        })

        // la tarjeta de crédito solo sirve para gastos
        const sacarCuenta =
            tipo === "INGRESO" &&
            cuentaActual !== undefined &&
            cuentaActual.tipo === "TARJETA_CREDITO"

        setFormulario({
            ...formulario,
            tipo: tipo,
            categoriaId: "", // la categoría anterior ya no sirve
            cuentaId: sacarCuenta ? "" : formulario.cuentaId,
        })
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

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setErrorModal("")
        setError("")
        setMensaje("")

        if (Number(formulario.monto) <= 0) {
            setErrorModal("El monto debe ser mayor a 0")
            return
        }

        const datos = {
            categoria_id: Number(formulario.categoriaId),
            metodo_pago_id: Number(formulario.cuentaId) || null,
            nombre: formulario.nombre,
            tipo: formulario.tipo,
            monto_base: Number(formulario.monto),
            moneda: formulario.moneda,
            frecuencia: formulario.frecuencia,
            proxima_fecha: formulario.proximaFecha || null,
        }

        try {
            if (editando === null) {
                await crearRecurrente(datos)
                setMensaje("Recurrente creado")
            } else {
                await editarRecurrente(editando, datos)
                setMensaje("Recurrente actualizado")
            }

            setModalAbierto(false)
            await cargar()
        } catch (e) {
            setErrorModal(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar el recurrente"
            )
        }
    }

    // ---------- Desactivar ----------

    async function desactivar(r: Recurrente) {
        const confirmar = window.confirm(`¿Desactivar "${r.nombre}"?`)

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarRecurrente(r.id)
            setMensaje("Recurrente desactivado")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo desactivar el recurrente"
            )
        }
    }

    // ---------- Generar movimiento ----------

    function puedeGenerar(r: Recurrente) {
        return r.proxima_fecha !== null && r.proxima_fecha.slice(0, 10) <= fechaHoy()
    }

    function abrirGenerar(r: Recurrente) {
        setGenerando(r)
        setMontoGenerar(String(Number(r.monto_base)))
        setCuentaGenerar(
            r.metodo_pago_id === null ? "" : String(r.metodo_pago_id)
        )
        setErrorModal("")
    }

    async function confirmarGenerar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()

        if (generando === null) {
            return
        }

        setErrorModal("")
        setError("")
        setMensaje("")

        const monto = Number(montoGenerar)

        if (monto <= 0) {
            setErrorModal("El monto debe ser mayor a 0")
            return
        }

        const metodoPagoId = cuentaGenerar ? Number(cuentaGenerar) : undefined
        const cuenta = cuentas.find(function (c) {
            return c.id === metodoPagoId
        })

        if (
            generando.tipo === "EGRESO" &&
            cuenta &&
            cuenta.tipo !== "TARJETA_CREDITO"
        ) {
            const aviso = avisoSaldo(
                cuenta.nombre,
                Number(cuenta.saldo),
                monto,
                cuenta.moneda
            )

            if (aviso && !window.confirm(aviso)) {
                return
            }
        }

        try {
            const resultado = await generarMovimiento(
                generando.id,
                monto,
                metodoPagoId
            )

            setMensaje(
                `Movimiento generado. Próxima fecha: ${fechaCorta(resultado.proxima_fecha)}`
            )
            setGenerando(null)
            await cargar()
        } catch (e) {
            setErrorModal(
                e instanceof Error
                    ? e.message
                    : "No se pudo generar el movimiento"
            )
        }
    }

    async function categoriaCreada(id: number) {
        try {
            setCategorias(await listarCategorias())
            setFormulario(function (anterior) {
                return { ...anterior, categoriaId: String(id) }
            })
        } catch (e) {
            setErrorModal(
                e instanceof Error
                    ? e.message
                    : "No se pudieron recargar las categorías"
            )
        }
    }

    // ---------- Datos calculados ----------

    const visibles = recurrentes.filter(function (r) {
        return filtro === "TODOS" || r.tipo === filtro
    })

    const categoriasDelTipo = categorias.filter(function (c) {
        return c.tipo === formulario.tipo
    })

    const cuentasUsables = cuentas.filter(function (c) {
        return !(formulario.tipo === "INGRESO" && c.tipo === "TARJETA_CREDITO")
    })

    const cuentaElegida = formulario.cuentaId !== ""
    const cuentasParaGenerar = generando
        ? cuentas.filter(function (cuenta) {
              return (
                  cuenta.moneda === generando.moneda &&
                  !(
                      generando.tipo === "INGRESO" &&
                      cuenta.tipo === "TARJETA_CREDITO"
                  )
              )
          })
        : []

    // ---------- Pantalla ----------

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-medium">Recurrentes</h1>

                <Button type="button" onClick={abrirNuevo}>
                    + Nuevo recurrente
                </Button>
            </div>

            <div
                role="group"
                aria-label="Filtrar recurrentes por tipo"
                className="flex flex-wrap gap-2"
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

            {error && <Mensaje tipo="error">{error}</Mensaje>}
            {mensaje && <Mensaje tipo="exito">{mensaje}</Mensaje>}
            {cargando && <Cargando />}

            {!cargando && visibles.length === 0 && (
                <EstadoVacio
                    texto={
                        recurrentes.length === 0
                            ? "No tenés recurrentes registrados."
                            : "No hay recurrentes de este tipo."
                    }
                />
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {visibles.map(function (r) {
                    const esIngreso = r.tipo === "INGRESO"
                    const generable = puedeGenerar(r)

                    return (
                        <div
                            key={r.id}
                            className="p-5 flex flex-col gap-3"
                            style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium break-words">
                                    {r.nombre}
                                </p>

                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                    }}
                                >
                                    {r.categoria} ·{" "}
                                    {etiquetaFrecuencia(r.frecuencia)} ·{" "}
                                    {r.metodo_pago ?? "Sin cuenta"}
                                </p>
                            </div>

                            <p
                                className="text-2xl font-light break-words"
                                style={{
                                    fontFamily: "var(--font-mono)",
                                    color: esIngreso
                                        ? "var(--color-income)"
                                        : "var(--color-expense)",
                                }}
                            >
                                {esIngreso ? "+" : "−"}
                                {formatearMonto(r.monto_base, r.moneda)}{" "}
                                <span className="text-sm">{r.moneda}</span>
                            </p>

                            <p
                                className="text-xs"
                                style={{
                                    color: generable
                                        ? "var(--color-expense)"
                                        : "var(--color-muted-foreground)",
                                }}
                            >
                                {r.proxima_fecha === null
                                    ? "Sin próxima fecha"
                                    : generable
                                      ? `Para generar desde el ${fechaCorta(r.proxima_fecha)}`
                                      : `Próxima fecha: ${fechaCorta(r.proxima_fecha)}`}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    className="!py-1 !text-xs"
                                    disabled={!generable}
                                    aria-label={`Generar movimiento de ${r.nombre}`}
                                    onClick={function () {
                                        abrirGenerar(r)
                                    }}
                                >
                                    Generar movimiento
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    aria-label={`Editar ${r.nombre}`}
                                    onClick={function () {
                                        abrirEdicion(r)
                                    }}
                                >
                                    Editar
                                </Button>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="!py-1 !text-xs"
                                    aria-label={`Desactivar ${r.nombre}`}
                                    onClick={function () {
                                        desactivar(r)
                                    }}
                                >
                                    Desactivar
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal: crear / editar */}
            <Modal
                open={modalAbierto}
                title={
                    editando === null ? "Nuevo recurrente" : "Editar recurrente"
                }
                onClose={function () {
                    setModalAbierto(false)
                }}
            >
                <form onSubmit={guardar} className="space-y-4">
                    <Input
                        id="nombre"
                        label="Nombre"
                        value={formulario.nombre}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                nombre: e.target.value,
                            })
                        }}
                        placeholder="Ej. Alquiler"
                        required
                        autoFocus
                    />

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
                            setFormulario({
                                ...formulario,
                                categoriaId: e.target.value,
                            })
                        }}
                        required
                    >
                        <option value="">Elegí una categoría</option>
                        {categoriasDelTipo.map(function (c) {
                            return (
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            )
                        })}
                    </Select>
                    <div className="flex justify-end">
                        <CategoriaRapida
                            tipo={formulario.tipo}
                            onCreada={categoriaCreada}
                        />
                    </div>

                    <Select
                        id="cuenta"
                        label="Cuenta"
                        value={formulario.cuentaId}
                        onChange={function (e) {
                            cambiarCuenta(e.target.value)
                        }}
                        required
                    >
                        <option value="">Elegí una cuenta</option>
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
                            label={`Monto base (${formulario.moneda})`}
                            moneda={formulario.moneda}
                            value={formulario.monto}
                            onChange={function (valor) {
                                setFormulario({ ...formulario, monto: valor })
                            }}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            id="frecuencia"
                            label="Frecuencia"
                            value={formulario.frecuencia}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    frecuencia: e.target.value,
                                })
                            }}
                        >
                            {FRECUENCIAS.map(function (f) {
                                return (
                                    <option key={f.key} value={f.key}>
                                        {f.label}
                                    </option>
                                )
                            })}
                        </Select>

                        <Input
                            id="proxima-fecha"
                            label="Próxima fecha"
                            type="date"
                            value={formulario.proximaFecha}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    proximaFecha: e.target.value,
                                })
                            }}
                        />
                    </div>

                    {errorModal && <Mensaje tipo="error">{errorModal}</Mensaje>}

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

            {/* Modal: generar movimiento */}
            <Modal
                open={generando !== null}
                title="Generar movimiento"
                onClose={function () {
                    setGenerando(null)
                }}
            >
                {generando && (
                    <form onSubmit={confirmarGenerar} className="space-y-4">
                        <p className="text-sm">
                            {generando.nombre}
                            <span
                                className="block text-xs"
                                style={{
                                    color: "var(--color-muted-foreground)",
                                }}
                            >
                                Período{" "}
                                {generando.proxima_fecha
                                    ? fechaCorta(generando.proxima_fecha)
                                    : ""}
                            </span>
                        </p>

                        <MontoInput
                            id="monto-generar"
                            label={`Monto de este período (${generando.moneda})`}
                            moneda={generando.moneda}
                            value={montoGenerar}
                            onChange={setMontoGenerar}
                            required
                        />

                        <Select
                            id="cuenta-generar"
                            label="Cuenta de este período"
                            value={cuentaGenerar}
                            onChange={function (e) {
                                setCuentaGenerar(e.target.value)
                            }}
                            required
                        >
                            <option value="">Elegí una cuenta</option>
                            {cuentasParaGenerar.map(function (cuenta) {
                                return (
                                    <option key={cuenta.id} value={cuenta.id}>
                                        {cuenta.nombre} ({cuenta.tipo})
                                    </option>
                                )
                            })}
                        </Select>

                        <p
                            className="text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                        >
                            La cuenta y el monto elegidos solo se aplican a
                            este período; no cambian el recurrente.
                        </p>

                        {errorModal && (
                            <Mensaje tipo="error">{errorModal}</Mensaje>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={function () {
                                    setGenerando(null)
                                }}
                            >
                                Cancelar
                            </Button>

                            <Button type="submit" className="flex-1">
                                Generar
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    )
}