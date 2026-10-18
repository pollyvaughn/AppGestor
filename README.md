# Sistema de Finanzas Personales (AppGestor)

Aplicación web para gestionar ingresos, gastos, cuentas, tarjetas de crédito,
cuotas, pagos y movimientos recurrentes, con un panel global de métricas.

## Stack

### Backend

* Python 3.10 o superior
* FastAPI + Uvicorn
* MySQL (`mysql-connector-python`)
* Autenticación con JWT (`PyJWT`) y contraseñas con Argon2

### Frontend

* React 19 + TypeScript
* Vite
* Tailwind CSS 4
* Recharts (gráficos de la pantalla Global)

### Base de datos

* MySQL / MariaDB (se usa XAMPP)

---

# Requisitos previos

* Git
* Python 3.10 o superior
* Node.js 20.19 o superior (también sirve 22.12 o superior)
* XAMPP (con MySQL y phpMyAdmin)

---

# Instalación

Los pasos se hacen una sola vez, la primera vez que se clona el proyecto.

## 1. Clonar el repositorio

```bash
git clone https://github.com/pollyvaughn/AppGestor.git
cd AppGestor
```

(`AppGestor` o como le hayan puesto a su carpeta)

## 2. Backend: entorno virtual y dependencias

Crear el entorno virtual:

```bash
python -m venv .venv
```

Activarlo.

En Windows:

```bash
.venv\Scripts\activate
```

En Mac o Linux:

```bash
source .venv/bin/activate
```

Cuando esté activado, debería aparecer `(.venv)` al comienzo de la terminal.

Instalar las dependencias:

```bash
pip install -r requirements.txt
```

No es necesario instalar cada paquete manualmente.

## 3. Variables de entorno

Copiar la plantilla como `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

(En Windows con CMD: `copy .env.example .env`)

Después abrir `.env` y revisar estos valores:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=finanzas
DB_USER=root
DB_PASSWORD=
JWT_SECRET=una-clave-secreta-larga
```

* Con XAMPP local, normalmente el usuario es `root` y la contraseña va vacía.
* **`JWT_SECRET` es obligatorio**: sin una clave, el inicio de sesión falla.
  Para generar una:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

El archivo `.env` **no debe subirse a GitHub** (ya está en `.gitignore`).

## 4. Base de datos

1. Abrir XAMPP y levantar **MySQL**.
2. Abrir phpMyAdmin (`http://localhost/phpmyadmin`).
3. Ir a la pestaña **Importar**, elegir el archivo `database/schema.sql` y
   presionar **Importar**.
4. Repetir con `database/seed.sql` (datos de demostración).

Eso es todo: no hay migraciones. `schema.sql` ya tiene la estructura completa.

> **Atención:** `schema.sql` **borra la base `finanzas`** y la crea de cero.
> Esto también sirve para reiniciar la demo: se ejecutan de nuevo
> `schema.sql` y `seed.sql`, en ese orden. No lo ejecutes si tenés datos
> que quieras conservar.

El seed se puede ejecutar más de una vez sin duplicar datos.

Acceso de demostración:

```text
Email: demo@appgestor.local
Contraseña: Demo123!
```

## 5. Frontend

En otra terminal, desde la raíz del proyecto:

```bash
cd frontend
npm install
```

`npm install` instala todo lo que está en `package.json`, incluida Recharts.

Por defecto el frontend le habla al backend en `http://127.0.0.1:8000`. Si el
backend corre en otra dirección, crear `frontend/.env` con:

```env
VITE_API_URL=http://direccion-del-backend:8000
```

---

# Ejecutar la aplicación

Hacen falta dos terminales abiertas a la vez.

**Terminal 1: backend** (desde la raíz, con el entorno virtual activado)

```bash
uvicorn backend.app:app --reload
```

El servidor queda en `http://127.0.0.1:8000`. FastAPI también genera la
documentación automática en `http://127.0.0.1:8000/docs`.

**Terminal 2: frontend** (desde la carpeta `frontend`)

```bash
npm run dev
```

La aplicación queda en `http://localhost:5173`.

> El backend solo acepta pedidos desde `http://localhost:5173` y
> `http://127.0.0.1:5173`. Si Vite arranca en otro puerto, hay que agregarlo
> en `backend/app.py` (lista `allow_origins`).

---

# Cómo usar la aplicación

## Configuración inicial

Al iniciar sesión sin una cuenta de dinero disponible, la aplicación solicita
crear una cuenta e ingresar su saldo actual. Ese saldo es el punto de partida:
se registra como un movimiento **"Saldo inicial"** que **no cuenta como
ingreso**.

Al registrarte se crean categorías básicas (Salario, Comida, Transporte...) que podés editar o borrar desde Categorías. La categoría y la cuenta son
obligatorias para ingresos y egresos. Las compras con tarjeta se registran
desde **Tarjetas**.

## Pantallas

* **Global**: panel de métricas con selector de periodo (este mes, últimos
  3 meses, año actual). Muestra liquidez real, tasa de ahorro, gastos del
  periodo y variación contra el periodo anterior, además de los gráficos de
  evolución, composición del gasto (o del ingreso) y ritmo de gasto del mes.
  El tope mensual del gráfico de ritmo se define ahí mismo y se guarda en la
  base de datos.
* **Mensual**: movimientos del mes, resumen y filtros por categoría.
* **Recurrentes**: ingresos y gastos que se repiten (alquiler, salario, etc.).
* **Categorías**: alta, edición y baja de categorías.
* **Tarjetas**: tarjetas, compras en cuotas, pagos, ajustes y omisión de cuotas.
* **Cuentas**: efectivo, billeteras y cuentas bancarias con su saldo.

## Cómo se calculan los números

* **Ingresos y gastos del periodo** cuentan solo los movimientos de tipo
  ingreso y egreso confirmados. No cuentan el saldo inicial, los ajustes de
  saldo ni los pagos de cuotas (el gasto de una compra con tarjeta se cuenta
  el día de la compra, no cuando se paga cada cuota).
* **Liquidez real** es la suma de los saldos actuales de las cuentas de dinero
  (las tarjetas de crédito no suman).
* **Editar el saldo de una cuenta a mano** deja registrado un movimiento de
  "Ajuste de saldo". No es ingreso ni gasto.
* No se puede cambiar la moneda de una cuenta que ya tiene movimientos.

---

# Flujo básico de trabajo

Para saber si hay cambios que commitear o si están al día con la rama:

```bash
git status
```

Antes de empezar a trabajar:

```bash
git pull
```

Al terminar:

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

Si usan la extensión de Git de VS Code o GitHub Desktop, esto de arriba a lo
mejor no hace falta hacerlo a mano.

Antes de subir cambios del frontend, conviene comprobar que compila:

```bash
cd frontend
npm run build
```

---

# Trabajo en equipo

Cada integrante tiene su propio entorno virtual de Python y su propia carpeta
`node_modules`. Después de clonar el proyecto, hacer los pasos de la sección
**Instalación**.

Si cambia el esquema de la base de datos (alguien modifica `database/schema.sql`
o `database/seed.sql`), cada uno vuelve a ejecutarlos en phpMyAdmin, en ese
orden.

### Dependencias nuevas

De Python:

```bash
pip install nombre-del-paquete
pip freeze > requirements.txt
```

De JavaScript (desde la carpeta `frontend`):

```bash
npm install nombre-del-paquete
```

En ambos casos hay que subir al repositorio los archivos actualizados:
`requirements.txt`, o `package.json` y `package-lock.json`.

### No subir

```text
.venv/
.env
__pycache__/
node_modules/
dist/
```

---

# Problemas frecuentes

* **El login da error o el backend no arranca**: revisar que exista `.env` en
  la raíz y que tenga `JWT_SECRET`.
* **`Unknown column`, `Data truncated` o errores de tipo de movimiento**: la
  base quedó con una versión vieja del esquema. Volver a ejecutar
  `schema.sql` y `seed.sql`.
* **El frontend dice "No se pudo conectar con el servidor"**: el backend no
  está corriendo, o está en otra dirección (ver `VITE_API_URL`).
* **Error de CORS en la consola del navegador**: el frontend está abierto en
  un puerto que no está en `allow_origins` de `backend/app.py`.
* **El gráfico de ritmo de gasto no guarda el tope**: probablemente la tabla
  `presupuesto` no existe porque la base se creó con un esquema viejo. Volver
  a ejecutar `schema.sql` y `seed.sql`.