from fastapi import APIRouter, HTTPException, Depends

from backend.models.usuario import UsuarioCrear, UsuarioActualizar
from backend.services.usuario_service import (
    crear_usuario,
    obtener_usuario,
    actualizar_usuario,
    desactivar_usuario
)

from backend.auth.dependencies import obtener_usuario_actual

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.post("/")
def registrar_usuario(usuario: UsuarioCrear):
    try:
        usuario_id = crear_usuario(usuario)

        return {
            "mensaje": "Usuario creado correctamente",
            "id": usuario_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.get("/me")
def usuario_actual(usuario=Depends(obtener_usuario_actual)):
    return usuario

@router.get("/{usuario_id}")
def obtener(usuario_id: int):
    usuario = obtener_usuario(usuario_id)

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    return usuario


@router.put("/{usuario_id}")
def actualizar(usuario_id: int, usuario: UsuarioActualizar):
    actualizado = actualizar_usuario(usuario_id, usuario)

    if not actualizado:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    return {
        "mensaje": "Usuario actualizado correctamente"
    }


@router.delete("/{usuario_id}")
def desactivar(usuario_id: int):
    desactivado = desactivar_usuario(usuario_id)

    if not desactivado:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    return {
        "mensaje": "Usuario desactivado correctamente"
    }