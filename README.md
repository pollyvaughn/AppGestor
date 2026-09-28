# Sistema de Finanzas Personales

Aplicación web para gestionar ingresos, gastos, métodos de pago, tarjetas de crédito, cuotas, pagos y movimientos recurrentes.

## Stack

### Backend

* Python
* FastAPI
* Uvicorn
* PyJWT
* pwdlib
* MySQL

### Frontend

* React
* TypeScript
* Vite

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

El nombre de la carpeta puede variar según cómo se clone el repositorio.

---

## 2. Crear el entorno virtual

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Cuando el entorno esté activado, debería aparecer `(.venv)` al comienzo de la terminal.

---

## 3. Instalar las dependencias del backend

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

No es necesario instalar cada paquete manualmente.

---

## 4. Instalar las dependencias del frontend

Entrar a la carpeta del frontend:

```bash
cd frontend
```

Instalar las dependencias:

```bash
npm install
```

Volver a la raíz del proyecto:

```bash
cd ..
```

---

# Base de datos

1. Abrir XAMPP.
2. Levantar MySQL.
3. Abrir phpMyAdmin.
4. Ejecutar el archivo:

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

JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_SECRETA_LARGA
```

El archivo `.env` **no debe subirse a GitHub**.

---

# Ejecutar el proyecto

El backend y el frontend deben ejecutarse al mismo tiempo, utilizando dos terminales.

## Backend

Desde la raíz del proyecto:

```bash
source .venv/bin/activate
uvicorn backend.app:app --reload
```

El backend estará disponible normalmente en:

```text
http://127.0.0.1:8000
```

Documentación automática de FastAPI:

```text
http://127.0.0.1:8000/docs
```

## Frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

Vite mostrará la dirección local, normalmente:

```text
http://localhost:5173
```

---

# Autenticación

Actualmente el proyecto cuenta con autenticación mediante JWT.

El flujo de inicio de sesión es:

```text
Frontend
    ↓
LoginForm
    ↓
POST /auth/login
    ↓
FastAPI
    ↓
Verificación de usuario y contraseña
    ↓
JWT
    ↓
Frontend
    ↓
localStorage
```

El token y los datos básicos del usuario se guardan en `localStorage`.

El backend también cuenta con rutas protegidas mediante el token JWT.

---

# Flujo básico de trabajo

Para verificar el estado del repositorio:

```bash
git status
```

Antes de comenzar a trabajar:

```bash
git pull
```

Activar el entorno virtual:

```bash
source .venv/bin/activate
```

Ejecutar el backend:

```bash
uvicorn backend.app:app --reload
```

En otra terminal, ejecutar el frontend:

```bash
cd frontend
npm run dev
```

Al terminar un cambio:

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

También se pueden utilizar herramientas gráficas como GitHub Desktop o las herramientas de Git integradas en el IDE.

---

# Trabajo

Después de clonar el proyecto:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Para instalar las dependencias del frontend:

```bash
cd frontend
npm install
```

Si se instala una nueva dependencia de Python:

```bash
pip install nombre-del-paquete
```

Después actualizar:

```bash
pip freeze > requirements.txt
```

Y subir el `requirements.txt` actualizado al repositorio.

Si se instala una nueva dependencia del frontend:

```bash
cd frontend
npm install nombre-del-paquete
```

Esto actualizará automáticamente:

```text
frontend/package.json
frontend/package-lock.json
```

Ambos archivos deben mantenerse en el repositorio.

---

# Archivos que no deben subirse

No subir al repositorio:

```text
.venv/
.env
__pycache__/
node_modules/
```

Estas rutas están incluidas en `.gitignore`.

---

# Estructura actual del proyecto

```text
AppGestor/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── auth/
│   ├── models/
│   ├── routes/
│   └── services/
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   └── auth/
│       │       └── LoginForm.tsx
│       ├── pages/
│       │   └── LoginPage.tsx
│       ├── services/
│       │   └── authService.ts
│       └── types/
│           └── auth.ts
│
├── database/
│   └── schema.sql
│
├── .env
├── .gitignore
├── requirements.txt
└── README.md
```
