from pydantic import BaseModel


class PagoCrear(BaseModel):
    cuota_id: int
    monto: float