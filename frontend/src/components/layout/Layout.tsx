export type Vista =
    | "global"
    | "mensual"
    | "tarjetas"
    | "recurrentes"
    | "categorias"
    | "cuentas"

const VISTAS: { key: Vista; label: string }[] = [
    { key: "global", label: "Global" },
    { key: "mensual", label: "Mensual" },
    { key: "tarjetas", label: "Tarjetas" },
    { key: "recurrentes", label: "Recurrentes" },
    { key: "categorias", label: "Categorías" },
    { key: "cuentas", label: "Cuentas" },
]

type LayoutProps = {
    vista: Vista
    onCambiarVista: (vista: Vista) => void
    onCerrarSesion: () => void
    children: React.ReactNode
}

export default function Layout({
    vista,
    onCambiarVista,
    onCerrarSesion,
    children,
}: LayoutProps) {
    return (
        <div className="min-h-full">
            <header
                style={{
                    background: "var(--color-card)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-sm font-medium">Finanzas</span>

                        <nav className="flex">
                            {VISTAS.map(function (item) {
                                const activa = vista === item.key

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={function () {
                                            onCambiarVista(item.key)
                                        }}
                                        className="text-xs px-4 py-2"
                                        style={{
                                            fontWeight: activa ? 600 : 400,
                                            color: activa
                                                ? "var(--color-foreground)"
                                                : "var(--color-muted-foreground)",
                                            borderBottom: activa
                                                ? "2px solid var(--color-foreground)"
                                                : "2px solid transparent",
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    <button
                        type="button"
                        onClick={onCerrarSesion}
                        className="text-xs px-3 py-1.5"
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--color-muted-foreground)",
                        }}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </div>
    )
}