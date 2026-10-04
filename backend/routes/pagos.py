from fastapi import APIRouter, Depends, status

from backend.models.pago import PagoCrear
from backend.services.pago_service import crear_pago
from backend.auth.dependencies import obtener_usuario_actual


router = APIRouter(
    prefix="/pagos",
    tags=["Pagos"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
def registrar_pago(
    pago: PagoCrear,
    usuario=Depends(obtener_usuario_actual)
):
    return crear_pago(pago, usuario["id"])