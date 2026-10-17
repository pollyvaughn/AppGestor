from pydantic import BaseModel, Field


class PresupuestoGuardar(BaseModel):
    tope_mensual: float = Field(gt=0)