# =========================================================
# Modelos de tarjetas de crédito
# nombre         -> sin espacios en los bordes, 1 a 100 caracteres
# limite_credito -> mayor a 0 y con tope (ver tipos.py)
# ge/le: "greater or equal" / "less or equal" (mayor o igual / menor o igual)
#
# Punto 4: la moneda NO se puede cambiar al editar. En TarjetaCreditoEditar
#   es opcional (None = no se manda): si viene y es distinta a la actual,
#   el servicio responde 400. Si no viene, o viene igual, no pasa nada.
# =========================================================

from typing import Literal

from pydantic import BaseModel, Field

from backend.models.tipos import Monto, Nombre


class TarjetaCreditoCrear(BaseModel):
    nombre: Nombre
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
    limite_credito: Monto
    fecha_cierre: int = Field(ge=1, le=31)
    fecha_vencimiento: int = Field(ge=1, le=31)
    porcentaje_pago_minimo: float | None = Field(
        default=None,
        ge=0,
        le=100
    )


class TarjetaCreditoEditar(BaseModel):
    nombre: Nombre
    # opcional: solo se usa para detectar un intento de cambiarla
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"] | None = None
    limite_credito: Monto
    fecha_cierre: int = Field(ge=1, le=31)
    fecha_vencimiento: int = Field(ge=1, le=31)
    porcentaje_pago_minimo: float | None = Field(
        default=None,
        ge=0,
        le=100
    )