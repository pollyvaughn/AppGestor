# =========================================================
# Modelos de cuentas / métodos de pago
# saldo (alta)   -> >= 0 y <= MONTO_MAXIMO (no se crea una cuenta en negativo)
# saldo_real     -> puede ser negativo (sobregiro real), pero con tope
# allow_inf_nan=False -> rechaza NaN e infinito
# =========================================================

from pydantic import BaseModel, Field
from typing import Literal

from backend.models.tipos import Descripcion, MONTO_MAXIMO, Nombre


class MetodoPagoCrear(BaseModel):
    tipo: Literal[
        "EFECTIVO",
        "BILLETERA",
        "CUENTA_BANCARIA",
        "TARJETA_CREDITO"
    ]
    nombre: Nombre
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    saldo: float = Field(default=0, ge=0, le=MONTO_MAXIMO, allow_inf_nan=False)


class MetodoPagoEditar(BaseModel):
    tipo: Literal[
        "EFECTIVO",
        "BILLETERA",
        "CUENTA_BANCARIA",
        "TARJETA_CREDITO"
    ]
    nombre: Nombre


class AjusteSaldo(BaseModel):
    saldo_real: float = Field(
        ge=-MONTO_MAXIMO,
        le=MONTO_MAXIMO,
        allow_inf_nan=False
    )
    motivo: Descripcion | None = None