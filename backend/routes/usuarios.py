from fastapi import APIRouter, HTTPException, Depends
from mysql.connector.errors import IntegrityError

from backend.models.usuario import UsuarioCrear, UsuarioActualizar
from backend.services.usuario_service import (
    crear_usuario,
    obtener_usuario,
    actualizar_usuario,
    desactivar_usuario
)
from backend.auth.dependencies import obtener_usuario_actual

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def solo_mismo_usuario(
    usuario_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    if usuario["id"] != usuario_id:
        raise HTTPException(
            status_code=403,
            detail="No tenés permiso para acceder a este usuario"
        )
    return usuario


@router.post("/")
def registrar_usuario(usuario: UsuarioCrear):
    try:
        usuario_id = crear_usuario(usuario)
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Ese email ya está registrado"
        )

    return {"mensaje": "Usuario creado correctamente", "id": usuario_id}


@router.get("/me")
def usuario_actual(usuario=Depends(obtener_usuario_actual)):
    return usuario


@router.get("/{usuario_id}")
def obtener(usuario_id: int, _=Depends(solo_mismo_usuario)):
    usuario = obtener_usuario(usuario_id)

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return usuario


@router.put("/{usuario_id}")
def actualizar(
    usuario_id: int,
    usuario: UsuarioActualizar,
    _=Depends(solo_mismo_usuario)
):
    try:
        actualizado = actualizar_usuario(usuario_id, usuario)
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Ese email ya está registrado"
        )

    if not actualizado:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {"mensaje": "Usuario actualizado correctamente"}


@router.delete("/{usuario_id}")
def desactivar(usuario_id: int, _=Depends(solo_mismo_usuario)):
    if not desactivar_usuario(usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {"mensaje": "Usuario desactivado correctamente"}