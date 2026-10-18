// "2026-10-18" en hora local (sin problemas de zona horaria)
export function fechaHoy() {
    const h = new Date()
    const mes = String(h.getMonth() + 1).padStart(2, "0")
    const dia = String(h.getDate()).padStart(2, "0")
    return `${h.getFullYear()}-${mes}-${dia}`
}