from pydantic import BaseModel
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
    saldo: float = 0


class MetodoPagoEditar(BaseModel):
    tipo: Literal[
        "EFECTIVO",
        "BILLETERA",
        "CUENTA_BANCARIA",
        "TARJETA_CREDITO"
    ]
    nombre: str
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    saldo: float