from datetime import date
from pydantic import BaseModel, Field

from backend.models.pago import PagoMetodo


class ResumenPagar(BaseModel):
    monto: float = Field(gt=0)
    metodos: list[PagoMetodo] = Field(min_length=1)
    fecha: date | None = None