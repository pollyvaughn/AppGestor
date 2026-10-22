# =========================================================
# Rutas de compras con tarjeta
#
#   POST   /compras-tarjeta/                  -> registrar compra (crea las cuotas)
#   GET    /compras-tarjeta/                  -> listar compras
#   GET    /compras-tarjeta/{compra_id}/cuotas -> cuotas de una compra
#   PUT    /compras-tarjeta/{compra_id}       -> editar (solo la descripción)
#   DELETE /compras-tarjeta/{compra_id}       -> anular compra
#
# Punto 5: acá ya NO hay rutas de ajustes. Eran copias de las de
# routes/ajustes.py y el front nunca las usó. Los ajustes viven en /ajustes.
# =========================================================

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import (
    obtener_usuario_actual,
    requerir_cuenta_inicial
)
from backend.models.compra_tarjeta import CompraTarjetaCrear
from backend.services.compra_tarjeta_service import (
    crear_compra,
    listar_compras,
    listar_cuotas,
    editar_compra,
    eliminar_compra
)


router = APIRouter(
    prefix="/compras-tarjeta",
    tags=["Compras con tarjeta"],
    dependencies=[Depends(requerir_cuenta_inicial)]
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