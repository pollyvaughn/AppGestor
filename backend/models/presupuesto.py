# =========================================================
# Modelo del tope mensual de gasto
# Monto -> mayor a 0 y con tope máximo (ver tipos.py)
# =========================================================

from pydantic import BaseModel

from backend.models.tipos import Monto


class PresupuestoGuardar(BaseModel):
    tope_mensual: Monto