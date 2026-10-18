import Mensaje from "./Mensaje"
import { formatearMonto } from "../../lib/moneda"

type CuentaConSaldo = {
    nombre: string
    tipo: string
    moneda: string
    saldo: number
}

type AlertaSaldoNegativoProps = {
    cuentas: CuentaConSaldo[]
}

export default function AlertaSaldoNegativo({
    cuentas,
}: AlertaSaldoNegativoProps) {
    const negativas = cuentas.filter(function (c) {
        return c.tipo !== "TARJETA_CREDITO" && Number(c.saldo) < 0
    })

    if (negativas.length === 0) {
        return null
    }

    const detalle = negativas
        .map(function (c) {
            return `${c.nombre} (${formatearMonto(Number(c.saldo), c.moneda)} ${c.moneda})`
        })
        .join(", ")

    return (
        <Mensaje tipo="error">
            Saldo negativo en {detalle}. Revisá si falta cargar un ingreso o
            usá "Ajustar saldo" en Cuentas.
        </Mensaje>
    )
}