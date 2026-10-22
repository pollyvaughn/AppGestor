// =========================================================
// Input de montos con separador de miles (300.000 / 1.250,50)
// Toda la lógica de limpiar lo escrito o pegado vive en lib/moneda.ts
// (normalizarMonto e interpretarPegado) para poder probarla aparte.
// =========================================================

import Input from "./Input"
import {
    agregarSeparadores,
    interpretarPegado,
    normalizarMonto,
} from "../../lib/moneda"

type MontoInputProps = {
    id?: string
    label?: string
    moneda: string
    value: string
    onChange: (valor: string) => void
    required?: boolean
    disabled?: boolean
    placeholder?: string
}

export default function MontoInput({
    moneda,
    value,
    onChange,
    ...props
}: MontoInputProps) {
    function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
        onChange(normalizarMonto(e.target.value, moneda))
    }

    // al pegar se interpreta el formato del texto y se reemplaza el valor
    function manejarPegado(e: React.ClipboardEvent<HTMLInputElement>) {
        e.preventDefault()
        onChange(interpretarPegado(e.clipboardData.getData("text"), moneda))
    }

    return (
        <Input
            {...props}
            type="text"
            inputMode="decimal"
            value={agregarSeparadores(value)}
            onChange={manejarCambio}
            onPaste={manejarPegado}
        />
    )
}