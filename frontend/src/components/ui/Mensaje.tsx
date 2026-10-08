type MensajeProps = {
    tipo: "error" | "exito"
    children: React.ReactNode
}

export default function Mensaje({ tipo, children }: MensajeProps) {
    const esError = tipo === "error"

    return (
        <p
            role={esError ? "alert" : "status"}
            className="text-sm px-3 py-2"
            style={{
                color: esError ? "var(--color-expense)" : "var(--color-income)",
                background: esError
                    ? "var(--color-expense-bg)"
                    : "var(--color-income-bg)",
                borderRadius: "var(--radius-sm)",
            }}
        >
            {children}
        </p>
    )
}