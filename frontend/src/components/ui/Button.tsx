type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger"
}

const estilos = {
    primary: {
        background: "var(--color-foreground)",
        color: "var(--color-background)",
        border: "1px solid var(--color-foreground)",
    },
    secondary: {
        background: "transparent",
        color: "var(--color-muted-foreground)",
        border: "1px solid var(--color-border)",
    },
    danger: {
        background: "var(--color-expense)",
        color: "white",
        border: "1px solid var(--color-expense)",
    },
}

export default function Button({
    variant = "primary",
    className = "",
    style,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            className={`px-3 py-2 min-h-11 md:min-h-0 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
            style={{
                ...estilos[variant],
                borderRadius: "var(--radius-sm)",
                ...style,
            }}
        />
    )
}