from pydantic import BaseModel
from typing import Literal


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