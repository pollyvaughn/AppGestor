from pydantic import BaseModel, EmailStr


class UsuarioCrear(BaseModel):
    nombre: str
    email: EmailStr
    password: str


class UsuarioActualizar(BaseModel):
    nombre: str
    email: EmailStr