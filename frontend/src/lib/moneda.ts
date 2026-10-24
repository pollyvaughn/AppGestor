// =========================================================
// Montos: formato para mostrar y para escribir/pegar en los inputs
//
// Convención de la app (es-PY): punto = miles, coma = decimales.
// Dentro del código los montos viajan en formato JS: "1250.5".
// =========================================================

// 12 dígitos enteros = 999.999.999.999 (igual que MONTO_MAXIMO del backend).
// Las columnas son DECIMAL(15,2): 15 dígitos en total, 2 decimales.
export const MAX_DIGITOS_ENTERO = 12

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

// Lo que el usuario ESCRIBE: solo cuentan los dígitos y la coma
// (los puntos los pone la app). Devuelve el formato JS ("1250.5").
//  - guaraníes: sin decimales (la coma se descarta)
//  - se corta en MAX_DIGITOS_ENTERO enteros y en 2 decimales
export function normalizarMonto(texto: string, moneda: string) {
    const decimales = decimalesDe(moneda)

    let limpio = texto.replace(/[^\d,]/g, "")

    if (decimales === 0) {
        limpio = limpio.replace(/,/g, "")
    }

    const [entero, ...resto] = limpio.split(",")

    let resultado = entero
        .replace(/^0+(?=\d)/, "")
        .slice(0, MAX_DIGITOS_ENTERO)

    if (decimales > 0 && resto.length > 0) {
        if (resultado === "") {
            resultado = "0"
        }

        resultado += "." + resto.join("").slice(0, decimales)
    }

    return resultado
}

// Lo que el usuario PEGA puede venir en cualquier formato:
//   "1.250,50" (es-PY)   "1,250.50" (EE.UU.)   "1250.5"   "$ 300.000"
// Si se pasara por normalizarMonto tal cual, "1250.50" se leería como
// 125050 (100 veces más). Regla para decidir qué separador es el decimal:
//  - los dos símbolos: el último es el decimal
//  - solo una coma: decimal; varias comas: miles
//  - solo puntos: varios = miles; uno solo = decimal salvo que le sigan
//    exactamente 3 dígitos ("1.250" = mil doscientos cincuenta)
// En guaraníes se descarta la parte decimal.
export function interpretarPegado(texto: string, moneda: string) {
    const t = texto.replace(/[^\d.,]/g, "")
    const ultimoPunto = t.lastIndexOf(".")
    const ultimaComa = t.lastIndexOf(",")

    let indiceDecimal = -1

    if (ultimoPunto !== -1 && ultimaComa !== -1) {
        indiceDecimal = Math.max(ultimoPunto, ultimaComa)
    } else if (ultimaComa !== -1) {
        const comas = t.split(",").length - 1
        indiceDecimal = comas === 1 ? ultimaComa : -1
    } else if (ultimoPunto !== -1) {
        const puntos = t.split(".").length - 1
        const despues = t.length - ultimoPunto - 1
        indiceDecimal = puntos === 1 && despues !== 3 ? ultimoPunto : -1
    }

    const entero = (
        indiceDecimal === -1 ? t : t.slice(0, indiceDecimal)
    ).replace(/\D/g, "")

    const fraccion =
        indiceDecimal === -1 || decimalesDe(moneda) === 0
            ? ""
            : t.slice(indiceDecimal + 1).replace(/\D/g, "")

    return normalizarMonto(
        fraccion === "" ? entero : `${entero},${fraccion}`,
        moneda
    )
}

// Ajusta un monto ya escrito ("10.5") a la moneda elegida (punto 7).
// Si la moneda no admite decimales (PYG) se corta la parte decimal:
// "10.5" => "10". Un monto vacío queda vacío (no se convierte en "0").
// Sirve cuando el usuario cambia de cuenta con el monto ya escrito.
export function ajustarMontoAMoneda(valor: string, moneda: string) {
    if (decimalesDe(moneda) === 0) {
        return valor.split(".")[0]
    }

    return valor
}