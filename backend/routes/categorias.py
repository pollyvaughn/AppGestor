from fastapi import APIRouter, Depends

from backend.auth.dependencies import obtener_usuario_actual
from backend.models.categoria import CategoriaCrear
from backend.services.categoria_service import crear_categoria

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