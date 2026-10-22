# =========================================================
# Tests del punto 6 del roadmap: pasada de pruebas malas
#   - fecha futura en crear/editar movimiento
#   - anular una transferencia, anular otra vez, y volver a cargarla
#     (los saldos tienen que cerrar siempre)
#   - sobregiro: se permite (el front avisa), el saldo queda negativo
#   - anular_periodo recibe date (la ruta se lee con ast)
#   - modelos: nombres vacíos, montos gigantes/NaN/infinito, contraseña
#     corta, lista de métodos vacía, tope de cuotas
#
# Se corre desde la raíz del proyecto (con el .venv activado):
#   python -m unittest tests.test_punto_6 -v
#
# Los tests de servicio no usan la base real: un "banco falso" hace de
# conexión y cursor y lleva los saldos de verdad, así se comprueba que
# anular devuelve la plata exacta. Los de modelo necesitan pydantic.
# =========================================================

import ast
import unittest
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from backend.services import movimiento_service

RAIZ = Path(__file__).resolve().parent.parent


# ---------- Banco falso: conexión + cursor con saldos reales ----------

class BancoFalso:
    def __init__(self, saldos):
        # id de cuenta -> saldo (Decimal, como en DECIMAL(15,2))
        self.saldos = {k: Decimal(str(v)) for k, v in saldos.items()}
        self.movimientos = {}
        self.sqls = []
        self.proximo_id = 100
        self.lastrowid = 0
        self.rowcount = 0
        self.commits = 0
        self.rollbacks = 0
        self._resultado = None

    # --- conexión ---
    def cursor(self, dictionary=False):
        return self

    def start_transaction(self):
        pass

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass

    # --- cursor ---
    def execute(self, sql, params=None):
        sql = " ".join(sql.split())
        self.sqls.append(sql)
        self._resultado = None
        self.rowcount = 0

        if sql.startswith("SELECT id, tipo, moneda FROM metodo_pago"):
            if params[0] in self.saldos:
                self._resultado = {
                    "id": params[0], "tipo": "EFECTIVO", "moneda": "PYG"
                }

        elif sql.startswith("SELECT tipo, saldo FROM metodo_pago"):
            self._resultado = {
                "tipo": "EFECTIVO", "saldo": self.saldos[params[0]]
            }

        elif sql.startswith("UPDATE metodo_pago SET saldo = saldo + %s"):
            self.saldos[params[1]] += Decimal(str(params[0]))

        elif sql.startswith("UPDATE metodo_pago SET saldo = saldo - %s"):
            self.saldos[params[1]] -= Decimal(str(params[0]))

        elif sql.startswith("INSERT INTO movimiento") and "'TRANSFERENCIA'" in sql:
            _, origen, destino, _, monto, _, _ = params
            self.proximo_id += 1
            self.lastrowid = self.proximo_id
            self.movimientos[self.lastrowid] = {
                "metodo_pago_id": origen,
                "metodo_pago_destino_id": destino,
                "tipo": "TRANSFERENCIA",
                "monto": Decimal(str(monto)),
                "estado": "CONFIRMADO",
            }

        elif sql.startswith("SELECT metodo_pago_id, metodo_pago_destino_id, tipo, monto FROM movimiento"):
            mov = self.movimientos.get(params[0])
            if mov and mov["estado"] != "ANULADO":
                self._resultado = mov

        elif sql.startswith("SELECT EXISTS"):
            self._resultado = {"es_de_tarjeta": 0}

        elif sql.startswith("UPDATE movimiento SET estado = 'ANULADO'"):
            mov = self.movimientos.get(params[0])
            if mov and mov["estado"] != "ANULADO":
                mov["estado"] = "ANULADO"
                self.rowcount = 1

        else:
            raise AssertionError(f"SQL no previsto en el test: {sql}")

    def fetchone(self):
        return self._resultado


def transferencia(origen, destino, monto, fecha=None):
    return SimpleNamespace(
        origen_id=origen,
        destino_id=destino,
        monto=monto,
        fecha=fecha,
        descripcion=None,
    )


class TransferenciaTest(unittest.TestCase):
    def setUp(self):
        self.banco = BancoFalso({1: 1000, 2: 500})
        patcher = mock.patch.object(
            movimiento_service, "get_connection", return_value=self.banco
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def transferir(self, origen=1, destino=2, monto=300.0):
        return movimiento_service.crear_transferencia(
            transferencia(origen, destino, monto), usuario_id=9
        )

    def saldos(self):
        return (self.banco.saldos[1], self.banco.saldos[2])

    def test_transferir_mueve_la_plata(self):
        self.transferir()
        self.assertEqual(self.saldos(), (Decimal("700"), Decimal("800")))

    def test_anular_devuelve_la_plata_exacta(self):
        mov_id = self.transferir()

        resultado = movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)

        self.assertEqual(resultado, 1)
        self.assertEqual(self.saldos(), (Decimal("1000"), Decimal("500")))
        self.assertEqual(self.banco.movimientos[mov_id]["estado"], "ANULADO")

    def test_anular_dos_veces_no_devuelve_la_plata_dos_veces(self):
        mov_id = self.transferir()
        movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)

        segunda = movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)

        self.assertEqual(segunda, 0)  # la ruta lo convierte en 404
        self.assertEqual(self.saldos(), (Decimal("1000"), Decimal("500")))

    def test_anular_y_volver_a_cargar(self):
        mov_id = self.transferir()
        movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)

        nuevo_id = self.transferir()

        self.assertNotEqual(nuevo_id, mov_id)
        self.assertEqual(self.saldos(), (Decimal("700"), Decimal("800")))
        self.assertEqual(self.banco.movimientos[nuevo_id]["estado"], "CONFIRMADO")
        # la anulada sigue anulada: no resucita
        self.assertEqual(self.banco.movimientos[mov_id]["estado"], "ANULADO")

    def test_anular_bloquea_la_fila_con_for_update(self):
        mov_id = self.transferir()
        movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)

        selects = [
            s for s in self.banco.sqls
            if s.startswith("SELECT metodo_pago_id, metodo_pago_destino_id")
        ]
        self.assertEqual(len(selects), 1)
        self.assertTrue(selects[0].endswith("FOR UPDATE"))

    def test_sobregiro_se_permite_y_se_revierte(self):
        # el front avisa antes; el backend deja que el saldo quede negativo
        mov_id = self.transferir(monto=1300.0)
        self.assertEqual(self.saldos(), (Decimal("-300"), Decimal("1800")))

        movimiento_service.eliminar_movimiento(mov_id, usuario_id=9)
        self.assertEqual(self.saldos(), (Decimal("1000"), Decimal("500")))

    def test_transferencia_con_fecha_futura(self):
        manana = date.today() + timedelta(days=1)

        with self.assertRaises(ValueError):
            movimiento_service.crear_transferencia(
                transferencia(1, 2, 10.0, fecha=manana), usuario_id=9
            )

        self.assertEqual(self.saldos(), (Decimal("1000"), Decimal("500")))

    def test_misma_cuenta_de_origen_y_destino(self):
        with self.assertRaises(ValueError):
            self.transferir(origen=1, destino=1)

    def test_anular_movimiento_inexistente_devuelve_0(self):
        self.assertEqual(
            movimiento_service.eliminar_movimiento(12345, usuario_id=9), 0
        )


# ---------- Fecha futura en ingresos y egresos ----------

class FakeCursor:
    def __init__(self, fetchone=None):
        self.cola_one = list(fetchone or [])
        self.ejecutadas = []
        self.lastrowid = 55
        self.rowcount = 1

    def execute(self, sql, params=None):
        self.ejecutadas.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.cola_one.pop(0)

    def close(self):
        pass


class FakeConn:
    def __init__(self, cursor):
        self.cur = cursor
        self.commits = 0
        self.rollbacks = 0

    def cursor(self, dictionary=False):
        return self.cur

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass


def movimiento_nuevo(**cambios):
    datos = dict(
        tipo="EGRESO",
        categoria_id=2,
        metodo_pago_id=1,
        moneda="PYG",
        monto=10.0,
        descripcion=None,
        tipo_cambio=None,
        fecha=None,
    )
    datos.update(cambios)
    return SimpleNamespace(**datos)


def sin_conexion():
    return mock.patch.object(
        movimiento_service,
        "get_connection",
        side_effect=AssertionError("no debía abrir conexión"),
    )


class FechaFuturaTest(unittest.TestCase):
    manana = date.today() + timedelta(days=1)

    def test_crear_con_fecha_futura_se_rechaza_antes_de_conectar(self):
        with sin_conexion():
            id_, error = movimiento_service.crear_movimiento(
                movimiento_nuevo(fecha=self.manana), usuario_id=9
            )

        self.assertIsNone(id_)
        self.assertEqual(error, "La fecha del movimiento no puede ser futura")

    def test_editar_con_fecha_futura_se_rechaza_antes_de_conectar(self):
        with sin_conexion():
            ok, error = movimiento_service.editar_movimiento(
                10, movimiento_nuevo(fecha=self.manana), usuario_id=9
            )

        self.assertFalse(ok)
        self.assertEqual(error, "La fecha del movimiento no puede ser futura")

    def crear_con(self, fecha):
        cur = FakeCursor(
            fetchone=[
                {"id": 2, "tipo": "EGRESO"},                             # categoría
                {"id": 1, "tipo": "EFECTIVO", "moneda": "PYG"},          # cuenta
                {"tipo": "EFECTIVO", "saldo": Decimal("1000")},          # actualizar_saldo
            ]
        )
        conn = FakeConn(cur)
        with mock.patch.object(
            movimiento_service, "get_connection", return_value=conn
        ):
            resultado = movimiento_service.crear_movimiento(
                movimiento_nuevo(fecha=fecha), usuario_id=9
            )
        return resultado, conn

    def test_hoy_ayer_y_sin_fecha_siguen_permitidos(self):
        for fecha in (date.today(), date.today() - timedelta(days=1), None):
            (id_, error), conn = self.crear_con(fecha)
            self.assertEqual(id_, 55, fecha)
            self.assertIsNone(error)
            self.assertEqual(conn.commits, 1)


# ---------- Ruta: anular_periodo recibe date (se lee con ast) ----------

class RutaAnularPeriodoTest(unittest.TestCase):
    def test_periodo_es_date(self):
        arbol = ast.parse(
            (RAIZ / "backend/routes/recurrentes.py").read_text(encoding="utf-8")
        )

        funcion = next(
            n for n in ast.walk(arbol)
            if isinstance(n, ast.FunctionDef) and n.name == "anular_periodo"
        )

        # "usuario" no tiene anotación (usa Depends): se saltea
        anotaciones = {
            a.arg: ast.unparse(a.annotation)
            for a in funcion.args.args
            if a.annotation is not None
        }

        self.assertEqual(anotaciones["periodo"], "date")


# ---------- Modelos (necesitan pydantic: corren en tu entorno) ----------

try:
    from pydantic import ValidationError
    from backend.models.ajuste import AjusteCrear
    from backend.models.categoria import CategoriaCrear
    from backend.models.compra_tarjeta import CompraTarjetaCrear
    from backend.models.metodo_pago import AjusteSaldo, MetodoPagoCrear
    from backend.models.movimiento import MovimientoCrear, TransferenciaCrear
    from backend.models.pago import PagoCrear, PagoMetodo
    from backend.models.presupuesto import PresupuestoGuardar
    from backend.models.recurrente import RecurrenteCrear
    from backend.models.resumen import ResumenPagar
    from backend.models.tarjeta_credito import TarjetaCreditoCrear
    from backend.models.tipos import MONTO_MAXIMO
    from backend.models.usuario import UsuarioCrear
    HAY_PYDANTIC = True
except ImportError:
    HAY_PYDANTIC = False


@unittest.skipUnless(HAY_PYDANTIC, "pydantic no está instalado")
class ModelosPunto6Test(unittest.TestCase):
    def mov(self, **cambios):
        datos = dict(tipo="EGRESO", monto=100, moneda="PYG")
        datos.update(cambios)
        return datos

    # --- nombres vacíos o de puros espacios ---
    def test_nombre_de_pura_espacios_se_rechaza(self):
        with self.assertRaises(ValidationError):
            CategoriaCrear(nombre="   ", tipo="EGRESO")

        with self.assertRaises(ValidationError):
            CategoriaCrear(nombre="", tipo="EGRESO")

    def test_nombre_se_recorta(self):
        self.assertEqual(
            CategoriaCrear(nombre="  Comida  ", tipo="EGRESO").nombre, "Comida"
        )

    def test_nombre_de_mas_de_100_caracteres_se_rechaza(self):
        with self.assertRaises(ValidationError):
            CategoriaCrear(nombre="a" * 101, tipo="EGRESO")

        CategoriaCrear(nombre="a" * 100, tipo="EGRESO")

    def test_tarjeta_y_recurrente_sin_nombre(self):
        with self.assertRaises(ValidationError):
            TarjetaCreditoCrear(
                nombre=" ", moneda="PYG", limite_credito=1000,
                fecha_cierre=5, fecha_vencimiento=20,
            )

        with self.assertRaises(ValidationError):
            RecurrenteCrear(
                categoria_id=1, metodo_pago_id=1, nombre=" ", tipo="EGRESO",
                monto_base=100, moneda="PYG", frecuencia="MENSUAL",
            )

    # --- montos ---
    def test_monto_maximo(self):
        MovimientoCrear(**self.mov(monto=MONTO_MAXIMO))

        with self.assertRaises(ValidationError):
            MovimientoCrear(**self.mov(monto=MONTO_MAXIMO + 1))

    def test_monto_infinito_o_nan(self):
        for monto in (float("inf"), float("nan")):
            with self.assertRaises(ValidationError):
                MovimientoCrear(**self.mov(monto=monto))

    def test_tope_en_todos_los_modelos_con_monto(self):
        grande = MONTO_MAXIMO + 1

        with self.assertRaises(ValidationError):
            TransferenciaCrear(origen_id=1, destino_id=2, monto=grande)

        with self.assertRaises(ValidationError):
            PagoMetodo(metodo_pago_id=1, monto=grande)

        with self.assertRaises(ValidationError):
            AjusteCrear(tipo="RECARGO", monto=grande)

        with self.assertRaises(ValidationError):
            PresupuestoGuardar(tope_mensual=grande)

        with self.assertRaises(ValidationError):
            ResumenPagar(
                monto=grande, metodos=[{"metodo_pago_id": 1, "monto": 1}]
            )

        with self.assertRaises(ValidationError):
            TarjetaCreditoCrear(
                nombre="Visa", moneda="PYG", limite_credito=grande,
                fecha_cierre=5, fecha_vencimiento=20,
            )

    def test_saldo_de_cuenta(self):
        base = dict(tipo="EFECTIVO", nombre="Caja", moneda="PYG")

        MetodoPagoCrear(**base, saldo=MONTO_MAXIMO)

        for saldo in (-1, MONTO_MAXIMO + 1, float("inf")):
            with self.assertRaises(ValidationError):
                MetodoPagoCrear(**base, saldo=saldo)

    def test_ajuste_de_saldo_admite_negativo_pero_con_tope(self):
        self.assertEqual(AjusteSaldo(saldo_real=-500).saldo_real, -500)

        for saldo in (MONTO_MAXIMO + 1, -MONTO_MAXIMO - 1, float("nan")):
            with self.assertRaises(ValidationError):
                AjusteSaldo(saldo_real=saldo)

    # --- cuotas ---
    def test_cantidad_de_cuotas(self):
        base = dict(tarjeta_id=1, monto=1000, categoria_id=1)

        CompraTarjetaCrear(**base, cantidad_cuotas=120)

        for cuotas in (0, -1, 121):
            with self.assertRaises(ValidationError):
                CompraTarjetaCrear(**base, cantidad_cuotas=cuotas)

    # --- listas vacías ---
    def test_pago_sin_metodos_se_rechaza(self):
        with self.assertRaises(ValidationError):
            PagoCrear(cuota_id=1, monto=100, metodos=[])

        PagoCrear(
            cuota_id=1, monto=100,
            metodos=[{"metodo_pago_id": 1, "monto": 100}],
        )

    # --- usuario ---
    def test_password_corta_o_vacia(self):
        for password in ("", "1234567"):
            with self.assertRaises(ValidationError):
                UsuarioCrear(
                    nombre="Ana", email="ana@correo.com", password=password
                )

        UsuarioCrear(nombre="Ana", email="ana@correo.com", password="Demo123!")

    def test_usuario_sin_nombre_o_con_email_malo(self):
        with self.assertRaises(ValidationError):
            UsuarioCrear(nombre="  ", email="ana@correo.com", password="Demo123!")

        with self.assertRaises(ValidationError):
            UsuarioCrear(nombre="Ana", email="no-es-email", password="Demo123!")

    # --- descripción ---
    def test_descripcion_de_mas_de_255_caracteres(self):
        with self.assertRaises(ValidationError):
            MovimientoCrear(**self.mov(descripcion="a" * 256))

        MovimientoCrear(**self.mov(descripcion="a" * 255))


if __name__ == "__main__":
    unittest.main()
