import Input from "./Input"
import { agregarSeparadores, decimalesDe } from "../../lib/moneda"

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
        const decimales = decimalesDe(moneda)

        // solo dígitos y coma; los puntos los pone la app
        let limpio = e.target.value.replace(/[^\d,]/g, "")

        if (decimales === 0) {
            limpio = limpio.replace(/,/g, "")
        }

        const [entero, ...resto] = limpio.split(",")

        let resultado = entero.replace(/^0+(?=\d)/, "")

        if (decimales > 0 && resto.length > 0) {
            if (resultado === "") {
                resultado = "0"
            }

            resultado += "." + resto.join("").slice(0, decimales)
        }

        onChange(resultado)
    }

    return (
        <Input
            {...props}
            type="text"
            inputMode="decimal"
            value={agregarSeparadores(value)}
            onChange={manejarCambio}
        />
    )
}