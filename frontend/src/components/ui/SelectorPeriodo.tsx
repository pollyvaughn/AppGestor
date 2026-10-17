import Button from "./Button"
import { OPCIONES_PERIODO, type ClavePeriodo } from "../../lib/periodo"

type SelectorPeriodoProps = {
    value: ClavePeriodo
    onChange: (clave: ClavePeriodo) => void
}

export default function SelectorPeriodo({
    value,
    onChange,
}: SelectorPeriodoProps) {
    return (
        <div
            role="group"
            aria-label="Periodo"
            className="flex flex-wrap items-center gap-2"
        >
            {OPCIONES_PERIODO.map(function (opcion) {
                const activo = opcion.key === value

                return (
                    <Button
                        key={opcion.key}
                        type="button"
                        variant={activo ? "primary" : "secondary"}
                        aria-pressed={activo}
                        className="!py-1 !text-xs"
                        onClick={function () {
                            onChange(opcion.key)
                        }}
                    >
                        {opcion.label}
                    </Button>
                )
            })}
        </div>
    )
}