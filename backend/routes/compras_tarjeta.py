from fastapi import APIRouter, Depends, HTTPException

from backend.models.ajuste import AjusteCrear
from backend.auth.dependencies import obtener_usuario_actual
from backend.models.compra_tarjeta import CompraTarjetaCrear
from backend.services.compra_tarjeta_service import (
    crear_compra,
    listar_compras,
    listar_cuotas,
    editar_compra,
    eliminar_compra
)

from backend.services.ajuste_service import (
    crear_ajuste,
    listar_ajustes,
    anular_ajuste
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


@router.post("/cuota/{cuota_id}/ajustes")
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


@router.get("/cuota/{cuota_id}/ajustes")
def ajustes(
    cuota_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_ajustes(
        cuota_id,
        usuario["id"]
    )

@router.delete("/ajuste/{ajuste_id}")
def anular_ajuste_route(
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

@router.get("/{compra_id}/cuotas")
def cuotas(
    compra_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_cuotas(
        compra_id,
        usuario["id"]
    )

@router.put("/{compra_id}")
def editar(
    compra_id: int,
    compra: CompraTarjetaCrear,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = editar_compra(
        compra_id,
        compra,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Compra no encontrada"
        )

    return {
        "mensaje": "Compra actualizada"
    }


@router.delete("/{compra_id}")
def eliminar(
    compra_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_compra(
        compra_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Compra no encontrada"
        )

    return {
        "mensaje": "Compra eliminada"
    }