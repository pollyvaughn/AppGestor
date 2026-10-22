# =========================================================
# Modelo de ajustes de cuota (recargos, intereses, descuentos...)
# Literal -> solo acepta uno de esos textos; cualquier otro devuelve 422
# Monto   -> siempre positivo y con tope (el tipo define si suma o resta)
#
# Punto 5: no lleva cuota_id (viaja en la URL POST /ajustes/cuota/{cuota_id}).
# Si un cliente viejo lo manda en el body, pydantic lo ignora.
# =========================================================

from typing import Literal

from pydantic import BaseModel

from backend.models.tipos import Descripcion, Monto


class AjusteCrear(BaseModel):
    tipo: Literal[
        "RECARGO",
        "INTERES",
        "COMISION",
        "DESCUENTO",
        "ADICIONAL"
    ]
    monto: Monto
    descripcion: Descripcion | None = None