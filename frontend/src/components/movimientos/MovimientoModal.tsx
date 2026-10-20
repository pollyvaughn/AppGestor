import { useEffect, useState } from "react"
import {
    crearMovimiento,
    editarMovimiento,
} from "../../services/movimientoService"
import { listarCategorias } from "../../services/categoriaService"
import { listarCuentas } from "../../services/cuentaService"
import type { Movimiento } from "../../lib/movimientos"
import { fechaHoy } from "../../lib/fechas"
import { avisoSaldo } from "../../lib/saldo"
import Button from "../ui/Button"
import Input from "../ui/Input"
import Select from "../ui/Select"
import MontoInput from "../ui/MontoInput"
import Modal from "../ui/Modal"
import Cargando from "../ui/Cargando"
import Mensaje from "../ui/Mensaje"
import CategoriaRapida from "../ui/CategoriaRapida"

type Tipo = "INGRESO" | "EGRESO"

type Categoria = { id: number; nombre: string; tipo: Tipo }

type Cuenta = {
    id: number
    nombre: string
    tipo: string
    moneda: string
    saldo: number
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

type MovimientoModalProps = {
    open: boolean
    // null = movimiento nuevo; con valor = editar
    movimiento: Movimiento | null
    onClose: () => void
    onGuardado: (mensaje: string) => void
    onIrATarjetas: () => void
}

export default function MovimientoModal({
    open,
    movimiento,
    onClose,
    onGuardado,
    onIrATarjetas,
}: MovimientoModalProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio())
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)

    // al abrirse, carga categorías y cuentas y arma el formulario
    useEffect(
        function () {
            if (!open) {
                return
            }

            let activo = true

            setError("")
            setGuardando(false)
            setCargando(true)

            Promise.all([listarCategorias(), listarCuentas()])
                .then(function ([cats, ctas]) {
                    if (!activo) {
                        return
                    }

                    setCategorias(cats)
                    setCuentas(ctas)

                    if (movimiento !== null) {
                        setFormulario({
                            tipo: movimiento.tipo as Tipo,
                            categoriaId: movimiento.categoria_id
                                ? String(movimiento.categoria_id)
                                : "",
                            cuentaId: movimiento.metodo_pago_id
                                ? String(movimiento.metodo_pago_id)
                                : "",
                            moneda: movimiento.moneda,
                            monto: String(Number(movimiento.monto)),
                            fecha: movimiento.fecha.slice(0, 10),
                            descripcion: movimiento.descripcion ?? "",
                        })
                        return
                    }

                    const base = formularioVacio()
                    const propias = (ctas as Cuenta[]).filter(function (c) {
                        return c.tipo !== "TARJETA_CREDITO"
                    })

                    // con una sola cuenta no hace falta elegir
                    if (propias.length === 1) {
                        base.cuentaId = String(propias[0].id)
                        base.moneda = propias[0].moneda
                    }

                    setFormulario(base)
                })
                .catch(function (e) {
                    if (activo) {
                        setError(
                            e instanceof Error
                                ? e.message
                                : "No se pudieron cargar los datos"
                        )
                    }
                })
                .finally(function () {
                    if (activo) {
                        setCargando(false)
                    }
                })

            return function () {
                activo = false
            }
        },
        [open, movimiento]
    )

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

    // la categoría recién creada queda elegida
    async function categoriaCreada(id: number) {
        try {
            setCategorias(await listarCategorias())
            setFormulario(function (anterior) {
                return { ...anterior, categoriaId: String(id) }
            })
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron recargar las categorías"
            )
        }
    }

    // ---------- Guardar ----------

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (Number(formulario.monto) <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        if (formulario.tipo === "EGRESO") {
            const cuenta = cuentas.find(function (c) {
                return String(c.id) === formulario.cuentaId
            })

            if (cuenta) {
                let disponible = Number(cuenta.saldo)

                // al editar, el egreso original ya descontó de esta cuenta
                if (
                    movimiento !== null &&
                    movimiento.tipo === "EGRESO" &&
                    movimiento.metodo_pago_id === cuenta.id
                ) {
                    disponible += Number(movimiento.monto)
                }

                const aviso = avisoSaldo(
                    cuenta.nombre,
                    disponible,
                    Number(formulario.monto),
                    cuenta.moneda
                )

                if (aviso && !window.confirm(aviso)) {
                    return
                }
            }
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

        setGuardando(true)

        try {
            if (movimiento === null) {
                await crearMovimiento(datos)
                onGuardado("Movimiento creado")
            } else {
                await editarMovimiento(movimiento.id, datos)
                onGuardado("Movimiento actualizado")
            }

            onClose()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar el movimiento"
            )
        } finally {
            setGuardando(false)
        }
    }

    // ---------- Datos calculados ----------

    const categoriasDelTipo = categorias.filter(function (c) {
        return c.tipo === formulario.tipo
    })

    const cuentasUsables = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO"
    })

    const cuentaElegida = formulario.cuentaId !== ""

    // ---------- Pantalla ----------

    return (
        <Modal
            open={open}
            title={movimiento === null ? "Nuevo movimiento" : "Editar movimiento"}
            onClose={onClose}
        >
            {cargando ? (
                <Cargando />
            ) : (
                <form onSubmit={guardar} autoComplete="off" className="space-y-4">
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
                            Las compras con tarjeta se registran en la pestaña
                            Tarjetas, donde se crean sus cuotas.
                        </p>
                        <button
                            type="button"
                            onClick={function () {
                                onClose()
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
                            setFormulario({
                                ...formulario,
                                fecha: e.target.value,
                            })
                        }}
                        required
                    />

                    <Input
                        id="descripcion"
                        label="Descripción (opcional)"
                        value={formulario.descripcion}
                        onChange={function (e) {
                            setFormulario({
                                ...formulario,
                                descripcion: e.target.value,
                            })
                        }}
                    />

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <div className="flex gap-2 pt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={guardando}
                        >
                            Guardar
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}