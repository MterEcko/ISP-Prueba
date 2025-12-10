# Sistema ISP - Versión SaaS/Membresía

Sistema completo de gestión para ISP listo para vender como servicio (SaaS/Membresía).

---

## ✅ Características Principales

### Sin Código Visible
- ✅ Clientes configuran TODO desde interfaz web
- ✅ No necesitan modificar archivos
- ✅ Código compilado/empaquetado

### Sin Nginx Necesario
- ✅ Backend sirve frontend automáticamente
- ✅ Un solo servidor, un solo puerto
- ✅ Más simple para clientes

### CORS Dinámico
- ✅ Dominios se configuran desde base de datos
- ✅ Clientes agregan su dominio vía web
- ✅ Sin reiniciar servidor

### Configuración Centralizada
- ✅ Todo en base de datos encriptada (AES-256)
- ✅ WhatsApp, SMS, Email, Telegram desde web
- ✅ Sin archivos .env visibles

---

## 🚀 Inicio Rápido

### Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run serve

# Acceder
http://localhost:8080
```

### Producción (Sin Nginx)

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Iniciar backend (sirve todo)
cd backend
npm start

# Acceder
http://localhost:3000
```

### Empaquetar para Clientes

```bash
# Opción 1: Ejecutable Windows
npm run package:windows

# Opción 2: Docker
docker-compose build

# Opción 3: Electron
npx electron-builder --win
```

Ver: [`EMPAQUETADO_PARA_CLIENTES.md`](EMPAQUETADO_PARA_CLIENTES.md)

---

## 📋 Arquitectura

```
Cliente accede a: https://sudominio.com
         ↓
    Node.js :3000
         ↓
    ├─→ /api → Backend (Express)
    ├─→ /uploads → Archivos estáticos
    ├─→ /socket.io → WebSocket (Socket.io)
    └─→ /* → Frontend (Vue buildeado)
```

**NO necesita Nginx. Todo en un solo servidor.**

---

## 🔐 Seguridad

### CORS Dinámico

```javascript
// Cliente configura desde: Configuración → Sistema → Dominio
{
  "systemDomain": "miempresa-isp.com",
  "allowedOrigins": [
    "https://miempresa-isp.com",
    "https://www.miempresa-isp.com"
  ]
}

// Backend carga desde DB al iniciar
// Se recarga sin reiniciar: POST /api/settings/cors/reload
```

### Credenciales Encriptadas

```javascript
// Todas las credenciales se guardan encriptadas (AES-256)
configHelper.set('whatsappApiToken', 'SECRET');
// ↓ DB: "8f3a:9c2e7b1d4a5f..."

// Cliente NO ve código, solo interfaz web
```

---

## 📦 Integr

aciones

### WhatsApp
- Twilio API
- Meta WhatsApp Business API
- Configurable desde web

### SMS
- Teléfono Android (SMS Gateway API)
- Configurable desde web

### Email
- SMTP (Gmail, SendGrid, etc.)
- Configurable desde web

### Telegram
- Bot API
- Dual bot (notificaciones + soporte)
- Configurable desde web

### Videollamadas
- WebRTC con Socket.io
- TURN server opcional (Coturn)
- Para usuarios remotos

### n8n
- Webhooks integrados
- Automatización de workflows

---

## 🛠️ Servicios

### Gestión de Clientes
- Clientes, servicios, planes
- Suspensión automática
- Geolocalización en mapa

### Facturación
- Generación automática de facturas
- Recordatorios de pago (Email/SMS/WhatsApp)
- Integración MercadoPago/PayPal

### Soporte Técnico
- Sistema de tickets
- Chat en tiempo real (Telegram integrado)
- Videollamadas

### Inventario
- Equipos de red (serial, MAC)
- Consumibles (cables, conectores)
- Control de stock

### Red
- Integración Mikrotik
- Monitoreo de dispositivos
- Gestión PPPoE

---

## 📚 Documentación

### Para Desarrollo
- [`INSTALACION_NGINX.md`](INSTALACION_NGINX.md) - Nginx (opcional)
- [`MODO_PRODUCCION.md`](MODO_PRODUCCION.md) - Build estático
- [`INSTRUCCIONES_HTTPS_COTURN.md`](INSTRUCCIONES_HTTPS_COTURN.md) - HTTPS + Videollamadas

### Para Clientes
- [`GUIA_INSTALACION_CLIENTE.md`](GUIA_INSTALACION_CLIENTE.md) - Guía completa
- [`EMPAQUETADO_PARA_CLIENTES.md`](EMPAQUETADO_PARA_CLIENTES.md) - Cómo empaquetar

### Configuración
- `nginx.conf` - Configuración Nginx (opcional)
- `docker-compose.coturn.yml` - TURN server (opcional)
- `package.json` - Scripts de empaquetado

---

## ❓ FAQ

### ¿Es necesario Nginx?

**NO.** El backend sirve el frontend automáticamente.

```javascript
// backend/index.js (ya implementado)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
```

Solo usa Nginx si:
- Necesitas proxy inverso complejo
- Tienes múltiples apps en un servidor
- Necesitas balanceo de carga

Para la mayoría de clientes: **NO necesitas Nginx**.

### ¿Por qué hay archivos YAML?

YAML (`.yml`) es SOLO para Docker Compose (Coturn - servidor TURN).

```
npm (package.json)     →  Gestión de paquetes Node.js
YAML (docker-compose.yml) →  Configuración Docker (Coturn)

NO se relacionan. NO hay conflicto.
```

**Si no usas Docker/Coturn → NO necesitas YAML.**

### ¿Cómo lo entrego al cliente?

**Opción 1: Ejecutable (Recomendada)**
```bash
npm run package:windows
# Entregar: isp-sistema-windows-v1.0.0.zip
```

**Opción 2: Docker**
```bash
docker-compose build
docker save -o isp-sistema.tar isp_app
# Entregar: isp-sistema.tar
```

**Opción 3: Electron**
```bash
npx electron-builder --win
# Entregar: Sistema ISP Setup.exe
```

Ver: [`EMPAQUETADO_PARA_CLIENTES.md`](EMPAQUETADO_PARA_CLIENTES.md)

### ¿El cliente puede ver mi código?

**NO.** Con pkg/Electron/Docker el código está compilado/empaquetado.

Cliente solo ve:
- ✅ Interfaz web
- ✅ Configuración desde web
- ❌ NO ve código fuente

### ¿Cómo actualizo el sistema?

```bash
# Generar nueva versión
npm run package:windows

# Entregar nuevo ZIP al cliente
# Cliente reemplaza ejecutable y reinicia
```

Con Electron puedes hacer auto-update automático.

### ¿Funciona offline?

Sí, excepto:
- Email (requiere internet para SMTP)
- WhatsApp (requiere internet)
- SMS (si usas teléfono en red local, funciona offline)
- Telegram (requiere internet)

El sistema core funciona 100% offline.

---

## 💰 Modelo de Negocio

### Venta como Membresía/SaaS

**Precio Sugerido:**
- Setup único: $500 - $1000 USD
- Mensualidad: $50 - $200 USD

**Incluye:**
- ✅ Sistema completo
- ✅ Actualizaciones
- ✅ Soporte técnico
- ✅ Configuración inicial

**Cliente obtiene:**
- Sistema instalado en su servidor
- Configuración desde web
- Sin límite de usuarios/clientes
- Sin costos por transacción

**Tú obtienes:**
- Ingreso recurrente mensual
- Escalable (1000+ clientes)
- Sin soporte técnico constante (self-service)

---

## 🎯 Próximos Pasos

### 1. Probar en Producción

```bash
# Build frontend
cd frontend
npm run build

# Iniciar backend
cd backend
NODE_ENV=production npm start

# Acceder
http://localhost:3000
```

### 2. Configurar Dominio

```
1. Acceder a sistema
2. Login: admin/admin123
3. Configuración → Sistema → Dominio
4. Agregar: https://tudominio.com
5. Guardar → Recargar CORS
```

### 3. Empaquetar para Cliente

```bash
npm run package:windows
```

### 4. Vender

```
1. Entregar ZIP al cliente
2. Cliente instala PostgreSQL
3. Cliente ejecuta iniciar.bat
4. Cliente configura desde web
5. ¡Listo! Cobra mensualidad
```

---

## 📞 Soporte

Este sistema está listo para venta. Incluye:

- ✅ Código sin dependencias de Nginx
- ✅ CORS dinámico desde DB
- ✅ Configuración 100% web
- ✅ Scripts de empaquetado
- ✅ Documentación completa
- ✅ Protección de código fuente

**¡Listo para vender a tus clientes!**

---

## Licencia

Este sistema es propietario. Los clientes obtienen licencia de uso, NO el código fuente.

---

**Desarrollado para venta como SaaS/Membresía** 🚀
