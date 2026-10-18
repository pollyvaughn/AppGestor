import { useEffect, useState } from "react"
import {
    listarAjustes,
    crearAjuste,
    anularAjuste,
    type TipoAjuste,
} from "../services/ajusteService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import Modal from "../components/ui/Modal"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Cargando from "../components/ui/Cargando"
import EstadoVacio from "../components/ui/EstadoVacio"
import Mensaje from "../components/ui/Mensaje"
import { formatearMonto } from "../lib/moneda"
import { type Ajuste, type Cuota, fechaCorta } from "../lib/tarjetas"

type AjustesCuotaModalProps = {
    cuota: Cuota | null
    moneda: string
    onClose: () => void
    // para que la pantalla de compras recargue las cuotas
    onCambio: () => void
}

const TIPOS: { key: TipoAjuste; label: string }[] = [
    { key: "RECARGO", label: "Recargo" },
    { key: "INTERES", label: "Interés" },
    { key: "COMISION", label: "Comisión" },
    { key: "ADICIONAL", label: "Adicional" },
    { key: "DESCUENTO", label: "Descuento" },
]

function etiquetaTipo(clave: string) {
    const tipo = TIPOS.find(function (t) {
        return t.key === clave
    })

    return tipo ? tipo.label : clave
}

export default function AjustesCuotaModal({
    cuota,
    moneda,
    onClose,
    onCambio,
}: AjustesCuotaModalProps) {
    const [ajustes, setAjustes] = useState<Ajuste[]>([])
    const [cargando, setCargando] = useState(true)
    const [tipo, setTipo] = useState<TipoAjuste>("RECARGO")
    const [monto, setMonto] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [error, setError] = useState("")
    const [resumen, setResumen] = useState<{
        total: number
        pendiente: number
    } | null>(null)

    // al abrirse para otra cuota se limpia todo y se cargan sus ajustes
    useEffect(
        function () {
            if (cuota === null) {
                return
            }

            const cuotaId = cuota.id

            setTipo("RECARGO")
            setMonto("")
            setDescripcion("")
            setError("")
            setResumen(null)
            setCargando(true)

            async function cargarInicial() {
                try {
                    setAjustes(await listarAjustes(cuotaId))
                } catch (e) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "No se pudieron cargar los ajustes"
                    )
                } finally {
                    setCargando(false)
                }
            }

            cargarInicial()
        },
        [cuota]
    )

    if (cuota === null) {
        return null
    }

    const cuotaId = cuota.id
    const bloqueada = cuota.estado === "OMITIDA" || cuota.estado === "ANULADA"

    async function recargar() {
        try {
            setAjustes(await listarAjustes(cuotaId))
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudieron cargar los ajustes"
            )
        }
    }

    async function agregar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (Number(monto) <= 0) {
            setError("El monto debe ser mayor a 0")
            return
        }

        try {
            const resultado = await crearAjuste(cuotaId, {
                tipo: tipo,
                monto: Number(monto),
                descripcion: descripcion || null,
            })

            setResumen({
                total: Number(resultado.total_cuota),
                pendiente: Number(resultado.monto_pendiente),
            })
            setMonto("")
            setDescripcion("")

            await recargar()
            onCambio()
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo agregar el ajuste"
            )
        }
    }

    async function anular(ajuste: Ajuste) {
        const confirmar = window.confirm(
            `¿Anular el ${etiquetaTipo(ajuste.tipo).toLowerCase()}?`
        )

        if (!confirmar) {
            return
        }

        setError("")

        try {
            const resultado = await anularAjuste(ajuste.id)

            setResumen({
                total: Number(resultado.total_cuota),
                pendiente: Number(resultado.monto_pendiente),
            })

            await recargar()
            onCambio()
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "No se pudo anular el ajuste"
            )
        }
    }

    return (
        <Modal
            open={true}
            title={`Ajustes de la cuota ${cuota.numero}`}
            onClose={onClose}
        >
            <div className="space-y-5">
                <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    Los recargos, intereses, comisiones y adicionales suman a
                    la cuota. Los descuentos restan.
                </p>

                {resumen && (
                    <p
                        className="text-xs"
                        style={{ fontFamily: "var(--font-mono)" }}
                    >
                        Total de la cuota:{" "}
                        {formatearMonto(resumen.total, moneda)} {moneda} ·
                        Pendiente: {formatearMonto(resumen.pendiente, moneda)}{" "}
                        {moneda}
                    </p>
                )}

                {cargando && <Cargando texto="Cargando ajustes..." />}

                {!cargando && ajustes.length === 0 && (
                    <EstadoVacio texto="Esta cuota no tiene ajustes." />
                )}

                <div>
                    {ajustes.map(function (ajuste) {
                        const anulado = ajuste.estado === "ANULADO"
                        const resta = ajuste.tipo === "DESCUENTO"

                        return (
                            <div
                                key={ajuste.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                                style={{
                                    borderBottom:
                                        "1px solid var(--color-border)",
                                    opacity: anulado ? 0.5 : 1,
                                }}
                            >
                                <div className="min-w-0">
                                    <p
                                        className="text-sm"
                                        style={{
                                            textDecoration: anulado
                                                ? "line-through"
                                                : "none",
                                        }}
                                    >
                                        {etiquetaTipo(ajuste.tipo)}
                                        {anulado ? " (anulado)" : ""}
                                    </p>

                                    <p
                                        className="text-xs break-words"
                                        style={{
                                            color: "var(--color-muted-foreground)",
                                        }}
                                    >
                                        {fechaCorta(ajuste.fecha)}
                                        {ajuste.descripcion
                                            ? ` · ${ajuste.descripcion}`
                                            : ""}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className="text-sm"
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            color: resta
                                                ? "var(--color-income)"
                                                : "var(--color-expense)",
                                        }}
                                    >
                                        {resta ? "−" : "+"}
                                        {formatearMonto(ajuste.monto, moneda)}
                                    </span>

                                    {!anulado && !bloqueada && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="!py-1 !text-xs"
                                            aria-label={`Anular ${etiquetaTipo(ajuste.tipo)}`}
                                            onClick={function () {
                                                anular(ajuste)
                                            }}
                                        >
                                            Anular
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {bloqueada ? (
                    <Mensaje tipo="error">
                        No se pueden agregar ni anular ajustes en una cuota
                        omitida o anulada.
                    </Mensaje>
                ) : (
                    <form onSubmit={agregar} className="space-y-4">
                        <p
                            className="text-xs"
                            style={{
                                color: "var(--color-muted-foreground)",
                                fontFamily: "var(--font-mono)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            Nuevo ajuste
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select
                                id="tipo-ajuste"
                                label="Tipo"
                                value={tipo}
                                onChange={function (e) {
                                    setTipo(e.target.value as TipoAjuste)
                                }}
                            >
                                {TIPOS.map(function (t) {
                                    return (
                                        <option key={t.key} value={t.key}>
                                            {t.label}
                                        </option>
                                    )
                                })}
                            </Select>

                            <MontoInput
                                id="monto-ajuste"
                                label={`Monto (${moneda})`}
                                moneda={moneda}
                                value={monto}
                                onChange={setMonto}
                                required
                            />
                        </div>

                        <Input
                            id="descripcion-ajuste"
                            label="Descripción (opcional)"
                            value={descripcion}
                            onChange={function (e) {
                                setDescripcion(e.target.value)
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
                                Cerrar
                            </Button>

                            <Button type="submit" className="flex-1">
                                Agregar ajuste
                            </Button>
                        </div>
                    </form>
                )}

                {bloqueada && (
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cerrar
                    </Button>
                )}
            </div>
        </Modal>
    )
}