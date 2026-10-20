import { useState } from "react"
import { crearCuenta } from "../services/cuentaService"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import MontoInput from "../components/ui/MontoInput"
import Select from "../components/ui/Select"
import Mensaje from "../components/ui/Mensaje"

type ConfiguracionInicialPageProps = {
    onCompletar: () => void
}

const MONEDAS = ["PYG", "USD", "EUR", "ARS", "BRL"]

export default function ConfiguracionInicialPage({
    onCompletar,
}: ConfiguracionInicialPageProps) {
    const [tipo, setTipo] = useState("EFECTIVO")
    const [nombre, setNombre] = useState("Efectivo")
    const [moneda, setMoneda] = useState("PYG")
    const [saldo, setSaldo] = useState("0")
    const [error, setError] = useState("")
    const [guardando, setGuardando] = useState(false)

    async function guardar(evento: React.FormEvent<HTMLFormElement>) {
        evento.preventDefault()
        setError("")

        if (Number(saldo) < 0) {
            setError("El saldo inicial no puede ser negativo")
            return
        }

        setGuardando(true)

        try {
            await crearCuenta({
                tipo,
                nombre,
                moneda,
                saldo: Number(saldo),
            })
            onCompletar()
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "No se pudo crear la cuenta inicial"
            )
        } finally {
            setGuardando(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <section
                className="w-full max-w-lg p-6 sm:p-8 space-y-5"
                style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                }}
            >
                <div className="space-y-2">
                    <h1 className="text-xl font-medium">
                        Configurá tu cuenta inicial
                    </h1>
                    <p
                        className="text-sm"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Antes de registrar movimientos, agregá una cuenta para
                        llevar el saldo real de tu dinero disponible.
                    </p>
                </div>

                <form onSubmit={guardar} autoComplete="off" className="space-y-4">
                    <Select
                        id="tipo-cuenta-inicial"
                        label="Tipo de cuenta"
                        value={tipo}
                        onChange={function (evento) {
                            const nuevoTipo = evento.target.value
                            setTipo(nuevoTipo)
                            if (nombre === "Efectivo" || nombre === "Cuenta bancaria") {
                                setNombre(
                                    nuevoTipo === "CUENTA_BANCARIA"
                                        ? "Cuenta bancaria"
                                        : nuevoTipo === "BILLETERA"
                                          ? "Billetera"
                                          : "Efectivo"
                                )
                            }
                        }}
                    >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="BILLETERA">Billetera</option>
                        <option value="CUENTA_BANCARIA">Cuenta bancaria</option>
                    </Select>

                    <Input
                        id="nombre-cuenta-inicial"
                        label="Nombre"
                        value={nombre}
                        onChange={function (evento) {
                            setNombre(evento.target.value)
                        }}
                        required
                        maxLength={100}
                    />

                    <Select
                        id="moneda-inicial"
                        label="Moneda"
                        value={moneda}
                        onChange={function (evento) {
                            setMoneda(evento.target.value)
                        }}
                    >
                        {MONEDAS.map(function (opcion) {
                            return (
                                <option key={opcion} value={opcion}>
                                    {opcion}
                                </option>
                            )
                        })}
                    </Select>

                    <MontoInput
                        id="saldo-inicial"
                        label={`Saldo actual (${moneda})`}
                        moneda={moneda}
                        value={saldo}
                        onChange={setSaldo}
                        required
                    />

                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Este importe establece el saldo inicial de la cuenta; no
                        se registra como ingreso.
                    </p>
                    <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                    >
                        Ya tenés categorías básicas listas. Podés editarlas o crear más desde Categorías.
                    </p>

                    {error && <Mensaje tipo="error">{error}</Mensaje>}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={guardando}
                    >
                        {guardando ? "Guardando..." : "Continuar"}
                    </Button>
                </form>
            </section>
        </main>
    )
}
