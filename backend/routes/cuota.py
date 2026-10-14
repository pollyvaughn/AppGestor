from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import (
    obtener_usuario_actual,
    requerir_cuenta_inicial
)
from backend.services.cuota_service import omitir_cuota


router = APIRouter(
    prefix="/cuotas",
    tags=["Cuotas"],
    dependencies=[Depends(requerir_cuenta_inicial)]
)


@router.post("/{cuota_id}/omitir")
def omitir(
    cuota_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    try:
        return omitir_cuota(
            cuota_id,
            usuario["id"]
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )