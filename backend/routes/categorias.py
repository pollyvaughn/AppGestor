from fastapi import APIRouter
from backend.models.categoria import CategoriaCrear
from backend.services.categoria_service import crear_categoria

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.post("/")
def crear(categoria: CategoriaCrear):
    categoria_id = crear_categoria(categoria)

    return {
        "mensaje": "Categoría creada",
        "id": categoria_id
    }