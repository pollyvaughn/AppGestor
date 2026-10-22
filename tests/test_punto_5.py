# =========================================================
# Tests del punto 5 del roadmap
#   - crear_ajuste recibe cuota_id como parámetro (ya no sale del body)
#   - AjusteCrear ya no tiene cuota_id
#   - compras_tarjeta.py ya no tiene rutas de ajustes (viven en /ajustes)
#
# Se corre desde la raíz del proyecto (con el .venv activado):
#   python -m unittest tests.test_punto_5 -v
#
# No usa la base real: reemplaza la conexión por un cursor falso que
# guarda las consultas SQL ejecutadas.
# =========================================================

import ast
import unittest
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from backend.services import ajuste_service

RAIZ = Path(__file__).resolve().parent.parent


# ---------- Conexión y cursor falsos ----------

class FakeCursor:
    def __init__(self, fetchone=None):
        self.cola_one = list(fetchone or [])
        self.ejecutadas = []  # lista de (sql con espacios normalizados, params)
        self.lastrowid = 77
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


# El ajuste ya NO tiene cuota_id (igual que el modelo nuevo):
# si el servicio todavía lo leyera, daría AttributeError.
def ajuste_nuevo(**cambios):
    datos = dict(tipo="RECARGO", monto=15000.0, descripcion="Mora")
    datos.update(cambios)
    return SimpleNamespace(**datos)


def cuota_fila(estado="PENDIENTE"):
    return {
        "id": 7,
        "monto_base": Decimal("150000"),
        "estado": estado,
        "moneda": "PYG",
    }


# ---------- crear_ajuste ----------

class CrearAjusteTest(unittest.TestCase):
    def crear(self, cur, ajuste=None, cuota_id=7):
        conn = FakeConn(cur)
        with mock.patch.object(ajuste_service, "get_connection", return_value=conn):
            resultado = ajuste_service.crear_ajuste(
                cuota_id, ajuste or ajuste_nuevo(), usuario_id=9
            )
        return resultado, conn

    def cursor_ok(self, total_ajustes="15000", total_pagado="0"):
        return FakeCursor(
            fetchone=[
                cuota_fila(),                                   # la cuota
                {"total_ajustes": Decimal(total_ajustes)},      # suma de ajustes activos
                {"total_pagado": Decimal(total_pagado)},        # pagos confirmados
            ]
        )

    def test_usa_el_cuota_id_del_parametro_en_todas_las_consultas(self):
        cur = self.cursor_ok()
        resultado, conn = self.crear(cur, cuota_id=7)

        # SELECT de la cuota: (cuota_id, usuario_id)
        self.assertEqual(sqls(cur, "SELECT c.id")[0][1], (7, 9))

        # INSERT del ajuste: la cuota va primero
        insert = sqls(cur, "INSERT INTO ajuste")[0]
        self.assertEqual(insert[1][0], 7)
        self.assertEqual(insert[1][1], "RECARGO")

        # UPDATE de la cuota: el id va al final
        update = sqls(cur, "UPDATE cuota")[0]
        self.assertEqual(update[1][-1], 7)

        self.assertEqual(resultado["cuota_id"], 7)
        self.assertEqual(conn.commits, 1)
        self.assertEqual(conn.rollbacks, 0)

    def test_recalcula_total_y_pendiente(self):
        cur = self.cursor_ok(total_ajustes="15000", total_pagado="0")
        resultado, _ = self.crear(cur)

        # 150.000 de base + 15.000 de ajustes, sin pagos
        self.assertEqual(resultado["total_cuota"], Decimal("165000"))
        self.assertEqual(resultado["monto_pendiente"], Decimal("165000"))
        self.assertEqual(resultado["estado"], "PENDIENTE")
        self.assertEqual(resultado["id"], 77)

    def test_con_pagos_previos_queda_parcial(self):
        cur = self.cursor_ok(total_ajustes="15000", total_pagado="100000")
        resultado, _ = self.crear(cur)

        self.assertEqual(resultado["monto_pendiente"], Decimal("65000"))
        self.assertEqual(resultado["estado"], "PARCIAL")

    def test_cuota_inexistente_o_de_otro_usuario(self):
        cur = FakeCursor(fetchone=[None])
        conn = FakeConn(cur)

        with mock.patch.object(ajuste_service, "get_connection", return_value=conn):
            with self.assertRaises(ValueError) as ctx:
                ajuste_service.crear_ajuste(7, ajuste_nuevo(), usuario_id=9)

        self.assertEqual(str(ctx.exception), "Cuota no encontrada")
        self.assertEqual(len(sqls(cur, "INSERT")), 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_cuota_omitida_no_acepta_ajustes(self):
        cur = FakeCursor(fetchone=[cuota_fila(estado="OMITIDA")])
        conn = FakeConn(cur)

        with mock.patch.object(ajuste_service, "get_connection", return_value=conn):
            with self.assertRaises(ValueError):
                ajuste_service.crear_ajuste(7, ajuste_nuevo(), usuario_id=9)

        self.assertEqual(len(sqls(cur, "INSERT")), 0)
        self.assertEqual(conn.rollbacks, 1)

    def test_descuento_que_deja_la_cuota_en_cero_se_rechaza(self):
        # los ajustes activos suman -150.000 contra una base de 150.000
        cur = self.cursor_ok(total_ajustes="-150000")
        conn = FakeConn(cur)

        with mock.patch.object(ajuste_service, "get_connection", return_value=conn):
            with self.assertRaises(ValueError):
                ajuste_service.crear_ajuste(
                    7, ajuste_nuevo(tipo="DESCUENTO", monto=150000.0), usuario_id=9
                )

        self.assertEqual(conn.commits, 0)
        self.assertEqual(conn.rollbacks, 1)


# ---------- Rutas: se leen con ast, no necesitan FastAPI ----------

METODOS_HTTP = ("get", "post", "put", "delete", "patch")


def rutas_de(archivo):
    # devuelve [(metodo, ruta)] de los decoradores @router.get("/algo")...
    arbol = ast.parse((RAIZ / archivo).read_text(encoding="utf-8"))
    rutas = []

    for nodo in ast.walk(arbol):
        if not isinstance(nodo, ast.FunctionDef):
            continue

        for deco in nodo.decorator_list:
            if (
                isinstance(deco, ast.Call)
                and isinstance(deco.func, ast.Attribute)
                and deco.func.attr in METODOS_HTTP
                and deco.args
                and isinstance(deco.args[0], ast.Constant)
            ):
                rutas.append((deco.func.attr, deco.args[0].value))

    return rutas


class RutasDeAjustesTest(unittest.TestCase):
    def test_compras_tarjeta_no_tiene_rutas_de_ajustes(self):
        rutas = rutas_de("backend/routes/compras_tarjeta.py")

        self.assertGreater(len(rutas), 0)  # el archivo se leyó bien
        for metodo, ruta in rutas:
            self.assertNotIn("ajuste", ruta, f"{metodo.upper()} {ruta}")

    def test_compras_tarjeta_conserva_sus_rutas(self):
        rutas = rutas_de("backend/routes/compras_tarjeta.py")

        self.assertCountEqual(
            rutas,
            [
                ("post", "/"),
                ("get", "/"),
                ("get", "/{compra_id}/cuotas"),
                ("put", "/{compra_id}"),
                ("delete", "/{compra_id}"),
            ],
        )

    def test_compras_tarjeta_ya_no_importa_nada_de_ajustes(self):
        arbol = ast.parse(
            (RAIZ / "backend/routes/compras_tarjeta.py").read_text(encoding="utf-8")
        )

        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.ImportFrom):
                self.assertNotIn("ajuste", nodo.module or "")
                for alias in nodo.names:
                    self.assertNotIn("juste", alias.name)

    def test_ajustes_conserva_sus_tres_rutas(self):
        rutas = rutas_de("backend/routes/ajustes.py")

        self.assertCountEqual(
            rutas,
            [
                ("post", "/cuota/{cuota_id}"),
                ("get", "/cuota/{cuota_id}"),
                ("delete", "/{ajuste_id}"),
            ],
        )

    def test_la_ruta_ya_no_pisa_ajuste_cuota_id(self):
        arbol = ast.parse(
            (RAIZ / "backend/routes/ajustes.py").read_text(encoding="utf-8")
        )

        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Assign):
                for destino in nodo.targets:
                    self.assertFalse(
                        isinstance(destino, ast.Attribute)
                        and destino.attr == "cuota_id",
                        "la ruta no debe asignar ajuste.cuota_id",
                    )


# ---------- Modelo y app (corren en tu entorno, con todo instalado) ----------

try:
    from pydantic import ValidationError
    from backend.models.ajuste import AjusteCrear
    HAY_PYDANTIC = True
except ImportError:
    HAY_PYDANTIC = False

try:
    from backend.app import app as app_fastapi
    HAY_APP = True
except Exception:
    HAY_APP = False


@unittest.skipUnless(HAY_PYDANTIC, "pydantic no está instalado")
class ModeloAjusteTest(unittest.TestCase):
    def test_ya_no_tiene_cuota_id(self):
        self.assertEqual(
            set(AjusteCrear.model_fields), {"tipo", "monto", "descripcion"}
        )

    def test_body_sin_cuota_id_es_valido(self):
        a = AjusteCrear(tipo="RECARGO", monto=10)
        self.assertEqual(a.tipo, "RECARGO")
        self.assertIsNone(a.descripcion)

    def test_un_cuota_id_viejo_en_el_body_se_ignora(self):
        a = AjusteCrear(cuota_id=999, tipo="RECARGO", monto=10)
        self.assertFalse(hasattr(a, "cuota_id"))

    def test_siguen_las_validaciones(self):
        for monto in (0, -10):
            with self.assertRaises(ValidationError):
                AjusteCrear(tipo="RECARGO", monto=monto)

        with self.assertRaises(ValidationError):
            AjusteCrear(tipo="OTRO", monto=10)

        for tipo in ("RECARGO", "INTERES", "COMISION", "DESCUENTO", "ADICIONAL"):
            AjusteCrear(tipo=tipo, monto=10)


@unittest.skipUnless(HAY_APP, "no se pudo importar backend.app")
class RutasDeLaAppTest(unittest.TestCase):
    def paths(self):
        # openapi() lista todas las rutas de la app sin importar cómo las
        # guarde FastAPI por dentro. app.routes no sirve: según la versión,
        # las rutas de los routers no aparecen ahí con el atributo "path".
        return set(app_fastapi.openapi()["paths"])

    def test_control_la_lista_de_rutas_no_esta_vacia(self):
        # si esto falla, los otros dos tests no estarían probando nada
        paths = self.paths()

        self.assertIn("/compras-tarjeta/", paths)
        self.assertIn("/compras-tarjeta/{compra_id}/cuotas", paths)

    def test_la_app_no_expone_las_rutas_duplicadas(self):
        paths = self.paths()

        self.assertNotIn("/compras-tarjeta/cuota/{cuota_id}/ajustes", paths)
        self.assertNotIn("/compras-tarjeta/ajuste/{ajuste_id}", paths)

    def test_la_app_expone_las_rutas_de_ajustes(self):
        paths = self.paths()

        self.assertIn("/ajustes/cuota/{cuota_id}", paths)
        self.assertIn("/ajustes/{ajuste_id}", paths)


if __name__ == "__main__":
    unittest.main()