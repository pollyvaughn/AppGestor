from pydantic import BaseModel, Field


class TarjetaCreditoCrear(BaseModel):
    nombre: str
    moneda: str
    limite_credito: float = Field(gt=0)
    fecha_cierre: int = Field(ge=1, le=31)
    fecha_vencimiento: int = Field(ge=1, le=31)
    porcentaje_pago_minimo: float | None = Field(
        default=None,
        ge=0,
        le=100
    )


class TarjetaCreditoEditar(BaseModel):
    nombre: str
    moneda: str
    limite_credito: float = Field(gt=0)
    fecha_cierre: int = Field(ge=1, le=31)
    fecha_vencimiento: int = Field(ge=1, le=31)
    porcentaje_pago_minimo: float | None = Field(
        default=None,
        ge=0,
        le=100
    )