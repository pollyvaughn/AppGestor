import LoginForm from "../components/auth/LoginForm"
import type { Usuario } from "../types/auth"

type LoginPageProps = {
    onLogin: (usuario: Usuario) => void
    onRegister: () => void
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
    return (
        <main className="min-h-full flex items-center justify-center p-6">
            <div
                className="w-full max-w-sm p-8 space-y-6"
                style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                }}
            >
                <LoginForm onLogin={onLogin} />

                <p
                    className="text-sm text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    ¿No tenés una cuenta?{" "}
                    <button
                        type="button"
                        onClick={onRegister}
                        className="font-medium underline"
                        style={{ color: "var(--color-foreground)" }}
                    >
                        Registrate
                    </button>
                </p>
            </div>
        </main>
    )
}