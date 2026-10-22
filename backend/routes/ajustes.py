# =========================================================
# Rutas de ajustes de cuota (recargos, intereses, descuentos...)
# Es el ÚNICO lugar donde viven las rutas de ajustes: las copias que
# había en compras_tarjeta.py se borraron (punto 5).
#
#   POST   /ajustes/cuota/{cuota_id}  -> agrega un ajuste a la cuota
#   GET    /ajustes/cuota/{cuota_id}  -> lista los ajustes de la cuota
#   DELETE /ajustes/{ajuste_id}       -> anula un ajuste
# =========================================================

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import (
    obtener_usuario_actual,
    requerir_cuenta_inicial
)
from backend.models.ajuste import AjusteCrear
from backend.services.ajuste_service import (
    crear_ajuste,
    listar_ajustes,
    anular_ajuste
)


router = APIRouter(
    prefix="/ajustes",
    tags=["Ajustes"],
    dependencies=[Depends(requerir_cuenta_inicial)]
)


@router.post("/cuota/{cuota_id}")
def agregar_ajuste(
    cuota_id: int,
    ajuste: AjusteCrear,
    usuario=Depends(obtener_usuario_actual)
):
    try:
        # la cuota sale de la URL, no del body
        return crear_ajuste(
            cuota_id,
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