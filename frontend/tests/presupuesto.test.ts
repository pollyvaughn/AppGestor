// Tests de lib/presupuesto.ts (alerta de tope)
// Se corre desde la carpeta frontend (Node 22.6 o más nuevo):
//   node --test tests/presupuesto.test.ts

import { test } from "node:test"
import assert from "node:assert/strict"

import { evaluarTope } from "../src/lib/presupuesto.ts"

// Mes de 30 días, tope de 1.000.000

test("sin tope no hay alerta", () => {
    assert.equal(evaluarTope(500000, null, 10, 30), null)
    assert.equal(evaluarTope(500000, 0, 10, 30), null)
})

test("por debajo del 80% y ritmo tranquilo: ok", () => {
    assert.equal(evaluarTope(200000, 1000000, 15, 30)?.nivel, "ok")
})

test("al llegar al 80% es aviso", () => {
    assert.equal(evaluarTope(800000, 1000000, 28, 30)?.nivel, "aviso")
    assert.equal(evaluarTope(799999, 1000000, 28, 30)?.nivel, "ok")
})

test("exactamente el 100% todavía es aviso, pasarlo es superado", () => {
    assert.equal(evaluarTope(1000000, 1000000, 20, 30)?.nivel, "aviso")

    const e = evaluarTope(1200000, 1000000, 20, 30)
    assert.equal(e?.nivel, "superado")
    assert.equal(e?.exceso, 200000)
})

test("la proyección avisa si se pasaría a fin de mes", () => {
    // 600.000 en 10 días => 1.800.000 a fin de mes
    const e = evaluarTope(600000, 1000000, 10, 30)
    assert.equal(e?.nivel, "proyeccion")
    assert.equal(e?.proyeccion, 1800000)
})

test("los primeros días no se proyecta (evita falsas alarmas)", () => {
    // 100.000 el día 1 => 3.000.000 proyectados, pero no se avisa
    assert.equal(evaluarTope(100000, 1000000, 1, 30)?.nivel, "ok")
    assert.equal(evaluarTope(100000, 1000000, 4, 30)?.nivel, "ok")
    assert.equal(evaluarTope(200000, 1000000, 5, 30)?.nivel, "proyeccion")
})

test("gana la alerta más grave", () => {
    // pasa el 100%, el 80% y la proyección a la vez
    assert.equal(evaluarTope(1500000, 1000000, 10, 30)?.nivel, "superado")
    // pasa el 80% y la proyección: gana aviso
    assert.equal(evaluarTope(850000, 1000000, 10, 30)?.nivel, "aviso")
})