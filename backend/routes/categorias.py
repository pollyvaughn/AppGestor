from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.categoria import CategoriaCrear, CategoriaEditar
from backend.services.categoria_service import (
    crear_categoria,
    listar_categorias,
    editar_categoria,
    eliminar_categoria
)

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.post("/")
def crear(
    categoria: CategoriaCrear,
    usuario=Depends(obtener_usuario_actual)
):
    categoria_id = crear_categoria(
        categoria,
        usuario["id"]
    )

    return {
        "mensaje": "Categoría creada",
        "id": categoria_id
    }

@router.get("/")
def listar(usuario=Depends(obtener_usuario_actual)):
    return listar_categorias(usuario["id"])

@router.put("/{categoria_id}")
def editar(
    categoria_id: int,
    categoria: CategoriaEditar,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = editar_categoria(
        categoria_id,
        categoria,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Categoría no encontrada"
        )

    return {
        "mensaje": "Categoría actualizada"
    }


@router.delete("/{categoria_id}")
def eliminar(
    categoria_id: int,
    usuario=Depends(obtener_usuario_actual)
):
    resultado = eliminar_categoria(
        categoria_id,
        usuario["id"]
    )

    if resultado == 0:
        raise HTTPException(
            status_code=404,
            detail="Categoría no encontrada"
        )
    return {
        "mensaje": "Categoría eliminada"
    }