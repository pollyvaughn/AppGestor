from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.categorias import router as categorias_router
from backend.routes.usuarios import router as usuarios_router
from backend.routes.auth import router as auth_router
from backend.routes.metodos_pago import router as metodos_pago_router
from backend.routes.movimientos import router as movimientos_router
from backend.routes.tarjetas_credito import router as tarjetas_router
from backend.routes.compras_tarjeta import router as compras_tarjeta_router
from backend.routes import pagos
from backend.routes.recurrentes import router as recurrentes_router
from backend.routes.cuota import router as cuota_router
from backend.routes.ajustes import router as ajustes_router
from backend.routes.presupuestos import router as presupuestos_router
from backend.routes.resumenes import router as resumenes_router

app = FastAPI(title="Finanzas API")

@app.exception_handler(ValueError)
async def valor_invalido(request: Request, error: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(error)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(categorias_router)
app.include_router(metodos_pago_router)
app.include_router(movimientos_router)
app.include_router(tarjetas_router)
app.include_router(compras_tarjeta_router)
app.include_router(pagos.router)
app.include_router(recurrentes_router)
app.include_router(ajustes_router)
app.include_router(cuota_router)
app.include_router(presupuestos_router)
app.include_router(resumenes_router)

app.include_router(usuarios_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de Finanzas funcionando"}