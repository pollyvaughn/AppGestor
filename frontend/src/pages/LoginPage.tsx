import LoginForm from "../components/auth/LoginForm"
import type { Usuario } from "../types/auth"

type LoginPageProps = {
    onLogin: (usuario: Usuario) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    return (
        <main>
            <LoginForm onLogin={onLogin} />
        </main>
    )
}