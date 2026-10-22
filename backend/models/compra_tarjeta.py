# =========================================================
# Modelo de compras con tarjeta
# cantidad_cuotas: de 1 a 120 (sin tope, 100000 cuotas creaban
#   100000 filas en la tabla cuota)
# =========================================================

from datetime import date
from pydantic import BaseModel, Field

from backend.models.tipos import Descripcion, Monto


class CompraTarjetaCrear(BaseModel):
    tarjeta_id: int
    monto: Monto
    cantidad_cuotas: int = Field(gt=0, le=120)
    categoria_id: int
    descripcion: Descripcion | None = None
    fecha_compra: date | None = None