# =========================================================
# Modelos de usuario
# nombre   -> sin espacios en los bordes, 1 a 100 caracteres
# password -> mínimo 8 caracteres (antes se aceptaba una contraseña vacía)
# =========================================================

from pydantic import BaseModel, EmailStr

from backend.models.tipos import Nombre, Password


class UsuarioCrear(BaseModel):
    nombre: Nombre
    email: EmailStr
    password: Password


class UsuarioActualizar(BaseModel):
    nombre: Nombre
    email: EmailStr