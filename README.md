# Sistema de Finanzas Personales

Aplicación web para gestionar ingresos, gastos, métodos de pago, tarjetas de crédito, cuotas, pagos y movimientos recurrentes.

## Stack

### Backend

* Python
* FastAPI
* Uvicorn
* MySQL

### Frontend

* HTML
* CSS
* JavaScript

### Base de datos

* MySQL
* XAMPP

---

# Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/pollyvaughn/AppGestor.git
cd AppGestor
```
(AppGestor o como sea q le hayan puesto a su carpeta)

## 2. Crear el entorno virtual

En Windows:

```bash
.venv\Scripts\activate
```

Cuando esté activado, debería aparecer `(.venv)` al comienzo de la terminal.

---

## 3. Instalar las dependencias

```bash
pip install -r requirements.txt
```

No es necesario instalar cada paquete manualmente.

---

# Base de datos

1. Abrir XAMPP y levantar MySQL.
2. Abrir phpMyAdmin.
3. Ejecutar el archivo:

```text
database/schema.sql
```

Esto crea la base de datos y sus tablas.

Los datos de prueba, si se agregan posteriormente, estarán en:

```text
database/seed.sql
```

---

# Variables de entorno

Crear un archivo `.env` en la raíz del proyecto.

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=finanzas
DB_USER=root
DB_PASSWORD=
```

El archivo `.env` **no debe subirse a GitHub**.

---

# Ejecutar el backend

Activar primero el entorno virtual:

```bash
source .venv/bin/activate
```

Luego:

```bash
uvicorn backend.app:app --reload
```

El servidor estará disponible normalmente en:

```text
http://127.0.0.1:8000
```

FastAPI también proporciona documentación automática:

```text
http://127.0.0.1:8000/docs
```

---
# Flujo básico de trabajo

Para saber si hay cambios que commitear o si estan al dia con la rama:

```bash
git status
```

Antes de trabajar:

```bash
git pull
```

Activar el entorno:

```bash
source .venv/bin/activate
```

Ejecutar el backend:

```bash
uvicorn backend.app:app --reload
```

Al terminar:

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

si usan la extension de VS code de github o githubd desktop esto de arriba a lo mejor no hace falta hacer. 

# Trabajo en equipo

Cada integrante debe tener su propio entorno virtual.

Después de clonar el proyecto:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Si se instala una nueva dependencia:

```bash
pip install nombre-del-paquete
```

Después actualizar:

```bash
pip freeze > requirements.txt
```

Y subir el `requirements.txt` actualizado al repositorio.

No subir:

```text
.venv/
.env
__pycache__/
```

---