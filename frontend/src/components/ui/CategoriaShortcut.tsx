type CategoriaShortcutProps = {
    onClick: () => void
}

export default function CategoriaShortcut({
    onClick,
}: CategoriaShortcutProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-xs underline underline-offset-2"
            style={{ color: "var(--color-muted-foreground)" }}
        >
            Crear categoría
        </button>
    )
}
