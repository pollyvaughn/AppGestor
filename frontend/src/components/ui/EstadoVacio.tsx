type EstadoVacioProps = {
    texto: string
}

export default function EstadoVacio({ texto }: EstadoVacioProps) {
    return (
        <p
            className="text-sm py-6 text-center"
            style={{ color: "var(--color-muted-foreground)" }}
        >
            {texto}
        </p>
    )
}