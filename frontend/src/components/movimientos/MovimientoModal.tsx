// =========================================================
// Modal para crear o editar un ingreso / egreso
//
// Cambios del punto 7:
// - La fecha no puede ser futura (max en el input + validación al guardar),
//   igual que en los demás modales y que el backend.
// - Se saca el select de Moneda: la moneda siempre es la de la cuenta elegida.
//   Antes aparecía antes de elegir cuenta y después se pisaba.
// - Al cambiar de cuenta, el monto se ajusta a la moneda nueva
//   (si pasa a guaraníes se cortan los decimales).
// - El aviso "Nueva compra con tarjeta" solo aparece al crear un egreso;
//   al editar no tiene sentido (cerraba la edición y abría otra cosa).
// =========================================================

import { useEffect, useState } from "react"
import {
    crearMovimiento,
    editarMovimiento,
} from "../../services/movimientoService"
import { listarCategorias } from "../../services/categoriaService"
import { listarCuentas } from "../../services/cuentaService"
import type { Movimiento } from "../../lib/movimientos"
import { fechaHoy } from "../../lib/fechas"
import { ajustarMontoAMoneda } from "../../lib/moneda"
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
    // abre el formulario de nueva compra con tarjeta
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

        // la moneda del movimiento es la de la cuenta elegida
        const moneda = cuenta ? cuenta.moneda : formulario.moneda

        setFormulario({
            ...formulario,
            cuentaId: cuentaId,
            moneda: moneda,
            // si la cuenta nueva no admite decimales (PYG) se cortan
            monto: ajustarMontoAMoneda(formulario.monto, moneda),
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

        if (!formulario.fecha || formulario.fecha > fechaHoy()) {
            setError("Elegí una fecha válida (no puede ser futura)")
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

    // el aviso de tarjeta solo tiene sentido al crear un egreso
    const mostrarAvisoTarjeta =
        movimiento === null && formulario.tipo === "EGRESO"

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

                    {mostrarAvisoTarjeta && (
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
                                ¿Fue con tarjeta de crédito? Esas compras se
                                registran aparte, porque generan cuotas.
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
                                Nueva compra con tarjeta
                            </button>
                        </div>
                    )}

                    {/* La moneda es la de la cuenta: se muestra en la etiqueta */}
                    <MontoInput
                        id="monto"
                        label={
                            cuentaElegida
                                ? `Monto (${formulario.moneda})`
                                : "Monto"
                        }
                        moneda={formulario.moneda}
                        value={formulario.monto}
                        onChange={function (valor) {
                            setFormulario({ ...formulario, monto: valor })
                        }}
                        required
                    />

                    <Input
                        id="fecha"
                        label="Fecha"
                        type="date"
                        max={fechaHoy()}
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