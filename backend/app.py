from fastapi import FastAPI
from backend.database import get_connection
from backend.routes.categorias import router as categorias_router
from backend.routes.usuarios import router as usuarios_router
from backend.routes.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.metodos_pago import router as metodos_pago_router

app = FastAPI(title="Finanzas API")

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

app.include_router(usuarios_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de Finanzas funcionando"}


@app.get("/db-test")
def probar_conexion():
    conexion = get_connection()

    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT 1")
        resultado = cursor.fetchone()

        return {
            "conexion": "ok",
            "resultado": resultado[0]
        }

    finally:
        cursor.close()
        conexion.close()

