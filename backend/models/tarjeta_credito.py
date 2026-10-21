# =========================================================
# Modelos de tarjetas de crédito
# moneda: Literal -> solo las monedas que existen en la base (ENUM);
#   antes era str y una moneda inventada rompía al guardar.
# ge/le: "greater or equal" / "less or equal" (mayor o igual / menor o igual)
#
# Punto 4: la moneda de una tarjeta NO se puede cambiar al editar.
#   En TarjetaCreditoEditar la moneda es opcional (None = no se manda):
#   si viene y es distinta a la actual, el servicio responde 400.
#   Si no viene, o viene igual, no pasa nada.
# =========================================================

from typing import Literal

from pydantic import BaseModel, Field


class TarjetaCreditoCrear(BaseModel):
    nombre: str
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"]
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
    # opcional: solo se usa para detectar un intento de cambiarla
    moneda: Literal["PYG", "USD", "EUR", "ARS", "BRL"] | None = None
    limite_credito: float = Field(gt=0)
    fecha_cierre: int = Field(ge=1, le=31)
    fecha_vencimiento: int = Field(ge=1, le=31)
    porcentaje_pago_minimo: float | None = Field(
        default=None,
        ge=0,
        le=100
    )