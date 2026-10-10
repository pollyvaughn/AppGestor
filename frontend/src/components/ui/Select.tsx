import { useId } from "react"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
}

export default function Select({
    label,
    id,
    style,
    children,
    ...props
}: SelectProps) {
    const idAuto = useId()
    const selectId = id ?? idAuto

    return (
        <div>
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-xs mb-1.5"
                    style={{
                        color: "var(--color-muted-foreground)",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    {label}
                </label>
            )}

            <select
                id={selectId}
                {...props}
                className="w-full px-2.5 py-2 text-base md:text-sm"
                style={{
                    background: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-foreground)",
                    ...style,
                }}
            >
                {children}
            </select>
        </div>
    )
}