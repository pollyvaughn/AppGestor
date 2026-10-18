from datetime import date
from pydantic import BaseModel, Field


class CompraTarjetaCrear(BaseModel):
    tarjeta_id: int
    monto: float = Field(gt=0)
    cantidad_cuotas: int = Field(gt=0)
    categoria_id: int
    descripcion: str | None = None
    fecha_compra: date | None = None