from pydantic import BaseModel


class CategoriaCrear(BaseModel):
    usuario_id: int
    nombre: str
    tipo: str
    color: str | None = None