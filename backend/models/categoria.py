from pydantic import BaseModel
from typing import Literal


class CategoriaCrear(BaseModel):
    nombre: str
    tipo: Literal["INGRESO", "EGRESO"]
    color: str | None = None


class CategoriaEditar(BaseModel):
    nombre: str
    tipo: Literal["INGRESO", "EGRESO"]
    color: str | None = None