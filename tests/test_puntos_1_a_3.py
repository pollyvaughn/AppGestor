# =========================================================
# Tests de los puntos 1, 2 y 3 del roadmap
#   Punto 1: anular_pago (pago_service) + validación de fecha en crear/editar pago
#   Punto 2: editar_movimiento (movimiento_service)
#   Punto 3: validaciones de los modelos (pydantic)
#
# Se corre desde la raíz del proyecto (con el .venv activado):
#   python -m unittest tests.test_puntos_1_a_3 -v
#
# No usa la base de datos real: reemplaza la conexión por un "cursor falso"
# que guarda las consultas SQL que se ejecutan, así se puede comprobar qué
# hizo el código sin tocar MySQL. No hace falta instalar nada extra.
# =========================================================

import unittest
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from fastapi import HTTPException

from backend.services import movimiento_service, pago_service


# ---------- Conexión y cursor falsos ----------

class FakeCursor:
    # fetchone / fetchall: respuestas en el orden en que el código las pide
    def __init__(self, fetchone=None, fetchall=None):
        self.cola_one = list(fetchone or [])
        self.cola_all = list(fetchall or [])
        self.ejecutadas = []  # lista de (sql con espacios normalizados, params)
        self.lastrowid = 1
        self.rowcount = 1

    def execute(self, sql, params=None):
        self.ejecutadas.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.cola_one.pop(0)

    def fetchall(self):
        return self.cola_all.pop(0)

    def close(self):
        pass


class FakeConn:
    def __init__(self, cursor):
        self.cur = cursor
        self.commits = 0
        self.rollbacks = 0

    def cursor(self, dictionary=False):
        return self.cur

    def start_transaction(self):
        pass

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass


def sqls(cursor, empieza_con):
    return [e for e in cursor.ejecutadas if e[0].startswith(empieza_con)]


# ---------- Punto 1: anular_pago ----------

class AnularPagoTest(unittest.TestCase):
    def preparar(self, estado_pago="CONFIRMADO"):
        cur = FakeCursor(
            fetchone=[
                # 1) el pago a anular
                {
                    "id": 1,
                    "monto": Decimal("100000"),
                    "estado": estado_pago,
                    "movimiento_id": 50,
                    "cuota_id": 7,
                    "cuota_estado": "PARCIAL",
                },
                # 2) total de la cuota (base + ajustes)
                {"monto_base": Decimal("150000"), "total_ajustes": Decimal("0")},
                # 3) lo pagado por los otros pagos
                {"total_pagado": Decimal("0")},
            ],
            # 4) cuentas que pusieron plata en el pago
            fetchall=[[{"metodo_pago_id": 3, "monto": Decimal("100000")}]],
        )
        return cur, FakeConn(cur)

    def test_anula_pago_y_su_movimiento_sin_romperse(self):
        cur, conn = self.preparar()

        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            resultado = pago_service.anular_pago(1, usuario_id=9)

        self.assertEqual(resultado["estado"], "PENDIENTE")
        self.assertEqual(resultado["monto_pendiente"], 150000.0)

        # el pago se marca ANULADO una sola vez (ya no hay segundo UPDATE roto)
        updates_pago = sqls(cur, "UPDATE pago")
        self.assertEqual(len(updates_pago), 1)
        self.assertIn("estado = 'ANULADO'", updates_pago[0][0])
        self.assertEqual(updates_pago[0][1], (1,))

        # el movimiento del pago también queda ANULADO
        updates_mov = sqls(cur, "UPDATE movimiento")
        self.assertEqual(len(updates_mov), 1)
        self.assertIn("estado = 'ANULADO'", updates_mov[0][0])
        self.assertEqual(updates_mov[0][1], (50,))

        # la plata vuelve a la cuenta 3 (revertir un EGRESO = sumar saldo)
        devolucion = sqls(cur, "UPDATE metodo_pago SET saldo = saldo + %s")
        self.assertEqual(len(devolucion), 1)
        self.assertEqual(devolucion[0][1], (Decimal("100000"), 3))

        # queda registrada en la tabla de anulaciones
        self.assertEqual(len(sqls(cur, "INSERT INTO anulacion")), 1)

        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_pago_ya_anulado_da_400_y_hace_rollback(self):
        cur, conn = self.preparar(estado_pago="ANULADO")

        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            with self.assertRaises(HTTPException) as ctx:
                pago_service.anular_pago(1, usuario_id=9)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)


# ---------- Punto 1 (extra): la fecha del pago se valida siempre ----------

COMPRA = datetime(2026, 10, 1, 12, 0)  # fecha_compra viene como DATETIME


class FechaPagoTest(unittest.TestCase):
    def pago(self, fecha):
        return SimpleNamespace(cuota_id=7, monto=100.0, metodos=[], fecha=fecha)

    def probar_crear(self, fecha):
        cur = FakeCursor(
            fetchone=[
                {
                    "id": 7,
                    "monto_pendiente": Decimal("150000"),
                    "estado": "PENDIENTE",
                    "numero": 1,
                    "compra_tarjeta_id": 3,
                    "tarjeta_id": 1,
                    "fecha_compra": COMPRA,
                    "moneda": "PYG",
                }
            ]
        )
        conn = FakeConn(cur)
        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            with self.assertRaises(HTTPException) as ctx:
                pago_service.crear_pago(self.pago(fecha), usuario_id=9)
        return ctx.exception, conn

    def probar_editar(self, fecha):
        cur = FakeCursor(
            fetchone=[
                {
                    "id": 1,
                    "monto": Decimal("100"),
                    "moneda": "PYG",
                    "estado": "CONFIRMADO",
                    "movimiento_id": 50,
                    "cuota_id": 7,
                    "monto_pendiente": Decimal("50"),
                    "cuota_estado": "PARCIAL",
                    "compra_tarjeta_id": 3,
                    "numero": 1,
                    "fecha_compra": COMPRA,
                }
            ]
        )
        conn = FakeConn(cur)
        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            with self.assertRaises(HTTPException) as ctx:
                pago_service.editar_pago(1, self.pago(fecha), usuario_id=9)
        return ctx.exception, conn

    def test_crear_pago_con_fecha_futura(self):
        error, conn = self.probar_crear(date.today() + timedelta(days=1))
        self.assertEqual(error.status_code, 400)
        self.assertIn("futura", error.detail)
        self.assertEqual(conn.rollbacks, 1)

    def test_crear_pago_anterior_a_la_compra(self):
        error, conn = self.probar_crear(date(2026, 9, 30))
        self.assertEqual(error.status_code, 400)
        self.assertIn("anterior a la compra", error.detail)
        self.assertEqual(conn.rollbacks, 1)

    def test_editar_pago_con_fecha_futura(self):
        error, conn = self.probar_editar(date.today() + timedelta(days=1))
        self.assertEqual(error.status_code, 400)
        self.assertIn("futura", error.detail)
        self.assertEqual(conn.rollbacks, 1)

    def test_editar_pago_anterior_a_la_compra(self):
        error, conn = self.probar_editar(date(2026, 9, 30))
        self.assertEqual(error.status_code, 400)
        self.assertIn("anterior a la compra", error.detail)

    def test_fechas_validas_no_dan_error(self):
        # sin fecha, el mismo día de la compra y hoy: todo permitido
        pago_service.validar_fecha_pago(None, COMPRA)
        pago_service.validar_fecha_pago(COMPRA.date(), COMPRA)
        pago_service.validar_fecha_pago(date.today(), COMPRA)


# ---------- Punto 1 (extra): la fecha del pago se valida siempre ----------

class FechaPagoTest(unittest.TestCase):
    def cuota_y_pago(self, fecha_pago):
        hoy = date.today()
        cuota = {
            "id": 7,
            "monto_pendiente": Decimal("150000"),
            "estado": "PENDIENTE",
            "numero": 1,
            "compra_tarjeta_id": 1,
            "tarjeta_id": 1,
            "fecha_compra": datetime.combine(hoy - timedelta(days=10), datetime.min.time()),
            "moneda": "PYG",
        }
        pago = SimpleNamespace(
            cuota_id=7,
            monto=100000.0,
            metodos=[SimpleNamespace(metodo_pago_id=3, monto=100000.0)],
            fecha=fecha_pago,
        )
        return cuota, pago

    def crear_con_fecha(self, fecha_pago):
        cuota, pago = self.cuota_y_pago(fecha_pago)
        conn = FakeConn(FakeCursor(fetchone=[cuota]))

        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            with self.assertRaises(HTTPException) as ctx:
                pago_service.crear_pago(pago, usuario_id=9)

        return ctx.exception, conn

    def test_crear_pago_con_fecha_futura(self):
        error, conn = self.crear_con_fecha(date.today() + timedelta(days=1))

        self.assertEqual(error.status_code, 400)
        self.assertEqual(error.detail, "La fecha del pago no puede ser futura")
        self.assertEqual(conn.rollbacks, 1)

    def test_crear_pago_con_fecha_anterior_a_la_compra(self):
        error, _ = self.crear_con_fecha(date.today() - timedelta(days=30))

        self.assertEqual(error.status_code, 400)
        self.assertEqual(error.detail, "El pago no puede ser anterior a la compra")

    def test_editar_pago_con_fecha_futura(self):
        hoy = date.today()
        pago_actual = {
            "id": 1,
            "monto": Decimal("100000"),
            "moneda": "PYG",
            "estado": "CONFIRMADO",
            "movimiento_id": 50,
            "cuota_id": 7,
            "monto_pendiente": Decimal("50000"),
            "cuota_estado": "PARCIAL",
            "compra_tarjeta_id": 1,
            "numero": 1,
            "fecha_compra": datetime.combine(hoy - timedelta(days=10), datetime.min.time()),
        }
        pago = SimpleNamespace(
            cuota_id=7,
            monto=100000.0,
            metodos=[SimpleNamespace(metodo_pago_id=3, monto=100000.0)],
            fecha=hoy + timedelta(days=1),
        )
        conn = FakeConn(FakeCursor(fetchone=[pago_actual]))

        with mock.patch.object(pago_service, "get_connection", return_value=conn):
            with self.assertRaises(HTTPException) as ctx:
                pago_service.editar_pago(1, pago, usuario_id=9)

        self.assertEqual(ctx.exception.detail, "La fecha del pago no puede ser futura")

    def test_fechas_validas_no_fallan(self):
        compra = datetime.combine(date.today() - timedelta(days=10), datetime.min.time())

        pago_service.validar_fecha_pago(None, compra)
        pago_service.validar_fecha_pago(date.today(), compra)
        pago_service.validar_fecha_pago(compra.date(), compra)


# ---------- Punto 2: editar_movimiento ----------

def movimiento_nuevo(**cambios):
    datos = dict(
        tipo="INGRESO",
        categoria_id=2,
        metodo_pago_id=1,
        moneda="PYG",
        monto=200.0,
        descripcion=None,
        tipo_cambio=None,
        fecha=None,
    )
    datos.update(cambios)
    return SimpleNamespace(**datos)


class EditarMovimientoTest(unittest.TestCase):
    def editar(self, cur, nuevo=None):
        conn = FakeConn(cur)
        with mock.patch.object(movimiento_service, "get_connection", return_value=conn):
            resultado = movimiento_service.editar_movimiento(
                10, nuevo or movimiento_nuevo(), usuario_id=9
            )
        return resultado, conn

    def test_transferencia_no_se_edita_y_no_revienta(self):
        # antes: NameError porque usaba movimiento_actual antes de definirla
        cur = FakeCursor(
            fetchone=[
                {"metodo_pago_id": 1, "tipo": "TRANSFERENCIA", "monto": Decimal("5")},
                {"es_de_tarjeta": 0},
            ]
        )
        (ok, mensaje), conn = self.editar(cur)

        self.assertFalse(ok)
        self.assertTrue(mensaje.startswith("Solo se pueden editar ingresos y egresos"))
        self.assertEqual(conn.commits, 0)

    def test_ajuste_no_se_edita(self):
        cur = FakeCursor(
            fetchone=[{"metodo_pago_id": 1, "tipo": "AJUSTE", "monto": Decimal("5")}]
        )
        (ok, mensaje), _ = self.editar(cur)

        self.assertFalse(ok)
        self.assertIn("ajustes", mensaje)

    def test_movimiento_inexistente(self):
        cur = FakeCursor(fetchone=[None])
        (ok, mensaje), _ = self.editar(cur)

        self.assertFalse(ok)
        self.assertEqual(mensaje, "Movimiento no encontrado")

    def test_no_se_puede_cambiar_a_un_tipo_que_no_es_ingreso_o_egreso(self):
        # no debe ni abrir conexión: se rechaza antes
        with mock.patch.object(
            movimiento_service, "get_connection", side_effect=AssertionError("no debía conectar")
        ):
            ok, mensaje = movimiento_service.editar_movimiento(
                10, movimiento_nuevo(tipo="TRANSFERENCIA"), usuario_id=9
            )

        self.assertFalse(ok)
        self.assertEqual(mensaje, "Tipo de movimiento no permitido")

    def test_edicion_normal_ajusta_saldo_y_confirma(self):
        cur = FakeCursor(
            fetchone=[
                {"metodo_pago_id": 1, "tipo": "INGRESO", "monto": Decimal("100")},  # actual
                {"es_de_tarjeta": 0},                                               # no es de tarjeta
                {"id": 2, "tipo": "INGRESO"},                                       # categoría
                {"id": 1, "tipo": "EFECTIVO", "moneda": "PYG"},                     # cuenta
                {"tipo": "EFECTIVO", "saldo": Decimal("0")},                        # actualizar_saldo
            ]
        )
        (ok, error), conn = self.editar(cur)

        self.assertTrue(ok)
        self.assertIsNone(error)
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

        # revierte el ingreso viejo (resta 100) y aplica el nuevo (suma 200)
        self.assertEqual(len(sqls(cur, "UPDATE metodo_pago SET saldo = saldo - %s")), 1)
        self.assertEqual(len(sqls(cur, "UPDATE metodo_pago SET saldo = saldo + %s")), 1)


# ---------- Punto 3: validaciones de modelos ----------

try:
    from pydantic import ValidationError
    from backend.models.ajuste import AjusteCrear
    from backend.models.movimiento import MovimientoCrear, MovimientoEditar
    from backend.models.pago import PagoCrear, PagoMetodo
    from backend.models.recurrente import RecurrenteCrear
    from backend.models.tarjeta_credito import TarjetaCreditoCrear
    HAY_PYDANTIC = True
except ImportError:
    HAY_PYDANTIC = False


@unittest.skipUnless(HAY_PYDANTIC, "pydantic no está instalado")
class ModelosTest(unittest.TestCase):
    def mov(self, **cambios):
        datos = dict(tipo="EGRESO", monto=100, moneda="PYG")
        datos.update(cambios)
        return datos

    # movimiento
    def test_movimiento_monto_cero_o_negativo(self):
        for monto in (0, -5):
            with self.assertRaises(ValidationError):
                MovimientoCrear(**self.mov(monto=monto))
            with self.assertRaises(ValidationError):
                MovimientoEditar(**self.mov(monto=monto))

    def test_movimiento_fecha_valida_se_convierte_a_date(self):
        m = MovimientoCrear(**self.mov(fecha="2026-10-18"))
        self.assertEqual(m.fecha, date(2026, 10, 18))

    def test_movimiento_fecha_inexistente(self):
        for fecha in ("2026-02-31", "ayer", "18/10/2026"):
            with self.assertRaises(ValidationError):
                MovimientoCrear(**self.mov(fecha=fecha))

    def test_movimiento_sin_fecha_sigue_valiendo(self):
        self.assertIsNone(MovimientoCrear(**self.mov()).fecha)

    def test_movimiento_tipo_cambio_debe_ser_positivo(self):
        with self.assertRaises(ValidationError):
            MovimientoCrear(**self.mov(tipo_cambio=0))

    def test_movimiento_moneda_invalida(self):
        with self.assertRaises(ValidationError):
            MovimientoCrear(**self.mov(moneda="XXX"))

    # pago
    def test_pago_monto_cero_o_negativo(self):
        for monto in (0, -1):
            with self.assertRaises(ValidationError):
                PagoCrear(cuota_id=1, monto=monto, metodos=[])

    def test_pago_metodo_monto_cero_o_negativo(self):
        for monto in (0, -1):
            with self.assertRaises(ValidationError):
                PagoMetodo(metodo_pago_id=1, monto=monto)

    def test_pago_valido(self):
        p = PagoCrear(
            cuota_id=1,
            monto=100,
            metodos=[{"metodo_pago_id": 1, "monto": 100}],
            fecha="2026-10-18",
        )
        self.assertEqual(p.fecha, date(2026, 10, 18))

    # ajuste
    def test_ajuste_monto_cero_o_negativo(self):
        for monto in (0, -10):
            with self.assertRaises(ValidationError):
                AjusteCrear(cuota_id=1, tipo="RECARGO", monto=monto)

    def test_ajuste_tipo_invalido(self):
        with self.assertRaises(ValidationError):
            AjusteCrear(cuota_id=1, tipo="OTRO", monto=10)

    def test_ajuste_todos_los_tipos_validos(self):
        for tipo in ("RECARGO", "INTERES", "COMISION", "DESCUENTO", "ADICIONAL"):
            AjusteCrear(cuota_id=1, tipo=tipo, monto=10)

    # tarjeta
    def test_tarjeta_moneda_invalida(self):
        with self.assertRaises(ValidationError):
            TarjetaCreditoCrear(
                nombre="Visa", moneda="XXX", limite_credito=1000,
                fecha_cierre=5, fecha_vencimiento=20,
            )

    # recurrente
    def test_recurrente_fecha_invalida(self):
        base = dict(
            categoria_id=1, metodo_pago_id=1, nombre="Alquiler",
            tipo="EGRESO", monto_base=100, moneda="PYG", frecuencia="MENSUAL",
        )
        with self.assertRaises(ValidationError):
            RecurrenteCrear(**base, proxima_fecha="no-es-fecha")

        r = RecurrenteCrear(**base, proxima_fecha="2026-11-10")
        self.assertEqual(r.proxima_fecha, date(2026, 11, 10))


if __name__ == "__main__":
    unittest.main()
