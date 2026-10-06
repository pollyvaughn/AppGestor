from pydantic import BaseModel


class AjusteCrear(BaseModel):
    cuota_id: int
    tipo: str
    monto: float
    descripcion: str | None = None