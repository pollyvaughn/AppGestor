from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.metodo_pago import (
    MetodoPagoCrear,
    MetodoPagoEditar
)
from backend.services.metodo_pago_service import (
    crear_metodo_pago,
    listar_metodos_pago,
    editar_metodo_pago,
    eliminar_metodo_pago
)

router = APIRouter(
    prefix="/metodos-pago",
    tags=["Métodos de pago"]
)


@router.post("/")
def crear(
    metodo: MetodoPagoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    metodo_id = crear_metodo_pago(
        metodo,
        usuario["id"]
    )

    return {
        "mensaje": "Método de pago creado",
        "id": metodo_id
    }


@router.get("/")
def listar(usuario=Depends(obtener_usuario_actual)):
    return listar_metodos_pago(usuario["id"])


@router.put("/{metodo_id}")
def editar(
    metodo_id: int,
    metodo: MetodoPagoEditar,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = editar_metodo_pago(
        metodo_id,
        metodo,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    return {
        "mensaje": "Método de pago actualizado"
    }


@router.delete("/{metodo_id}")
def eliminar(
    metodo_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_metodo_pago(
        metodo_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    return {
        "mensaje": "Método de pago desactivado"
    }