# Guía de Empaquetado para Venta a Clientes

Esta guía explica cómo empaquetar tu sistema ISP para vender a clientes **sin que vean el código fuente**.

---

## Resumen de Opciones

| Opción | Formato | Ventajas | Desventajas |
|--------|---------|----------|-------------|
| **pkg** | EXE standalone | Simple, sin dependencias | Cliente debe instalar PostgreSQL |
| **Electron** | App de escritorio | TODO incluido, UI nativa | Archivo grande (150+ MB) |
| **Docker** | Contenedor | Aislado, fácil deploy | Cliente debe conocer Docker |
| **ZIP Simple** | Carpetas | Tradicional | Cliente debe instalar Node.js |

**Recomendación:** `pkg` para Windows/Linux + PostgreSQL

---

## Opción 1: pkg - Ejecutable Standalone (Recomendada)

### ¿Qué es pkg?

Convierte tu aplicación Node.js en un **ejecutable único** (.exe, .bin):

```
Tu código Node.js  →  pkg  →  isp-sistema.exe (Todo incluido)
```

### Ventajas

✅ Cliente NO necesita instalar Node.js
✅ Código fuente NO visible (compilado)
✅ Un solo archivo ejecutable
✅ Funciona offline

### Desventajas

❌ Cliente debe instalar PostgreSQL
❌ Archivo más grande (~50 MB)

### Cómo Empaquetar

```bash
# 1. Instalar dependencias
npm install

# 2. Empaquetar para Windows
npm run build:windows

# 3. Empaquetar para Linux
npm run build:linux

# 4. Empaquetar para Mac
npm run build:macos

# 5. Empaquetar para todos
npm run build:all

# 6. Crear ZIP final para Windows
npm run package:windows
```

**Resultado:**
```
dist/isp-sistema-windows-v1.0.0.zip
  ├── isp-sistema.exe         ← Ejecutable standalone
  ├── iniciar.bat             ← Script de inicio
  ├── .env.example            ← Configuración de ejemplo
  ├── README.txt              ← Instrucciones
  └── frontend/dist/          ← Frontend buildeado
```

### Qué Entrega el Cliente

1. Instala PostgreSQL
2. Crea base de datos
3. Configura .env
4. Ejecuta `iniciar.bat`
5. Accede a `http://localhost:3000`

**¡Listo! Sin ver código fuente.**

---

## Opción 2: Electron - App de Escritorio

### ¿Qué es Electron?

Crea una **aplicación de escritorio** con Node.js + Chromium integrado:

```
Tu sistema  →  Electron  →  isp-sistema.exe
                              (con ventana propia, como Spotify/Discord)
```

### Ventajas

✅ UI de escritorio nativa
✅ Cliente NO ve código
✅ Instalador profesional (.msi, .dmg)
✅ Puede incluir PostgreSQL embebido

### Desventajas

❌ Archivo MUY grande (150-300 MB)
❌ Más complejo de configurar

### Cómo Empaquetar

```bash
# Instalar Electron
npm install --save-dev electron electron-builder

# Crear configuración
```

Archivo `electron-main.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;
let mainWindow;

function startBackend() {
  backendProcess = spawn('node', [path.join(__dirname, 'backend/index.js')], {
    env: { ...process.env, NODE_ENV: 'production' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Esperar a que backend inicie
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 3000);

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (backendProcess) {
      backendProcess.kill();
    }
  });
}

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
```

Agregar a `package.json`:
```json
{
  "main": "electron-main.js",
  "build": {
    "appId": "com.tuempresa.isp",
    "productName": "Sistema ISP",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "backend/**/*",
      "frontend/dist/**/*",
      "electron-main.js"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    }
  }
}
```

Build:
```bash
npm run build:frontend
npx electron-builder --win
```

**Resultado:** `dist-electron/Sistema ISP Setup 1.0.0.exe`

---

## Opción 3: Docker - Contenedor

### ¿Qué es Docker?

Empaqueta TODO en un contenedor aislado:

```
Sistema + PostgreSQL + Node.js  →  Docker  →  Contenedor
```

### Ventajas

✅ TODO incluido (PostgreSQL, Node.js)
✅ Funciona igual en Windows/Linux/Mac
✅ Fácil actualizar
✅ Código NO visible

### Desventajas

❌ Cliente debe instalar Docker
❌ Más técnico

### Cómo Empaquetar

Archivo `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/

# Copiar frontend buildeado
COPY frontend/dist/ ./frontend/dist/

# Exponer puerto
EXPOSE 3000

CMD ["node", "backend/index.js"]
```

Archivo `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ispuser
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: ispdb
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ispdb
      DB_USER: ispuser
      DB_PASSWORD: changeme
      NODE_ENV: production
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Entregar al cliente:
```bash
# Build
docker-compose build

# Guardar imagen
docker save -o isp-sistema.tar isp-proyecto_app

# Entregar: isp-sistema.tar + docker-compose.yml
```

Cliente instala:
```bash
# Cargar imagen
docker load -i isp-sistema.tar

# Iniciar
docker-compose up -d

# Acceder
http://localhost:3000
```

---

## Opción 4: ZIP Simple (NO Recomendada)

### Solo para Desarrollo

Cliente recibe carpetas:
```
sistema-isp.zip
  ├── backend/
  ├── frontend/dist/
  ├── .env.example
  └── README.txt
```

Cliente debe:
1. Instalar Node.js
2. Instalar PostgreSQL
3. `npm install`
4. `npm start`

**❌ Problema:** Cliente ve el código fuente

---

## Comparación Final

### Para Vender a Clientes No Técnicos

✅ **Opción 1: pkg**
```bash
npm run package:windows
# Entregar: isp-sistema-windows-v1.0.0.zip
```

### Para Vender a Clientes Técnicos

✅ **Opción 3: Docker**
```bash
docker-compose build
docker save -o isp-sistema.tar isp-proyecto_app
# Entregar: isp-sistema.tar + docker-compose.yml
```

### Para Producto Enterprise

✅ **Opción 2: Electron**
```bash
npx electron-builder --win
# Entregar: Sistema ISP Setup 1.0.0.exe
```

---

## Protección del Código Fuente

### pkg (Recomendada)

```javascript
// Tu código:
const express = require('express');
app.get('/api/secret', (req, res) => {
  res.json({ key: 'super-secreto' });
});

// ↓ pkg compila a bytecode

// Cliente ve (con decompilador):
// [Bytecode ilegible]
```

**Nivel de protección:** ⭐⭐⭐⭐ (Muy difícil de descompilar)

### Electron

```
Código empaquetado en .asar
Puede extraerse pero está ofuscado
```

**Nivel de protección:** ⭐⭐⭐ (Difícil)

### Docker

```
Código dentro del contenedor
No accesible fácilmente
```

**Nivel de protección:** ⭐⭐⭐⭐ (Muy difícil)

### Ofuscación Adicional (Opcional)

```bash
npm install -g javascript-obfuscator

javascript-obfuscator backend/ --output backend-obfuscated/
```

---

## Preguntas Frecuentes

### ¿El cliente puede ver mi código?

**pkg/Electron/Docker:** ❌ NO (compilado/empaquetado)
**ZIP simple:** ✅ SÍ (archivos .js visibles)

### ¿Qué pasa con las actualizaciones?

**pkg:** Envías nuevo .exe
**Electron:** Auto-update con electron-updater
**Docker:** `docker pull` nueva imagen

### ¿Nginx es necesario?

**NO.** El backend sirve el frontend automáticamente.

```javascript
// backend/index.js (ya implementado)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

### ¿Qué pasa con el archivo YAML?

**YAML (docker-compose.yml)** es SOLO para Docker y Coturn.
**npm (package.json)** es para gestionar paquetes.

**NO se relacionan. NO hay conflicto.**

Si no usas Docker, NO necesitas YAML.

### ¿Puedo hacer un JAR como Java?

**NO.** JAR es para Java.

Node.js usa:
- **pkg** → .exe
- **Electron** → .exe/.app/.AppImage
- **Docker** → .tar (imagen)

---

## Recomendación Final

### Para tu caso (venta de membresías):

```bash
# 1. Empaquetar con pkg
npm run package:windows

# 2. Entregar ZIP al cliente
isp-sistema-windows-v1.0.0.zip

# 3. Cliente:
#    - Instala PostgreSQL
#    - Ejecuta iniciar.bat
#    - Listo

# 4. Cliente configura TODO desde web
#    - Dominio
#    - WhatsApp
#    - SMS
#    - Email
```

**Ventajas:**
- ✅ Cliente NO ve código
- ✅ Fácil de instalar
- ✅ Sin dependencias complejas
- ✅ Funciona offline

**Sin Nginx, sin YAML, sin complicaciones.**

---

## Siguiente Paso

```bash
# Probar empaquetado
npm run package:windows

# Verificar que funciona
cd dist/package
iniciar.bat

# ¡Listo para vender!
```
