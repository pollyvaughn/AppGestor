# =========================================================
# Modelos de pagos de cuotas
# Monto -> estrictamente mayor a cero y con tope máximo (ver tipos.py)
# metodos -> al menos una cuenta (antes se aceptaba una lista vacía
#            y recién fallaba más adentro con otro mensaje)
# =========================================================

from datetime import date
from pydantic import BaseModel, Field

from backend.models.tipos import Monto


# Una parte del pago: cuánto pone cada cuenta
class PagoMetodo(BaseModel):
    metodo_pago_id: int
    monto: Monto


class PagoCrear(BaseModel):
    cuota_id: int
    monto: Monto
    metodos: list[PagoMetodo] = Field(min_length=1)
    fecha: date | None = None