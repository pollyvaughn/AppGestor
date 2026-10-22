# =========================================================
# Modelos de categorías
# Nombre -> sin espacios en los bordes, 1 a 100 caracteres (ver tipos.py)
# =========================================================

from pydantic import BaseModel
from typing import Literal

from backend.models.tipos import Color, Nombre


class CategoriaCrear(BaseModel):
    nombre: Nombre
    tipo: Literal["INGRESO", "EGRESO"]
    color: Color | None = None


class CategoriaEditar(BaseModel):
    nombre: Nombre
    tipo: Literal["INGRESO", "EGRESO"]
    color: Color | None = None