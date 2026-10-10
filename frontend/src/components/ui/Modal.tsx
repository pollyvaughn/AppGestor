import { useEffect, useId, useRef } from "react"

type ModalProps = {
    open: boolean
    title: string
    onClose: () => void
    children: React.ReactNode
    wide?: boolean
}

export default function Modal({
    open,
    title,
    onClose,
    children,
    wide,
}: ModalProps) {
    const tituloId = useId()
    const dialogoRef = useRef<HTMLDivElement>(null)

    useEffect(
        function () {
            if (!open) {
                return
            }

            function alPresionar(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    onClose()
                }
            }

            document.addEventListener("keydown", alPresionar)

            return function () {
                document.removeEventListener("keydown", alPresionar)
            }
        },
        [open, onClose]
    )

    useEffect(
        function () {
            if (!open) {
                return
            }

            const anterior = document.activeElement as HTMLElement | null
            const dialogo = dialogoRef.current

            if (dialogo && !dialogo.contains(document.activeElement)) {
                dialogo.focus()
            }

            return function () {
                anterior?.focus()
            }
        },
        [open]
    )

    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(28,28,26,0.45)" }}
            onClick={function (e) {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                ref={dialogoRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={tituloId}
                tabIndex={-1}
                className="w-full max-h-[90vh] overflow-y-auto"
                style={{
                    maxWidth: wide ? "600px" : "440px",
                    background: "var(--color-card)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                    <h3 id={tituloId} className="text-sm font-medium">
                        {title}
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="w-11 h-11 md:w-7 md:h-7 text-xs"
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    )
}