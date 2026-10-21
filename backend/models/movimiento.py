# =========================================================
# Modelos de movimientos (lo que valida FastAPI antes de llegar al servicio)
# gt=0  -> "greater than 0": estrictamente mayor a cero
# date  -> fecha real "AAAA-MM-DD"; si no existe (ej. 2026-02-31) devuelve 422
# =========================================================

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class MovimientoCrear(BaseModel):
    categoria_id: int | None = None
    metodo_pago_id: int | None = None
    tipo: Literal[
        "INGRESO",
        "EGRESO",
        "TRANSFERENCIA",
        "PAGO_TARJETA",
        "AJUSTE"
    ]
    descripcion: str | None = None
    monto: float = Field(gt=0)
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    # el esquema de la base ya exige tipo_cambio > 0 (CHECK): se valida acá también
    tipo_cambio: float | None = Field(default=None, gt=0)
    fecha: date | None = None


class MovimientoEditar(BaseModel):
    categoria_id: int | None = None
    metodo_pago_id: int | None = None
    tipo: Literal[
        "INGRESO",
        "EGRESO",
        "TRANSFERENCIA",
        "PAGO_TARJETA",
        "AJUSTE"
    ]
    descripcion: str | None = None
    monto: float = Field(gt=0)
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    tipo_cambio: float | None = Field(default=None, gt=0)
    fecha: date | None = None


class TransferenciaCrear(BaseModel):
    origen_id: int
    destino_id: int
    monto: float = Field(gt=0)
    fecha: date | None = None
    descripcion: str | None = None