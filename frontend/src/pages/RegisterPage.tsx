import RegisterForm from "../components/auth/RegisterForm"

type RegisterPageProps = {
    onRegister: () => void
    onLogin: () => void
}

export default function RegisterPage({
    onRegister,
    onLogin,
}: RegisterPageProps) {
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
                <RegisterForm onRegister={onRegister} />

                <p
                    className="text-sm text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                >
                    ¿Ya tenés una cuenta?{" "}
                    <button
                        type="button"
                        onClick={onLogin}
                        className="font-medium underline"
                        style={{ color: "var(--color-foreground)" }}
                    >
                        Iniciá sesión
                    </button>
                </p>
            </div>
        </main>
    )
}