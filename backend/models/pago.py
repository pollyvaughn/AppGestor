from datetime import date
from pydantic import BaseModel


class PagoMetodo(BaseModel):
    metodo_pago_id: int
    monto: float


class PagoCrear(BaseModel):
    cuota_id: int
    monto: float
    metodos: list[PagoMetodo]
    fecha: date | None = None