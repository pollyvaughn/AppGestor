# =========================================================
# Modelo de pago de un resumen de tarjeta
# metodos: al menos una cuenta (min_length=1)
# =========================================================

from datetime import date
from pydantic import BaseModel, Field

from backend.models.pago import PagoMetodo
from backend.models.tipos import Monto


class ResumenPagar(BaseModel):
    monto: Monto
    metodos: list[PagoMetodo] = Field(min_length=1)
    fecha: date | None = None