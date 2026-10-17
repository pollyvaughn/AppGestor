type KpiCardProps = {
    titulo: string
    valor: string
    unidad?: string
    detalle?: string
    color?: string
}

export default function KpiCard({
    titulo,
    valor,
    unidad,
    detalle,
    color = "var(--color-foreground)",
}: KpiCardProps) {
    return (
        <div
            className="p-5 space-y-2"
            style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <p
                className="text-xs"
                style={{
                    color: "var(--color-muted-foreground)",
                    fontFamily: "var(--font-mono)",
                }}
            >
                {titulo}
            </p>

            <p
                className="text-xl font-light break-words"
                style={{ fontFamily: "var(--font-mono)", color: color }}
            >
                {valor}
                {unidad && (
                    <>
                        {" "}
                        <span className="text-sm">{unidad}</span>
                    </>
                )}
            </p>

            {detalle && (
                <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    {detalle}
                </p>
            )}
        </div>
    )
}