# Guía de Instalación y Ejecución de DonApp

Esta guía contiene los pasos necesarios para clonar, configurar e instalar **DonApp** en una nueva computadora.

---

## Prerrequisitos del Sistema

Antes de comenzar, asegúrate de tener instalado en tu sistema:
* **Git**
* **Node.js** (Versión LTS 18 o superior)
* **Python** (Versión 3.11 o superior)
* **Docker y Docker Compose** *(Opcional, pero recomendado para levantar la base de datos fácilmente)*

---

## Paso 1: Clonar el Repositorio

Abre tu terminal y ejecuta el siguiente comando para clonar el repositorio:
```bash
git clone https://github.com/DavidCalleDaza/Antigravity.git DonApp
cd DonApp
```

---

## Método A: Instalación y Ejecución Rápida con Docker 🐳

Si la computadora tiene Docker, no necesitas instalar dependencias de Python ni PostgreSQL localmente. Se autoconfigura con un solo comando.

1. **Crear archivo de entorno del Backend:**
   Entra a la carpeta `Backend/` y copia el archivo de variables de entorno de ejemplo:
   ```bash
   cd Backend
   cp .env.example .env
   ```
2. **Levantar los servicios:**
   Desde la misma carpeta `Backend/`, levanta los contenedores en segundo plano:
   ```bash
   docker compose up --build -d
   ```
3. **Inicializar las tablas de la base de datos:**
   Ejecuta el script de creación de base de datos dentro del contenedor de la aplicación:
   ```bash
   docker compose exec web python init_db.py
   ```
4. **Levantar el Frontend:**
   En otra pestaña de la terminal, ve a la carpeta `Frontend/`, instala las dependencias de Node.js e inicia el servidor de desarrollo:
   ```bash
   cd ../Frontend
   npm install -g pnpm  # Si no tienes pnpm instalado
   pnpm install
   pnpm dev
   ```

* **Backend:** [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
* **Frontend:** [http://localhost:5173](http://localhost:5173)

---

## Método B: Instalación Manual (Nativa) 🛠️

Si prefieres ejecutar los servicios directamente en tu máquina local (ideal para debuguear y programar de forma nativa).

### 1. Configuración de la Base de Datos
Puedes usar Docker para levantar únicamente la base de datos y evitar configurar PostgreSQL localmente:
```bash
cd Backend
docker compose up db -d
```
*(Esto levantará la base de datos PostgreSQL mapeando el puerto interno al puerto host `5433`)*.

### 2. Configuración del Backend (Python / FastAPI)
1. **Configurar el archivo `.env`:**
   Crea una copia de la configuración de entorno:
   ```bash
   cp .env.example .env
   ```
   Abre el archivo `.env` y asegúrate de apuntar a `localhost:5433` para la base de datos:
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5433
   DATABASE_URL=postgresql+asyncpg://servinow_user:servinow_secret_password@localhost:5433/servinow_db
   ```
2. **Crear y activar el entorno virtual:**
   * En Linux/macOS/WSL:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   * En Windows (CMD/PowerShell):
     ```bash
     python -m venv .venv
     # CMD:
     .venv\Scripts\activate.bat
     # PowerShell:
     .\.venv\Scripts\Activate.ps1
     ```
3. **Instalar dependencias:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. **Crear tablas e inicializar base de datos:**
   ```bash
   python init_db.py
   ```
5. **Iniciar el servidor de desarrollo del Backend:**
   ```bash
   uvicorn app.main:app --reload
   ```

### 3. Configuración del Frontend (React / Vite)
1. Abre otra terminal y navega a la carpeta `Frontend/`:
   ```bash
   cd Frontend
   ```
2. **Instalar pnpm** (si no está instalado):
   ```bash
   npm install -g pnpm
   ```
3. **Instalar dependencias y levantar el servidor:**
   ```bash
   pnpm install
   pnpm dev
   ```

---

## Comprobar que todo funciona correctamente

* Accede a la URL de salud del servidor: `http://localhost:8000/api/v1/health`
  Debes recibir la respuesta `{"status":"ok","db_connection":true}`.
* Corre la suite de pruebas unitarias en el backend para validar el estado del código:
  ```bash
  # Dentro de la carpeta Backend con el entorno virtual activo:
  pytest
  ```
