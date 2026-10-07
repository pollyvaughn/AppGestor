import { useEffect, useState } from "react"
import {
    listarCuentas,
    crearCuenta,
    editarCuenta,
    eliminarCuenta,
} from "../services/cuentaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import { formatearMonto } from "../lib/moneda"

type TipoCuenta =
    | "EFECTIVO"
    | "BILLETERA"
    | "CUENTA_BANCARIA"
    | "TARJETA_CREDITO"

type Cuenta = {
    id: number
    tipo: TipoCuenta
    nombre: string
    moneda: string
    saldo: number
}

type Formulario = {
    tipo: TipoCuenta
    nombre: string
    moneda: string
    saldo: string
}

const ETIQUETAS: Record<TipoCuenta, string> = {
    EFECTIVO: "Efectivo",
    BILLETERA: "Billetera",
    CUENTA_BANCARIA: "Cuenta bancaria",
    TARJETA_CREDITO: "Tarjeta de crédito",
}

const TIPOS_CREABLES: TipoCuenta[] = [
    "EFECTIVO",
    "BILLETERA",
    "CUENTA_BANCARIA",
]

const MONEDAS = ["PYG", "USD", "EUR", "ARS", "BRL"]

const formularioInicial: Formulario = {
    tipo: "EFECTIVO",
    nombre: "",
    moneda: "PYG",
    saldo: "0",
}

const estiloEtiqueta: React.CSSProperties = {
    color: "var(--color-muted-foreground)",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
}

const estiloSelect: React.CSSProperties = {
    background: "var(--color-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
}

export default function CuentasPage() {
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<number | null>(null)
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial)
    const [error, setError] = useState("")
    const [mensaje, setMensaje] = useState("")

    async function cargar() {
        try {
            const datos = await listarCuentas()
            setCuentas(datos)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar las cuentas."
            )
        }
    }

    useEffect(function () {
        cargar()
    }, [])

    function abrirNuevo() {
        setEditando(null)
        setFormulario(formularioInicial)
        setError("")
        setModalAbierto(true)
    }

    function abrirEdicion(cuenta: Cuenta) {
        setEditando(cuenta.id)
        setFormulario({
            tipo: cuenta.tipo,
            nombre: cuenta.nombre,
            moneda: cuenta.moneda,
            saldo: String(Number(cuenta.saldo)),
        })
        setError("")
        setModalAbierto(true)
    }

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")
        setMensaje("")

        const datos = {
            tipo: formulario.tipo,
            nombre: formulario.nombre,
            moneda: formulario.moneda,
            saldo: Number(formulario.saldo || 0),
        }

        try {
            if (editando === null) {
                await crearCuenta(datos)
                setMensaje("Cuenta creada")
            } else {
                await editarCuenta(editando, datos)
                setMensaje("Cuenta actualizada")
            }

            setModalAbierto(false)
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo guardar la cuenta"
            )
        }
    }

    async function eliminar(cuenta: Cuenta) {
        const confirmar = window.confirm(
            `¿Desactivar "${cuenta.nombre}"?`
        )

        if (!confirmar) {
            return
        }

        setError("")
        setMensaje("")

        try {
            await eliminarCuenta(cuenta.id)
            setMensaje("Cuenta desactivada")
            await cargar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo desactivar la cuenta"
            )
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-medium">Cuentas</h1>

                <Button type="button" onClick={abrirNuevo}>
                    + Nueva cuenta
                </Button>
            </div>

            {error && !modalAbierto && (
                <p className="text-sm" style={{ color: "var(--color-expense)" }}>
                    {error}
                </p>
            )}

            {mensaje && (
                <p className="text-sm" style={{ color: "var(--color-income)" }}>
                    {mensaje}
                </p>
            )}

            {cuentas.length === 0 && (
                <p
                    className="text-sm"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    No tenés cuentas.
                </p>
            )}

            <div
                className="grid gap-4"
                style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                }}
            >
                {cuentas.map(function (cuenta) {
                    const esTarjeta = cuenta.tipo === "TARJETA_CREDITO"
                    const saldo = Number(cuenta.saldo)

                    return (
                        <div
                            key={cuenta.id}
                            className="p-5 flex flex-col gap-3"
                            style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                            }}
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {cuenta.nombre}
                                </p>

                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                    }}
                                >
                                    {ETIQUETAS[cuenta.tipo]} · {cuenta.moneda}
                                </p>
                            </div>

                            {esTarjeta ? (
                                <p
                                    className="text-xs"
                                    style={{
                                        color: "var(--color-muted-foreground)",
                                    }}
                                >
                                    Se administra en la pestaña Tarjetas.
                                </p>
                            ) : (
                                <>
                                    <p
                                        className="text-2xl font-light"
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            color:
                                                saldo >= 0
                                                    ? "var(--color-income)"
                                                    : "var(--color-expense)",
                                        }}
                                    >
                                        {formatearMonto(saldo, cuenta.moneda)}{" "}
                                        <span className="text-sm">
                                            {cuenta.moneda}
                                        </span>
                                    </p>

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="!py-1 !text-xs"
                                            onClick={function () {
                                                abrirEdicion(cuenta)
                                            }}
                                        >
                                            Editar
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="!py-1 !text-xs"
                                            onClick={function () {
                                                eliminar(cuenta)
                                            }}
                                        >
                                            Desactivar
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>

            <Modal
                open={modalAbierto}
                title={
                    editando === null
                        ? "Nueva cuenta"
                        : "Editar cuenta"
                }
                onClose={function () {
                    setModalAbierto(false)
                }}
            >
                <form onSubmit={guardar} className="space-y-4">
                    <div>
                        <label
                            htmlFor="tipo"
                            className="block text-xs mb-1.5"
                            style={estiloEtiqueta}
                        >
                            Tipo
                        </label>

                        <select
                            id="tipo"
                            value={formulario.tipo}
                            onChange={function (e) {
                                setFormulario({
                                    ...formulario,
                                    tipo: e.target.value as TipoCuenta,
                                })
                            }}
                            className="w-full px-2.5 py-2 text-sm"
                            style={estiloSelect}
                        >
                            {TIPOS_CREABLES.map(function (tipo) {
                                return (
                                    <option key={tipo} value={tipo}>
                                        {ETIQUETAS[tipo]}
                                    </option>
                                )
                            })}
                        </select>
                    </div>

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
                        placeholder="Ej. Cuenta Itaú"
                        required
                        autoFocus
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                htmlFor="moneda"
                                className="block text-xs mb-1.5"
                                style={estiloEtiqueta}
                            >
                                Moneda
                            </label>

                            <select
                                id="moneda"
                                value={formulario.moneda}
                                onChange={function (e) {
                                    const moneda = e.target.value

                                    setFormulario({
                                        ...formulario,
                                        moneda: moneda,
                                        saldo:
                                            moneda === "PYG"
                                                ? String(Math.trunc(Number(formulario.saldo || 0)))
                                                : formulario.saldo,
                                    })
                                }}
                                className="w-full px-2.5 py-2 text-sm"
                                style={estiloSelect}
                            >
                                {MONEDAS.map(function (moneda) {
                                    return (
                                        <option key={moneda} value={moneda}>
                                            {moneda}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>

                        <MontoInput
                            id="saldo"
                            label="Saldo"
                            moneda={formulario.moneda}
                            value={formulario.saldo}
                            onChange={function (valor) {
                                setFormulario({ ...formulario, saldo: valor })
                            }}
                        />
                    </div>

                    {error && (
                        <p
                            className="text-sm"
                            style={{ color: "var(--color-expense)" }}
                        >
                            {error}
                        </p>
                    )}

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