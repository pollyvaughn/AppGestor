import { useEffect, useState } from "react"

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
    { key: "recurrentes", label: "Recurrentes" },
    { key: "categorias", label: "Categorías" },
    { key: "tarjetas", label: "Tarjetas" },
    { key: "cuentas", label: "Cuentas" },
]

type LayoutProps = {
    vista: Vista
    onCambiarVista: (vista: Vista) => void
    onCerrarSesion: () => void
    onNuevoMovimiento: () => void
    onTransferir: () => void
    onNuevaCompra: () => void
    children: React.ReactNode
}

export default function Layout({
    vista,
    onCambiarVista,
    onCerrarSesion,
    onNuevoMovimiento,
    onTransferir,
    onNuevaCompra,
    children,
}: LayoutProps) {
    const [menuAbierto, setMenuAbierto] = useState(false)

    // Escape cierra el menú de crear
    useEffect(
        function () {
            if (!menuAbierto) {
                return
            }

            function alPresionar(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    setMenuAbierto(false)
                }
            }

            document.addEventListener("keydown", alPresionar)

            return function () {
                document.removeEventListener("keydown", alPresionar)
            }
        },
        [menuAbierto]
    )

    const ACCIONES = [
        { label: "Nuevo movimiento", accion: onNuevoMovimiento },
        { label: "Transferencia entre cuentas", accion: onTransferir },
        { label: "Nueva compra con tarjeta", accion: onNuevaCompra },
    ]

    return (
        <div className="min-h-full">
            <header
                style={{
                    background: "var(--color-card)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2">
                    <span className="order-1 text-sm font-medium">
                        Finanzas
                    </span>

                    <button
                        type="button"
                        onClick={onCerrarSesion}
                        className="order-2 md:order-3 text-xs px-3 py-1.5 min-h-11 md:min-h-0"
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--color-muted-foreground)",
                        }}
                    >
                        Cerrar sesión
                    </button>

                    <nav
                        aria-label="Navegación principal"
                        className="order-3 md:order-2 w-full md:w-auto md:flex-1 md:ml-6 flex overflow-x-auto"
                    >
                        {VISTAS.map(function (item) {
                            const activa = vista === item.key

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-current={activa ? "page" : undefined}
                                    onClick={function () {
                                        onCambiarVista(item.key)
                                    }}
                                    className="shrink-0 whitespace-nowrap text-xs px-4 py-2 min-h-11"
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
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24">
                {children}
            </main>

            {/* Capa transparente: un click afuera cierra el menú */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={function () {
                        setMenuAbierto(false)
                    }}
                    aria-hidden="true"
                />
            )}

            <div className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6 flex flex-col items-end gap-2">
                {menuAbierto && (
                    <div
                        role="menu"
                        aria-label="Crear"
                        className="flex flex-col overflow-hidden"
                        style={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-lg)",
                            boxShadow: "0 4px 12px rgba(28,28,26,0.25)",
                        }}
                    >
                        {ACCIONES.map(function (item) {
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    role="menuitem"
                                    onClick={function () {
                                        setMenuAbierto(false)
                                        item.accion()
                                    }}
                                    className="text-left text-sm px-4 py-3 min-h-11"
                                    style={{
                                        borderBottom:
                                            "1px solid var(--color-border)",
                                    }}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>
                )}

                <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuAbierto}
                    aria-label="Crear"
                    onClick={function () {
                        setMenuAbierto(!menuAbierto)
                    }}
                    className="h-14 min-w-14 px-4 flex items-center justify-center gap-2 rounded-full text-sm font-medium"
                    style={{
                        background: "var(--color-foreground)",
                        color: "var(--color-background)",
                        boxShadow: "0 4px 12px rgba(28,28,26,0.25)",
                    }}
                >
                    <span
                        className="text-2xl leading-none"
                        aria-hidden="true"
                        style={{
                            display: "inline-block",
                            transition: "transform 0.15s",
                            transform: menuAbierto ? "rotate(45deg)" : "none",
                        }}
                    >
                        +
                    </span>
                    <span className="hidden sm:inline">Crear</span>
                </button>
            </div>
        </div>
    )
}