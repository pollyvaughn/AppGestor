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
        <main>
            <RegisterForm onRegister={onRegister} />

            <p>
                ¿Ya tenés una cuenta?
                <button onClick={onLogin}>
                    Iniciá sesión
                </button>
            </p>
        </main>
    )
}