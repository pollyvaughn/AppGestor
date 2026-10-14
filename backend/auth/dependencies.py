import os

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.database import get_connection

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

security = HTTPBearer()


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(security)
):
    token = credenciales.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )

        usuario_id = payload.get("sub")

        if not usuario_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido"
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="El token ha expirado"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido"
        )

    conexion = get_connection()

    try:
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, nombre, email, estado
            FROM usuario
            WHERE id = %s
            """,
            (usuario_id,)
        )

        usuario = cursor.fetchone()

    finally:
        cursor.close()
        conexion.close()

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Usuario no encontrado"
        )

    if usuario["estado"] != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario está inactivo"
        )

    return usuario


def requerir_cuenta_inicial(
    usuario=Depends(obtener_usuario_actual)
):
    conexion = get_connection()

    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            SELECT id
            FROM metodo_pago
            WHERE usuario_id = %s
            AND estado = 'ACTIVO'
            AND tipo != 'TARJETA_CREDITO'
            LIMIT 1
            """,
            (usuario["id"],)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=403,
                detail="Configurá una cuenta de dinero disponible antes de operar"
            )
    finally:
        cursor.close()
        conexion.close()

    return usuario