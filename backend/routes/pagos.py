from fastapi import APIRouter, Depends, status

from backend.models.pago import PagoCrear
from backend.services.pago_service import (
    crear_pago,
    editar_pago,
    anular_pago,
    listar_pagos_por_cuota
)
from backend.auth.dependencies import obtener_usuario_actual


router = APIRouter(
    prefix="/pagos",
    tags=["Pagos"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
def registrar_pago(
    pago: PagoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    return crear_pago(pago, usuario["id"])


@router.put("/{pago_id}")
def actualizar_pago(
    pago_id: int,
    pago: PagoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    return editar_pago(
        pago_id,
        pago,
        usuario["id"]
    )

@router.put("/{pago_id}/anular")
def cancelar_pago(
    pago_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return anular_pago(
        pago_id,
        usuario["id"]
    )

@router.get("/cuota/{cuota_id}")
def listar_pagos(
    cuota_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_pagos_por_cuota(
        cuota_id,
        usuario["id"]
    )