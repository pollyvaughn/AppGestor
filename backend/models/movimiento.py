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
    monto: float
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    tipo_cambio: float | None = None
    fecha: str | None = None


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
    monto: float
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    tipo_cambio: float | None = None
    fecha: str | None = None

class TransferenciaCrear(BaseModel):
    origen_id: int
    destino_id: int
    monto: float = Field(gt=0)
    fecha: date | None = None
    descripcion: str | None = None