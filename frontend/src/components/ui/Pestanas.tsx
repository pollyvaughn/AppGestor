import type { KeyboardEvent } from "react"

type Pestana = { key: string; label: string }

type PestanasProps = {
    // prefijo para los ids: el panel usa `${idBase}-panel-${key}`
    // y se vincula con aria-labelledby=`${idBase}-tab-${key}`
    idBase: string
    etiqueta: string
    pestanas: Pestana[]
    value: string
    onChange: (key: string) => void
}

// Solo dibuja la fila de pestañas: el contenido lo arma la pantalla.
// Flechas izquierda/derecha, Inicio y Fin mueven entre pestañas.
export default function Pestanas({
    idBase,
    etiqueta,
    pestanas,
    value,
    onChange,
}: PestanasProps) {
    function alPresionar(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
        let destino = -1

        if (e.key === "ArrowRight") {
            destino = (indice + 1) % pestanas.length
        } else if (e.key === "ArrowLeft") {
            destino = (indice - 1 + pestanas.length) % pestanas.length
        } else if (e.key === "Home") {
            destino = 0
        } else if (e.key === "End") {
            destino = pestanas.length - 1
        }

        if (destino === -1) {
            return
        }

        e.preventDefault()

        const nueva = pestanas[destino].key
        onChange(nueva)
        document.getElementById(`${idBase}-tab-${nueva}`)?.focus()
    }

    return (
        <div
            role="tablist"
            aria-label={etiqueta}
            className="flex overflow-x-auto"
            style={{ borderBottom: "1px solid var(--color-border)" }}
        >
            {pestanas.map(function (item, indice) {
                const activa = value === item.key

                return (
                    <button
                        key={item.key}
                        id={`${idBase}-tab-${item.key}`}
                        type="button"
                        role="tab"
                        aria-selected={activa}
                        aria-controls={`${idBase}-panel-${item.key}`}
                        tabIndex={activa ? 0 : -1}
                        onClick={function () {
                            onChange(item.key)
                        }}
                        onKeyDown={function (e) {
                            alPresionar(e, indice)
                        }}
                        className="shrink-0 whitespace-nowrap text-xs px-4 py-2 min-h-11"
                        style={{
                            fontWeight: activa ? 600 : 400,
                            color: activa
                                ? "var(--color-foreground)"
                                : "var(--color-muted-foreground)",
                            borderBottom: activa
                                ? "2px solid var(--color-foreground)"
                                : "2px solid transparent",
                        }}
                    >
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}