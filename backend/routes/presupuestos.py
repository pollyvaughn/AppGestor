from typing import Literal

from fastapi import APIRouter, Depends

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.presupuesto import PresupuestoGuardar
from backend.services.presupuesto_service import (
    listar_presupuestos,
    guardar_presupuesto,
    quitar_presupuesto
)

Moneda = Literal["PYG", "USD", "EUR", "ARS", "BRL"]

router = APIRouter(
    prefix="/presupuestos",
    tags=["Presupuestos"]
)


@router.get("/")
def listar(usuario=Depends(obtener_usuario_actual)):
    return listar_presupuestos(usuario["id"])


@router.put("/{moneda}")
def guardar(
    moneda: Moneda,
    presupuesto: PresupuestoGuardar,
    usuario=Depends(obtener_usuario_actual)
):
    guardar_presupuesto(
        usuario["id"],
        moneda,
        presupuesto.tope_mensual
    )

    return {
        "mensaje": "Tope guardado"
    }


@router.delete("/{moneda}")
def quitar(
    moneda: Moneda,
    usuario=Depends(obtener_usuario_actual)
):
    quitar_presupuesto(
        usuario["id"],
        moneda
    )

    return {
        "mensaje": "Tope quitado"
    }