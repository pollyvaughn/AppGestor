from fastapi import FastAPI
from backend.database import get_connection

app = FastAPI(title="Finanzas API")


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