# =========================================================
# Modelos de pagos de cuotas
# gt=0 -> estrictamente mayor a cero (no se aceptan pagos de 0 ni negativos)
# =========================================================

from datetime import date
from pydantic import BaseModel, Field


# Una parte del pago: cuánto pone cada cuenta
class PagoMetodo(BaseModel):
    metodo_pago_id: int
    monto: float = Field(gt=0)


class PagoCrear(BaseModel):
    cuota_id: int
    monto: float = Field(gt=0)
    metodos: list[PagoMetodo]
    fecha: date | None = None