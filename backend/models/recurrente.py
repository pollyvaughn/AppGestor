# =========================================================
# Modelos de movimientos recurrentes
# proxima_fecha: date -> fecha real "AAAA-MM-DD" (antes era str sin validar)
# =========================================================

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class RecurrenteCrear(BaseModel):
    categoria_id: int
    metodo_pago_id: int
    nombre: str
    tipo: Literal["INGRESO", "EGRESO"]
    monto_base: float = Field(gt=0)
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
    nombre: str
    tipo: Literal["INGRESO", "EGRESO"]
    monto_base: float = Field(gt=0)
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