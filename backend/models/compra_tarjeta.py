from pydantic import BaseModel, Field


class CompraTarjetaCrear(BaseModel):
    tarjeta_id: int
    monto: float = Field(gt=0)
    cantidad_cuotas: int = Field(gt=0)
    descripcion: str | None = None