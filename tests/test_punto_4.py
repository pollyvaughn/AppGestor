# =========================================================
# Tests del punto 4 del roadmap
#   editar_tarjeta no debe cambiar la moneda de la tarjeta.
#
# Se corre desde la raíz del proyecto (con el .venv activado):
#   python -m unittest tests.test_punto_4 -v
#
# No usa la base real: reemplaza la conexión por un cursor falso que
# guarda las consultas SQL ejecutadas, así se comprueba qué hizo el código
# sin tocar MySQL.
# =========================================================

import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from backend.services import tarjeta_credito_service


# ---------- Conexión y cursor falsos ----------

class FakeCursor:
    # fetchone: respuestas en el orden en que el código las pide
    def __init__(self, fetchone=None):
        self.cola_one = list(fetchone or [])
        self.ejecutadas = []  # lista de (sql con espacios normalizados, params)
        self.rowcount = 0     # a propósito en 0: simula "guardado sin cambios"

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


def tarjeta_nueva(**cambios):
    datos = dict(
        nombre="Visa Itaú",
        moneda=None,
        limite_credito=5000000.0,
        fecha_cierre=25,
        fecha_vencimiento=10,
        porcentaje_pago_minimo=10.0,
    )
    datos.update(cambios)
    return SimpleNamespace(**datos)


# ---------- editar_tarjeta ----------

class EditarTarjetaMonedaTest(unittest.TestCase):
    def editar(self, cur, tarjeta):
        conn = FakeConn(cur)
        with mock.patch.object(
            tarjeta_credito_service, "get_connection", return_value=conn
        ):
            resultado = tarjeta_credito_service.editar_tarjeta(
                1, tarjeta, usuario_id=9
            )
        return resultado, conn

    def test_cambiar_la_moneda_se_rechaza_y_no_toca_nada(self):
        cur = FakeCursor(fetchone=[{"moneda": "PYG"}])
        conn = FakeConn(cur)

        with mock.patch.object(
            tarjeta_credito_service, "get_connection", return_value=conn
        ):
            with self.assertRaises(ValueError) as ctx:
                tarjeta_credito_service.editar_tarjeta(
                    1, tarjeta_nueva(moneda="USD"), usuario_id=9
                )

        self.assertIn("moneda", str(ctx.exception))
        # nunca se llegó al UPDATE, no hubo commit y se hizo rollback
        self.assertEqual(len(sqls(cur, "UPDATE")), 0)
        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_misma_moneda_edita_normal(self):
        cur = FakeCursor(fetchone=[{"moneda": "PYG"}])
        resultado, conn = self.editar(cur, tarjeta_nueva(moneda="PYG"))

        self.assertEqual(resultado, 1)
        self.assertEqual(len(sqls(cur, "UPDATE")), 1)
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_sin_moneda_edita_normal(self):
        # el modelo permite no mandar la moneda (None)
        cur = FakeCursor(fetchone=[{"moneda": "USD"}])
        resultado, conn = self.editar(cur, tarjeta_nueva(moneda=None))

        self.assertEqual(resultado, 1)
        self.assertEqual(conn.commits, 1)

    def test_el_update_ya_no_incluye_la_moneda(self):
        cur = FakeCursor(fetchone=[{"moneda": "PYG"}])
        self.editar(cur, tarjeta_nueva(moneda="PYG"))

        sql, params = sqls(cur, "UPDATE")[0]

        self.assertNotIn("moneda", sql)
        # 7 parámetros: nombre, límite, cierre, vencimiento, % mínimo,
        # id de la tarjeta y id del usuario (la moneda ya no viaja)
        self.assertEqual(len(params), 7)
        self.assertNotIn("PYG", params)
        self.assertEqual(params[0], "Visa Itaú")
        self.assertEqual(params[-2:], (1, 9))

    def test_tarjeta_inexistente_o_de_otro_usuario_devuelve_0(self):
        cur = FakeCursor(fetchone=[None])
        resultado, conn = self.editar(cur, tarjeta_nueva(moneda="USD"))

        # 0 = la ruta responde 404; ni siquiera se compara la moneda
        self.assertEqual(resultado, 0)
        self.assertEqual(len(sqls(cur, "UPDATE")), 0)
        self.assertEqual(conn.commits, 0)

    def test_guardado_sin_cambios_no_se_confunde_con_no_encontrada(self):
        # rowcount queda en 0 (MySQL a veces lo da cuando no cambió nada)
        cur = FakeCursor(fetchone=[{"moneda": "PYG"}])
        resultado, _ = self.editar(cur, tarjeta_nueva(moneda="PYG"))

        self.assertEqual(cur.rowcount, 0)
        self.assertEqual(resultado, 1)

    def test_bloquea_la_fila_antes_de_comparar(self):
        cur = FakeCursor(fetchone=[{"moneda": "PYG"}])
        self.editar(cur, tarjeta_nueva(moneda="PYG"))

        select = sqls(cur, "SELECT")[0][0]
        self.assertTrue(select.endswith("FOR UPDATE"))
        self.assertIn("tc.estado != 'DADA_DE_BAJA'", select)


# ---------- Modelo (necesita pydantic: corre en tu entorno) ----------

try:
    from pydantic import ValidationError
    from backend.models.tarjeta_credito import TarjetaCreditoEditar
    HAY_PYDANTIC = True
except ImportError:
    HAY_PYDANTIC = False


@unittest.skipUnless(HAY_PYDANTIC, "pydantic no está instalado")
class ModeloEditarTarjetaTest(unittest.TestCase):
    base = dict(
        nombre="Visa",
        limite_credito=1000,
        fecha_cierre=5,
        fecha_vencimiento=20,
    )

    def test_la_moneda_es_opcional(self):
        t = TarjetaCreditoEditar(**self.base)
        self.assertIsNone(t.moneda)

    def test_acepta_una_moneda_valida(self):
        t = TarjetaCreditoEditar(**self.base, moneda="USD")
        self.assertEqual(t.moneda, "USD")

    def test_sigue_rechazando_una_moneda_inventada(self):
        with self.assertRaises(ValidationError):
            TarjetaCreditoEditar(**self.base, moneda="XXX")


if __name__ == "__main__":
    unittest.main()
