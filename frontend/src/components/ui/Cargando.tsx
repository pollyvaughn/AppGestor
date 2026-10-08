type CargandoProps = {
    texto?: string
}

export default function Cargando({ texto = "Cargando..." }: CargandoProps) {
    return (
        <div
            role="status"
            className="flex items-center justify-center gap-2 py-8 text-sm"
            style={{ color: "var(--color-muted-foreground)" }}
        >
            <span
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                    border: "2px solid var(--color-border)",
                    borderTopColor: "var(--color-foreground)",
                }}
            />
            {texto}
        </div>
    )
}