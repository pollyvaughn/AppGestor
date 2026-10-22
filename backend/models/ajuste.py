# =========================================================
# Modelo de ajustes de cuota (recargos, intereses, descuentos...)
# Literal -> solo acepta uno de esos textos; cualquier otro devuelve 422
# gt=0    -> el monto siempre es positivo (el tipo define si suma o resta)
#
# Punto 5: ya no lleva cuota_id. La cuota viaja en la URL
# (POST /ajustes/cuota/{cuota_id}) y es la única fuente de verdad.
# Si algún cliente viejo todavía manda cuota_id en el body, pydantic lo
# ignora (por defecto descarta los campos que no conoce).
# =========================================================

from typing import Literal

from pydantic import BaseModel, Field


class AjusteCrear(BaseModel):
    tipo: Literal[
        "RECARGO",
        "INTERES",
        "COMISION",
        "DESCUENTO",
        "ADICIONAL"
    ]
    monto: float = Field(gt=0)
    descripcion: str | None = None