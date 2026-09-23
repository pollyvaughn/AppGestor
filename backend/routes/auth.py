from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
import jwt
from pydantic import BaseModel

from backend.database import get_connection
from backend.services.usuario_service import password_hasher

import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Autenticación"])

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(datos: LoginRequest):
    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nombre, email, password, estado
            FROM usuario
            WHERE email = %s
            """,
            (datos.email,)
        )

        usuario = cursor.fetchone()

    finally:
        cursor.close()
        conexion.close()

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    if usuario["estado"] != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario está inactivo"
        )

    if not password_hasher.verify(
        datos.password,
        usuario["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    ahora = datetime.now(timezone.utc)

    payload = {
        "sub": str(usuario["id"]),
        "email": usuario["email"],
        "exp": ahora + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario["id"],
            "nombre": usuario["nombre"],
            "email": usuario["email"]
        }
    }