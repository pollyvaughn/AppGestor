# =========================================================
# Modelo de ajustes de cuota (recargos, intereses, descuentos...)
# Literal -> solo acepta uno de esos textos; cualquier otro devuelve 422
# gt=0    -> el monto siempre es positivo (el tipo define si suma o resta)
# =========================================================

from typing import Literal

from pydantic import BaseModel, Field


class AjusteCrear(BaseModel):
    cuota_id: int
    tipo: Literal[
        "RECARGO",
        "INTERES",
        "COMISION",
        "DESCUENTO",
        "ADICIONAL"
    ]
    monto: float = Field(gt=0)
    descripcion: str | None = None