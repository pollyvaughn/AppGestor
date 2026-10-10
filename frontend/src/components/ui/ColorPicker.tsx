export const COLORES = [
    "#7A7873",
    "#2A6049",
    "#4A8A7A",
    "#3B6EA8",
    "#5A6EA8",
    "#7B5EA7",
    "#9A3223",
    "#A86B3B",
    "#B07840",
]

type ColorPickerProps = {
    label?: string
    value: string
    onChange: (color: string) => void
}

export default function ColorPicker({
    label,
    value,
    onChange,
}: ColorPickerProps) {
    return (
        <div>
            {label && (
                <p
                    className="block text-xs mb-2"
                    style={{
                        color: "var(--color-muted-foreground)",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    {label}
                </p>
            )}

            <div className="flex flex-wrap gap-2.5">
                {COLORES.map(function (color) {
                    const activo = value === color

                    return (
                        <button
                            key={color}
                            type="button"
                            aria-label={`Color ${color}`}
                            aria-pressed={activo}
                            onClick={function () {
                                onChange(color)
                            }}
                            className="w-10 h-10 rounded-full"
                            style={{
                                background: color,
                                outline: activo ? `2px solid ${color}` : "none",
                                outlineOffset: "2px",
                                opacity: activo ? 1 : 0.65,
                            }}
                        />
                    )
                })}
            </div>
        </div>
    )
}