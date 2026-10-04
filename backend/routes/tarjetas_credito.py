from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.tarjeta_credito import (
    TarjetaCreditoCrear,
    TarjetaCreditoEditar
)
from backend.services.tarjeta_credito_service import (
    crear_tarjeta,
    listar_tarjetas,
    editar_tarjeta,
    eliminar_tarjeta
)


router = APIRouter(
    prefix="/tarjetas",
    tags=["Tarjetas de crédito"]
)


@router.post("/")
def crear(
    tarjeta: TarjetaCreditoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    tarjeta_id = crear_tarjeta(
        tarjeta,
        usuario["id"]
    )

    return {
        "mensaje": "Tarjeta creada",
        "id": tarjeta_id
    }


@router.get("/")
def listar(usuario=Depends(obtener_usuario_actual)):
    return listar_tarjetas(usuario["id"])


@router.put("/{tarjeta_id}")
def editar(
    tarjeta_id: int,
    tarjeta: TarjetaCreditoEditar,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = editar_tarjeta(
        tarjeta_id,
        tarjeta,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Tarjeta no encontrada"
        )

    return {
        "mensaje": "Tarjeta actualizada"
    }


@router.delete("/{tarjeta_id}")
def eliminar(
    tarjeta_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_tarjeta(
        tarjeta_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Tarjeta no encontrada"
        )

    return {
        "mensaje": "Tarjeta dada de baja"
    }