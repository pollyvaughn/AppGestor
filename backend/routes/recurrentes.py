from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.recurrente import (
    RecurrenteCrear,
    RecurrenteEditar
)
from backend.services.recurrente_service import (
    crear_recurrente,
    listar_recurrentes,
    editar_recurrente,
    eliminar_recurrente,
    generar_movimiento,
    anular_movimiento_recurrente
)

router = APIRouter(
    prefix="/recurrentes",
    tags=["Recurrentes"]
)


@router.post("/")
def crear(
    recurrente: RecurrenteCrear,
    usuario=Depends(obtener_usuario_actual)
):
    recurrente_id, error = crear_recurrente(
        recurrente,
        usuario["id"]
    )

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return {
        "mensaje": "Recurrente creado",
        "id": recurrente_id
    }


@router.get("/")
def listar(
    tipo: Literal["INGRESO", "EGRESO"] | None = None,
    usuario=Depends(obtener_usuario_actual)
):
    return listar_recurrentes(usuario["id"], tipo)


@router.put("/{recurrente_id}")
def editar(
    recurrente_id: int,
    recurrente: RecurrenteEditar,
    usuario=Depends(obtener_usuario_actual)
):
    resultado, error = editar_recurrente(
        recurrente_id,
        recurrente,
        usuario["id"]
    )

    if not resultado:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return {
        "mensaje": "Recurrente actualizado"
    }


@router.delete("/{recurrente_id}")
def eliminar(
    recurrente_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_recurrente(
        recurrente_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Recurrente no encontrado"
        )

    return {
        "mensaje": "Recurrente desactivado"
    }


@router.post("/{recurrente_id}/generar")
def generar(
    recurrente_id: int,
    monto: float | None = Query(default=None, gt=0),
    metodo_pago_id: int | None = Query(default=None, gt=0),
    usuario=Depends(obtener_usuario_actual)
):
    resultado, error = generar_movimiento(
        recurrente_id,
        usuario["id"],
        monto,
        metodo_pago_id
    )

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return {
        "mensaje": "Movimiento generado",
        **resultado
    }

@router.delete("/{recurrente_id}/periodo/{periodo}")
def anular_periodo(
    recurrente_id: int,
    periodo: str,
    usuario=Depends(obtener_usuario_actual)
):
    resultado, error = anular_movimiento_recurrente(
        recurrente_id,
        periodo,
        usuario["id"]
    )

    if error:
        raise HTTPException(status_code=400, detail=error)

    return {
        "mensaje": "Movimiento recurrente anulado",
        **resultado
    }