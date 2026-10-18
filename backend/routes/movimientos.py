from fastapi import APIRouter, Depends, HTTPException, Query

from backend.auth.dependencies import (
    obtener_usuario_actual,
    requerir_cuenta_inicial
)
from backend.models.movimiento import (
    MovimientoCrear,
    MovimientoEditar,
    TransferenciaCrear
)
from backend.services.movimiento_service import (
    crear_movimiento,
    crear_transferencia,
    listar_movimientos,
    editar_movimiento,
    eliminar_movimiento
)

router = APIRouter(
    prefix="/movimientos",
    tags=["Movimientos"],
    dependencies=[Depends(requerir_cuenta_inicial)]
)


@router.post("/")
def crear(
    movimiento: MovimientoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    movimiento_id, error = crear_movimiento(
        movimiento,
        usuario["id"]
    )

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return {
        "mensaje": "Movimiento creado",
        "id": movimiento_id
    }


@router.get("/")
def listar(
    categoria_id: int | None = Query(default=None, gt=0),
    usuario=Depends(obtener_usuario_actual)
):
    return listar_movimientos(
        usuario["id"],
        categoria_id
    )

@router.put("/{movimiento_id}")
def editar(
    movimiento_id: int,
    movimiento: MovimientoEditar,
    usuario=Depends(obtener_usuario_actual)
):
    resultado, error = editar_movimiento(
        movimiento_id,
        movimiento,
        usuario["id"]
    )

    if not resultado:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return {
        "mensaje": "Movimiento actualizado"
    }


@router.delete("/{movimiento_id}")
def eliminar(
    movimiento_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_movimiento(
        movimiento_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Movimiento no encontrado"
        )

    return {
        "mensaje": "Movimiento anulado"
    }

@router.post("/transferencia")
def transferir(
    datos: TransferenciaCrear,
    usuario=Depends(obtener_usuario_actual)
):
    movimiento_id = crear_transferencia(datos, usuario["id"])

    return {
        "mensaje": "Transferencia registrada",
        "id": movimiento_id
    }