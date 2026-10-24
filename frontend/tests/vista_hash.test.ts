// =========================================================
// Tests de lib/vistaHash.ts: vista <-> hash de la URL
//
// Se corre desde la carpeta frontend:
//   node --test tests/vista_hash.test.ts
// El comportamiento del atrás/adelante en el navegador (el hook) se
// prueba aparte; acá solo la parte que no depende de React.
// =========================================================

import { test } from "node:test"
import assert from "node:assert/strict"

import {
    VISTA_INICIAL,
    hashDeVista,
    vistaDesdeHash,
} from "../src/lib/vistaHash.ts"

const TODAS = [
    "global",
    "mensual",
    "tarjetas",
    "recurrentes",
    "categorias",
    "cuentas",
] as const

test("la vista inicial es mensual", () => {
    assert.equal(VISTA_INICIAL, "mensual")
})

test("ida y vuelta: cada vista se escribe y se vuelve a leer igual", () => {
    for (const vista of TODAS) {
        assert.equal(vistaDesdeHash(hashDeVista(vista)), vista)
    }
})

test("el hash se escribe como #/vista", () => {
    assert.equal(hashDeVista("global"), "#/global")
    assert.equal(hashDeVista("cuentas"), "#/cuentas")
})

test("tolera #vista sin barra, mayúsculas y query al final", () => {
    assert.equal(vistaDesdeHash("#global"), "global")
    assert.equal(vistaDesdeHash("#/Tarjetas"), "tarjetas")
    assert.equal(vistaDesdeHash("#/mensual?mes=2026-09"), "mensual")
})

test("vacío, solo # o sin vista devuelven null", () => {
    assert.equal(vistaDesdeHash(""), null)
    assert.equal(vistaDesdeHash("#"), null)
    assert.equal(vistaDesdeHash("#/"), null)
})

test("una vista que no existe devuelve null", () => {
    assert.equal(vistaDesdeHash("#/inventada"), null)
    assert.equal(vistaDesdeHash("#/mensual/extra"), null)
    assert.equal(vistaDesdeHash("#/cuenta"), null) // singular: no es vista
})

test("nombres de Object.prototype no se cuelan como vistas", () => {
    assert.equal(vistaDesdeHash("#/constructor"), null)
    assert.equal(vistaDesdeHash("#/toString"), null)
    assert.equal(vistaDesdeHash("#/__proto__"), null)
})