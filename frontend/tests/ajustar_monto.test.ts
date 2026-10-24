// =========================================================
// Tests del punto 7: ajustarMontoAMoneda (lib/moneda.ts)
// Se corre desde la carpeta frontend:
//   node --test tests/ajustar_monto.test.ts
// (hace falta Node 22.6 o más nuevo; en 22.6 a 22.17 agregá
//  --experimental-strip-types)
// =========================================================

import { test } from "node:test"
import assert from "node:assert/strict"

import { ajustarMontoAMoneda } from "../src/lib/moneda.ts"

test("pasar a guaraníes corta los decimales", () => {
    assert.equal(ajustarMontoAMoneda("10.5", "PYG"), "10")
    assert.equal(ajustarMontoAMoneda("1250.50", "PYG"), "1250")
    assert.equal(ajustarMontoAMoneda("0.99", "PYG"), "0")
})

test("un monto sin decimales no cambia en guaraníes", () => {
    assert.equal(ajustarMontoAMoneda("300000", "PYG"), "300000")
})

test("un monto vacío queda vacío (no se vuelve '0')", () => {
    assert.equal(ajustarMontoAMoneda("", "PYG"), "")
    assert.equal(ajustarMontoAMoneda("", "USD"), "")
})

test("en monedas con decimales no se toca nada", () => {
    for (const moneda of ["USD", "EUR", "ARS", "BRL"]) {
        assert.equal(ajustarMontoAMoneda("10.5", moneda), "10.5")
        assert.equal(ajustarMontoAMoneda("1250", moneda), "1250")
        assert.equal(ajustarMontoAMoneda("0.", moneda), "0.")
    }
})
