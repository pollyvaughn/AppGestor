import LoginForm from "../components/auth/LoginForm"
import type { Usuario } from "../types/auth"

type LoginPageProps = {
    onLogin: (usuario: Usuario) => void
    onRegister: () => void
}

export default function LoginPage({
    onLogin,
    onRegister,
}: LoginPageProps) {
    return (
        <main>
            <LoginForm onLogin={onLogin} />

            <p>
                ¿No tenés una cuenta?
                <button onClick={onRegister}>
                    Registrate
                </button>
            </p>
        </main>
    )
}