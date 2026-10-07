type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string
}

export default function Input({ label, id, style, ...props }: InputProps) {
    return (
        <div>
            {label && (
                <label
                    htmlFor={id}
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
                id={id}
                {...props}
                className="w-full px-2.5 py-2 text-sm"
                style={{
                    background: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-foreground)",
                    outline: "none",
                    ...style,
                }}
            />
        </div>
    )
}