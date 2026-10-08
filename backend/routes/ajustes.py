from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.ajuste import AjusteCrear
from backend.services.ajuste_service import (
    crear_ajuste,
    listar_ajustes,
    anular_ajuste
)


router = APIRouter(
    prefix="/ajustes",
    tags=["Ajustes"]
)


@router.post("/cuota/{cuota_id}")
def agregar_ajuste(
    cuota_id: int,
    ajuste: AjusteCrear,
    usuario=Depends(obtener_usuario_actual)
):
    try:
        ajuste.cuota_id = cuota_id

        return crear_ajuste(
            ajuste,
            usuario["id"]
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@router.get("/cuota/{cuota_id}")
def listar(
    cuota_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_ajustes(
        cuota_id,
        usuario["id"]
    )


@router.delete("/{ajuste_id}")
def anular(
    ajuste_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    try:
        return anular_ajuste(
            ajuste_id,
            usuario["id"]
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )