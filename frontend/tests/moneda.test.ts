// =========================================================
// Tests de lib/moneda.ts (punto 6): escribir y pegar montos
//
// Se corre desde la carpeta frontend (hace falta Node 22.6 o más nuevo,
// que entiende TypeScript sin compilar):
//   node --test tests/moneda.test.ts
// Si tu Node es 20, saltá este archivo y usá el checklist manual.
//
// Formato de salida: el de JS ("1250.5"), que es el que guardan los
// formularios; el punto de miles lo agrega agregarSeparadores al mostrar.
// =========================================================

import { test } from "node:test"
import assert from "node:assert/strict"

import {
    MAX_DIGITOS_ENTERO,
    agregarSeparadores,
    formatearMonto,
    interpretarPegado,
    normalizarMonto,
} from "../src/lib/moneda.ts"

// ---------- Escribir (normalizarMonto) ----------

test("guaraníes: el punto de miles se descarta", () => {
    assert.equal(normalizarMonto("300.000", "PYG"), "300000")
})

test("dólares: coma decimal, máximo 2 decimales", () => {
    assert.equal(normalizarMonto("1.250,50", "USD"), "1250.50")
    assert.equal(normalizarMonto("12,345", "USD"), "12.34")
})

test("empezar con coma da 0 coma algo", () => {
    assert.equal(normalizarMonto(",", "USD"), "0.")
    assert.equal(normalizarMonto(",5", "USD"), "0.5")
})

test("ceros a la izquierda se limpian", () => {
    assert.equal(normalizarMonto("007", "PYG"), "7")
    assert.equal(normalizarMonto("00", "PYG"), "0")
})

test("guaraníes no admiten coma", () => {
    assert.equal(normalizarMonto("12,5", "PYG"), "125")
})

test("borrar un dígito de 1.000 deja 100 (no lo toma como decimal)", () => {
    assert.equal(normalizarMonto("1.00", "PYG"), "100")
})

test("negativos y letras no entran", () => {
    assert.equal(normalizarMonto("-500", "PYG"), "500")
    assert.equal(normalizarMonto("abc", "PYG"), "")
    assert.equal(normalizarMonto("", "USD"), "")
})

test("se corta en 12 dígitos enteros", () => {
    const resultado = normalizarMonto("1234567890123456", "PYG")
    assert.equal(resultado.length, MAX_DIGITOS_ENTERO)
    assert.equal(resultado, "123456789012")
})

// ---------- Pegar (interpretarPegado) ----------

test("pegar formato es-PY: 1.250,50", () => {
    assert.equal(interpretarPegado("1.250,50", "USD"), "1250.50")
})

test("pegar formato EE.UU.: 1,250.50", () => {
    assert.equal(interpretarPegado("1,250.50", "USD"), "1250.50")
})

test("pegar 1250.5 no se lee como 12505", () => {
    assert.equal(interpretarPegado("1250.5", "USD"), "1250.5")
    assert.equal(interpretarPegado("1250.50", "USD"), "1250.50")
})

test("pegar 1.250 (tres dígitos después del punto) son miles", () => {
    assert.equal(interpretarPegado("1.250", "USD"), "1250")
    assert.equal(interpretarPegado("1.250.000", "USD"), "1250000")
})

test("pegar con varias comas son miles", () => {
    assert.equal(interpretarPegado("$ 1,250,000", "USD"), "1250000")
})

test("pegar con una coma es decimal", () => {
    assert.equal(interpretarPegado("1250,5", "USD"), "1250.5")
})

test("pegar en guaraníes descarta los decimales", () => {
    assert.equal(interpretarPegado("300.000", "PYG"), "300000")
    assert.equal(interpretarPegado("Gs. 300.000", "PYG"), "300000")
    assert.equal(interpretarPegado("1250.50", "PYG"), "1250")
    assert.equal(interpretarPegado("1.250,50", "PYG"), "1250")
})

test("pegar casos raros", () => {
    assert.equal(interpretarPegado(".5", "USD"), "0.5")
    assert.equal(interpretarPegado("1250.", "USD"), "1250")
    assert.equal(interpretarPegado("-1.250,50", "USD"), "1250.50")
    assert.equal(interpretarPegado("abc", "USD"), "")
    assert.equal(interpretarPegado("", "USD"), "")
})

test("pegar un número gigante se corta en 12 dígitos", () => {
    assert.equal(
        interpretarPegado("9999999999999999", "PYG").length,
        MAX_DIGITOS_ENTERO
    )
})

// ---------- Mostrar ----------

test("agregarSeparadores muestra puntos de miles y coma decimal", () => {
    assert.equal(agregarSeparadores("1250.5"), "1.250,5")
    assert.equal(agregarSeparadores("300000"), "300.000")
    assert.equal(agregarSeparadores("0."), "0,")
    assert.equal(agregarSeparadores(""), "")
})

test("formatearMonto: guaraníes sin decimales, el resto con 2", () => {
    assert.equal(formatearMonto(300000, "PYG"), "300.000")
    assert.equal(formatearMonto(1250.5, "USD"), "1.250,50")
})