from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import (
    obtener_usuario_actual,
    requerir_cuenta_inicial
)
from backend.models.resumen import ResumenPagar
from backend.services.resumen_service import (
    listar_resumenes,
    pagar_resumen
)

router = APIRouter(
    prefix="/resumenes",
    tags=["Resúmenes de tarjeta"],
    dependencies=[Depends(requerir_cuenta_inicial)]
)


@router.get("/tarjeta/{tarjeta_id}")
def listar(
    tarjeta_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = listar_resumenes(tarjeta_id, usuario["id"])

    if resultado is None:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    return resultado


@router.post("/tarjeta/{tarjeta_id}/{periodo}/pagar")
def pagar(
    tarjeta_id: int,
    periodo: date,
    datos: ResumenPagar,
    usuario=Depends(obtener_usuario_actual)
):
    return pagar_resumen(tarjeta_id, periodo, datos, usuario["id"])