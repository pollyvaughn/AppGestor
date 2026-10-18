from pydantic import BaseModel, Field
from typing import Literal


class MetodoPagoCrear(BaseModel):
    tipo: Literal[
        "EFECTIVO",
        "BILLETERA",
        "CUENTA_BANCARIA",
        "TARJETA_CREDITO"
    ]
    nombre: str
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    saldo: float = Field(default=0, ge=0)


class MetodoPagoEditar(BaseModel):
    tipo: Literal[
        "EFECTIVO",
        "BILLETERA",
        "CUENTA_BANCARIA",
        "TARJETA_CREDITO"
    ]
    nombre: str


class AjusteSaldo(BaseModel):
    saldo_real: float
    motivo: str | None = None