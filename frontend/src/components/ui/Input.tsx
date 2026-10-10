import { useId } from "react"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string
}

export default function Input({ label, id, style, ...props }: InputProps) {
    const idAuto = useId()
    const inputId = id ?? idAuto

    return (
        <div>
            {label && (
                <label
                    htmlFor={inputId}
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

            <input
                id={inputId}
                {...props}
                className="w-full px-2.5 py-2 text-base md:text-sm"
                style={{
                    background: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-foreground)",
                    ...style,
                }}
            />
        </div>
    )
}