# 🛒 Plugin Marketplace - Guía de Configuración

## 📋 Descripción General

El sistema ISP-Prueba incluye un **Marketplace de Plugins** centralizado que permite a las instalaciones de ISP activar plugins según su tipo de licencia.

### Arquitectura

```
┌─────────────────────┐         ┌─────────────────────┐
│   ISP Frontend      │         │   Store Server      │
│   (Puerto 8080)     │◄────────┤   (Puerto 3001)     │
│                     │  API    │                     │
│  - Marketplace UI   │  Calls  │  - 10 Plugins       │
│  - Plugin Activation│         │  - Licencias        │
│  - License Checking │         │  - Telemetría       │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   ISP Backend       │         │  Store Database     │
│   (Puerto 3000)     │         │  (SQLite)           │
│                     │         │                     │
│  - Plugin Manager   │         │  - Plugins          │
│  - Plugin Install   │         │  - Installations    │
│  - Plugin Activate  │         │  - Licenses         │
└─────────────────────┘         └─────────────────────┘
```

## 🚀 Inicio Rápido

### 1. Iniciar Store Server

```bash
cd store
npm start
# Servidor corriendo en http://localhost:3001
```

### 2. Poblar Base de Datos (Primera vez o Reset)

```bash
cd store
npm run setup
# Crea 10 plugins + 4 licencias de prueba
```

### 3. Iniciar ISP Backend

```bash
cd backend
npm start
# Servidor corriendo en http://localhost:3000
```

### 4. Iniciar ISP Frontend

```bash
cd frontend
npm run serve
# Aplicación corriendo en http://localhost:8080
```

## 🔑 Licencias de Prueba

El sistema incluye **4 licencias de prueba** con diferentes niveles de acceso:

### 📦 Basic License
```
Licencia: TEST-BASIC-23d7abc7
Acceso: Plugins gratuitos básicos
Plugins disponibles:
  ✓ WhatsApp Twilio
  ✓ Telegram Notifications
  ✓ Email Notifications
  ✓ SMS Twilio
  ✓ MercadoPago
  ✓ PayPal
  ✓ Stripe
  ✓ OpenPay
```

### 📦 Medium License
```
Licencia: TEST-MEDIUM-6a940e8d
Acceso: Plugins básicos + premium nivel medio
Plugins disponibles:
  ✓ Todos los plugins Basic
  ✓ WhatsApp Meta API
```

### 📦 Advanced License
```
Licencia: TEST-ADVANCED-3fd8e2fd
Acceso: Plugins básicos + medium + avanzados
Plugins disponibles:
  ✓ Todos los plugins Medium
  (Pendiente: agregar plugins avanzados)
```

### 📦 Enterprise License
```
Licencia: TEST-ENTERPRISE-6ba6b0aa
Acceso: TODOS los plugins sin restricciones
Plugins disponibles:
  ✓ Todos los plugins del marketplace
  ✓ n8n Workflow Automation
  ✓ Futuros plugins premium
```

## 🧩 Plugins Disponibles

### 💬 Comunicación (5 plugins)

| Plugin | Versión | Precio | Licencia Requerida | Descripción |
|--------|---------|--------|--------------------|-------------|
| **WhatsApp Twilio** | 1.0.0 | Gratis | Basic | Notificaciones WhatsApp vía Twilio |
| **WhatsApp Meta API** | 1.0.0 | $19.99 | Medium | WhatsApp oficial Meta Business API |
| **Telegram** | 1.0.0 | Gratis | Basic | Bot de Telegram para notificaciones |
| **Email** | 1.0.0 | Gratis | Basic | SMTP, SendGrid, Mailgun |
| **SMS Twilio** | 1.0.0 | Gratis | Basic | Mensajes SMS vía Twilio |

### 💳 Pasarelas de Pago (4 plugins)

| Plugin | Versión | Precio | Licencia Requerida | Descripción |
|--------|---------|--------|--------------------|-------------|
| **MercadoPago** | 1.0.0 | Gratis | Basic | Pagos para LATAM |
| **PayPal** | 1.0.0 | Gratis | Basic | Pagos internacionales |
| **Stripe** | 1.0.0 | Gratis | Basic | Tarjetas, OXXO, SPEI |
| **OpenPay** | 1.0.0 | Gratis | Basic | Pagos para México |

### 🤖 Automatización (1 plugin)

| Plugin | Versión | Precio | Licencia Requerida | Descripción |
|--------|---------|--------|--------------------|-------------|
| **n8n** | 1.0.0 | $29.99 | Medium | Workflows y automatizaciones |

## 🔧 Configuración

### Frontend (.env)

```bash
# frontend/.env
VUE_APP_MARKETPLACE_URL=http://localhost:3001/api/marketplace
```

### Store (.env)

```bash
# store/.env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# CORS - Orígenes permitidos
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=sqlite:database.sqlite

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
TRUST_PROXY=false
```

## 📡 API Endpoints

### Store API (Puerto 3001)

```bash
# Obtener todos los plugins
GET /api/marketplace/plugins
Query params: ?category=communication&search=whatsapp&licenseKey=TEST-BASIC-xxx

# Obtener detalles de un plugin
GET /api/marketplace/plugins/:pluginId

# Activar plugin (registrar activación)
POST /api/marketplace/plugins/:pluginId/activate
Body: { installationKey, licenseKey }

# Descargar plugin ZIP
POST /api/marketplace/plugins/:pluginId/download
Body: { installationKey }

# Validar licencia
POST /api/licenses/validate
Body: { licenseKey, installationKey }
```

### ISP Backend API (Puerto 3000)

```bash
# Obtener plugins del sistema
GET /api/system-plugins
Headers: x-access-token

# Plugins activos
GET /api/system-plugins/active

# Plugins disponibles en filesystem
GET /api/system-plugins/available

# Instalar plugin desde ZIP
POST /api/system-plugins/install
Headers: x-access-token, Content-Type: multipart/form-data
Body: FormData con archivo 'plugin'

# Activar plugin local
POST /api/system-plugins/:id/activate

# Desactivar plugin
POST /api/system-plugins/:id/deactivate
```

## 🧪 Flujo de Activación de Plugin

### Paso a Paso

1. **Usuario abre Marketplace** en el frontend ISP
   - Navega a `/plugins/marketplace`
   - Frontend llama a Store API: `GET /api/marketplace/plugins?licenseKey=TEST-BASIC-xxx`

2. **Store valida licencia** y filtra plugins
   - Verifica que la licencia existe y está activa
   - Retorna solo plugins permitidos para ese nivel de licencia
   - Marca plugins que requieren upgrade

3. **Usuario hace clic en "Obtener Plugin"**
   - Frontend ejecuta `activateMarketplacePlugin(pluginId, pluginData)`

4. **Sistema verifica si plugin existe en código**
   - Llama a `/api/system-plugins/available`
   - Si NO existe: descarga ZIP desde Store
   - Si existe: continúa con activación

5. **Descarga e instalación** (si es necesario)
   - POST `/api/marketplace/plugins/:id/download`
   - POST `/api/system-plugins/install` (multer recibe ZIP)
   - Extrae ZIP a `backend/src/plugins/[nombre]/`

6. **Registrar activación en Store**
   - POST `/api/marketplace/plugins/:id/activate`
   - Crea registro en tabla `PluginActivation`

7. **Crear plugin en DB local**
   - POST `/api/system-plugins`
   - Marca plugin como activo: `active: true`

8. **Plugin se integra automáticamente**
   - Rutas del plugin se montan en Express
   - Menús aparecen en sidebar
   - Servicios/hooks se ejecutan

## 🐛 Troubleshooting

### Store retorna array vacío

```bash
# Verificar que la DB tiene plugins
cd store
npm run setup

# Verificar en consola
curl http://localhost:3001/api/marketplace/plugins | python3 -m json.tool
```

### CORS Error

```bash
# Verificar ALLOWED_ORIGINS en store/.env
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000

# Verificar que el origin está en la lista de permitidos
# Ver logs del Store para confirmar
```

### Plugin no se instala

```bash
# Verificar permisos de escritura
ls -la backend/src/plugins/
chmod -R 755 backend/src/plugins/

# Verificar uploads directory
mkdir -p backend/src/uploads/plugins
chmod -R 755 backend/src/uploads/
```

### Rate Limit Error

```bash
# Desactivar en desarrollo
# store/.env
TRUST_PROXY=false
RATE_LIMIT_MAX_REQUESTS=1000
```

## 📝 Scripts Útiles

```bash
# Store: Seed plugins (preserva existentes)
cd store && npm run seed

# Store: Seed forzado (borra y recrea)
cd store && npm run seed:force

# Store: Crear licencias de prueba
cd store && npm run create-licenses

# Store: Setup completo (seed + licenses)
cd store && npm run setup

# Backend: Ver plugins disponibles
curl http://localhost:3000/api/system-plugins/available \
  -H "x-access-token: YOUR_TOKEN"

# Frontend: Ver marketplace
# Abrir en navegador: http://localhost:8080/plugins/marketplace
```

## 🔐 Autenticación

### Usar Licencia en Frontend

```javascript
// Al iniciar sesión, guardar licencia en localStorage
localStorage.setItem('licenseKey', 'TEST-BASIC-23d7abc7');
localStorage.setItem('installationKey', 'INSTALL-xxx');

// El plugin.service.js la envía automáticamente
// Ver: frontend/src/services/plugin.service.js:182-185
```

### Testing con curl

```bash
# Sin licencia (solo plugins públicos)
curl http://localhost:3001/api/marketplace/plugins

# Con licencia basic
curl "http://localhost:3001/api/marketplace/plugins?licenseKey=TEST-BASIC-23d7abc7"

# Con licencia enterprise (todos los plugins)
curl "http://localhost:3001/api/marketplace/plugins?licenseKey=TEST-ENTERPRISE-6ba6b0aa"
```

## 📊 Base de Datos

### Store Database (SQLite)

```
store/database.sqlite

Tablas:
- Plugins (10 registros)
- Installations (4 registros de prueba)
- Licenses (4 licencias de prueba)
- PluginActivations (registro de activaciones)
- TelemetryEvents (eventos del sistema)
```

### ISP Database (PostgreSQL/SQLite)

```
Tablas:
- SystemPlugins (plugins instalados localmente)
- SystemPluginConfigs (configuraciones)
- SystemPluginAudits (log de cambios)
```

## 🎯 Próximos Pasos

- [ ] Integración automática de plugins en sidebar
- [ ] Sistema de hooks para plugins
- [ ] Actualización automática de plugins
- [ ] Marketplace de temas
- [ ] Sistema de reviews y ratings
- [ ] Página de detalles de plugin mejorada
- [ ] Preview/demo de plugins antes de instalar
- [ ] Desinstalación segura de plugins

## 📞 Soporte

Para problemas o dudas:
- Revisar logs: `store/logs/` y `backend/logs/`
- Verificar consola del navegador (F12)
- Revisar estado de servers: `ps aux | grep node`

---

**Última actualización:** 2025-12-04
**Versión del sistema:** 1.0.0
