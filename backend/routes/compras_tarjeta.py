from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.compra_tarjeta import CompraTarjetaCrear
from backend.services.compra_tarjeta_service import (
    crear_compra,
    listar_compras,
    listar_cuotas
)


router = APIRouter(
    prefix="/compras-tarjeta",
    tags=["Compras con tarjeta"]
)


@router.post("/")
def crear(
    compra: CompraTarjetaCrear,
    usuario=Depends(obtener_usuario_actual)
):
    try:
        compra_id = crear_compra(
            compra,
            usuario["id"]
        )

        return {
            "mensaje": "Compra registrada",
            "id": compra_id
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

@router.get("/")
def listar(usuario=Depends(obtener_usuario_actual)):
    return listar_compras(usuario["id"])


@router.get("/{compra_id}/cuotas")
def cuotas(
    compra_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_cuotas(
        compra_id,
        usuario["id"]
    )