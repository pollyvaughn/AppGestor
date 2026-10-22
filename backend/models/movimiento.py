# =========================================================
# Modelos de movimientos (lo que valida FastAPI antes de llegar al servicio)
# Monto -> mayor a 0 y con tope máximo (ver tipos.py)
# date  -> fecha real "AAAA-MM-DD"; si no existe (ej. 2026-02-31) devuelve 422
# La fecha FUTURA no se valida acá sino en el servicio (depende de "hoy").
# =========================================================

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from backend.models.tipos import Descripcion, Monto


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
    descripcion: Descripcion | None = None
    monto: Monto
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    # el esquema de la base ya exige tipo_cambio > 0 (CHECK): se valida acá también
    tipo_cambio: float | None = Field(default=None, gt=0, allow_inf_nan=False)
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
    descripcion: Descripcion | None = None
    monto: Monto
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    tipo_cambio: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    fecha: date | None = None


class TransferenciaCrear(BaseModel):
    origen_id: int
    destino_id: int
    monto: Monto
    fecha: date | None = None
    descripcion: Descripcion | None = None