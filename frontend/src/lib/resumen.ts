// Tasa de ahorro = (ingresos - gastos) / ingresos * 100.
// Si no hubo ingresos no tiene sentido: devuelve null.
export function tasaAhorro(ingresos: number, gastos: number) {
    if (ingresos <= 0) {
        return null
    }

    return ((ingresos - gastos) / ingresos) * 100
}

// Variación porcentual contra el periodo anterior.
// Si antes no había gasto no se puede calcular: devuelve null.
export function variacionPorcentual(actual: number, anterior: number) {
    if (anterior <= 0) {
        return null
    }

    return ((actual - anterior) / anterior) * 100
}

// Deuda en tarjetas como porcentaje del ingreso promedio mensual.
export function ratioEndeudamiento(
    deuda: number,
    ingresoPromedioMensual: number
) {
    if (ingresoPromedioMensual <= 0) {
        return null
    }

    return (deuda / ingresoPromedioMensual) * 100
}

// 12.5 => "12,5%"   -3.04 => "−3%"   con signo: 12.5 => "+12,5%"
export function formatearPorcentaje(valor: number, conSigno = false) {
    const redondeado = Math.round(valor * 10) / 10

    if (redondeado === 0) {
        return "0%"
    }

    const texto = Math.abs(redondeado).toLocaleString("es-PY", {
        maximumFractionDigits: 1,
    })

    const signo = redondeado < 0 ? "−" : conSigno ? "+" : ""

    return `${signo}${texto}%`
}