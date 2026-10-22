# =========================================================
# Modelos de movimientos recurrentes
# nombre     -> sin espacios en los bordes, 1 a 150 caracteres
# monto_base -> mayor a 0 y con tope (ver tipos.py)
# proxima_fecha: date -> fecha real "AAAA-MM-DD"
# =========================================================

from datetime import date
from typing import Literal

from pydantic import BaseModel

from backend.models.tipos import Monto, NombreLargo


class RecurrenteCrear(BaseModel):
    categoria_id: int
    metodo_pago_id: int
    nombre: NombreLargo
    tipo: Literal["INGRESO", "EGRESO"]
    monto_base: Monto
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    frecuencia: Literal[
        "DIARIA",
        "SEMANAL",
        "QUINCENAL",
        "MENSUAL",
        "BIMESTRAL",
        "TRIMESTRAL",
        "SEMESTRAL",
        "ANUAL"
    ]
    proxima_fecha: date | None = None


class RecurrenteEditar(BaseModel):
    categoria_id: int
    metodo_pago_id: int
    nombre: NombreLargo
    tipo: Literal["INGRESO", "EGRESO"]
    monto_base: Monto
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    frecuencia: Literal[
        "DIARIA",
        "SEMANAL",
        "QUINCENAL",
        "MENSUAL",
        "BIMESTRAL",
        "TRIMESTRAL",
        "SEMESTRAL",
        "ANUAL"
    ]
    proxima_fecha: date | None = None