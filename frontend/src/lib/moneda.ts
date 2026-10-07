export function decimalesDe(moneda: string) {
    return moneda === "PYG" ? 0 : 2
}

// Para mostrar un monto en pantalla: 300.000 / 1.250,50
export function formatearMonto(valor: number, moneda: string) {
    const decimales = decimalesDe(moneda)

    return Number(valor).toLocaleString("es-PY", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    })
}

// Para mostrar el valor de un input mientras se escribe.
// Recibe un número en formato JS ("300000" o "1250.5").
export function agregarSeparadores(valor: string) {
    if (valor === "") {
        return ""
    }

    const [entero, decimal] = valor.split(".")
    const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    return decimal !== undefined ? `${conPuntos},${decimal}` : conPuntos
}