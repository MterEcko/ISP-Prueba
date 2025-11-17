# Guía de Pruebas del Sistema ISP

Esta guía describe todas las funcionalidades del sistema y cómo probarlas.

## 📋 Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Módulos Principales](#módulos-principales)
3. [Nuevas Funcionalidades (6 Implementadas)](#nuevas-funcionalidades)
4. [Configuración del Sistema](#configuración-del-sistema)
5. [Rutas API Disponibles](#rutas-api-disponibles)

---

## 🚀 Configuración Inicial

### Servidor Backend
```bash
cd /home/user/ISP-Prueba/backend
npm install
npm start  # Puerto 3000
```

### Base de Datos
- **Tipo**: SQLite (desarrollo) / PostgreSQL (producción)
- **Archivo**: `backend/database.sqlite`
- **Configuración**: `backend/.env`

### Credenciales por Defecto
- **Licencia Maestra**: `0113-F8D3-9CDD-A5F2-9BB7-6475-7DF8-0BFB`
- Plan: Enterprise
- Clientes: Ilimitados

---

## 📦 Módulos Principales

### 1. **Dashboard**
- **Ruta**: `/dashboard`
- **Descripción**: Panel principal con métricas del sistema
- **Funcionalidades**:
  - Resumen de clientes activos
  - Tickets pendientes
  - Ingresos del mes
  - Gráficos de rendimiento

### 2. **Gestión de Clientes**
- **Ruta**: `/clients`
- **API**: `/api/clients`
- **Funcionalidades**:
  - ✅ Crear cliente
  - ✅ Editar información
  - ✅ Ver historial de servicios
  - ✅ Gestionar suscripciones
  - ✅ Documentos del cliente

**Prueba**:
```bash
# Crear cliente
curl -X POST http://localhost:3000/api/clients \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "1234567890"
  }'
```

### 3. **Inventario**
- **Ruta**: `/inventory`
- **API**: `/api/inventory`
- **Funcionalidades**:
  - ✅ Control de stock
  - ✅ Movimientos de inventario
  - ✅ Ubicaciones y lotes
  - ✅ Reconciliación
  - ✅ Asignación a técnicos

**Módulos**:
- Productos (`/api/inventory/products`)
- Categorías (`/api/inventory/categories`)
- Movimientos (`/api/inventory/movements`)
- Ubicaciones (`/api/inventory/locations`)

### 4. **Tickets de Soporte**
- **Ruta**: `/tickets`
- **API**: `/api/tickets`
- **Funcionalidades**:
  - ✅ Crear tickets
  - ✅ Asignar a técnicos
  - ✅ Comentarios y seguimiento
  - ✅ Cambiar prioridad y estado
  - ✅ Adjuntos

**Estados**: Nuevo, En progreso, Pendiente, Resuelto, Cerrado

### 5. **Facturación**
- **Ruta**: `/billing`
- **API**: `/api/billing`
- **Funcionalidades**:
  - ✅ Facturación automática
  - ✅ Generación de invoices
  - ✅ Pagos manuales
  - ✅ Reportes de ingresos
  - ✅ Configuración de métodos de pago

**Gateways Soportados**:
- PayPal
- Stripe
- Pago manual
- Transferencia bancaria

### 6. **MikroTik**
- **Ruta**: `/mikrotik`
- **API**: `/api/mikrotik`
- **Funcionalidades**:
  - ⚠️ Conexión a routers MikroTik (requiere router físico)
  - ⚠️ Gestión de PPPoE users
  - ⚠️ IP Pools
  - ⚠️ QoS y traffic shaping
  - ⚠️ Sesiones activas

**Nota**: Requiere router MikroTik configurado. No se puede probar sin hardware.

### 7. **Dispositivos**
- **Ruta**: `/devices`
- **API**: `/api/devices`
- **Funcionalidades**:
  - ✅ Registro de dispositivos
  - ✅ Credenciales por dispositivo
  - ✅ Comandos personalizados
  - ✅ Historial de conexiones
  - ✅ SNMP monitoring
  - ✅ Familias y marcas

### 8. **Reportes**
- **Ruta**: `/reports`
- **API**: `/api/reports`
- **Funcionalidades**:
  - ✅ Reportes de facturación
  - ✅ Reportes de inventario
  - ✅ Reportes de clientes
  - ✅ Exportar a PDF/Excel

### 9. **Comunicaciones**
- **Ruta**: `/communications`
- **API**: `/api/communications`
- **Funcionalidades**:
  - ✅ Plantillas de mensajes
  - ✅ Envío de emails
  - ✅ SMS (requiere configuración)
  - ✅ WhatsApp (requiere configuración)
  - ✅ Historial de comunicaciones

---

## 🆕 Nuevas Funcionalidades

### 1. 📅 **Calendario**
- **Ruta Frontend**: `/calendar`
- **API**: `/api/calendar/*`
- **Descripción**: Sistema de calendario con integración a Google Calendar y Microsoft Outlook

**Funcionalidades**:
- ✅ Crear/editar/eliminar eventos
- ✅ Vista mensual, semanal y diaria
- ⚠️ Sincronización con Google Calendar (requiere OAuth)
- ⚠️ Sincronización con Microsoft Calendar (requiere OAuth)
- ✅ Eventos locales sin sincronización

**API Endpoints**:
```
GET    /api/calendar/events              # Listar eventos
POST   /api/calendar/events              # Crear evento
GET    /api/calendar/events/:id          # Ver evento
PUT    /api/calendar/events/:id          # Actualizar evento
DELETE /api/calendar/events/:id          # Eliminar evento
POST   /api/calendar/sync                # Sincronizar con externos
GET    /api/calendar/integrations        # Ver integraciones
```

**Prueba (Sin OAuth)**:
```bash
# Crear evento local
curl -X POST http://localhost:3000/api/calendar/events \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reunión con Cliente",
    "description": "Revisión de servicio",
    "startDate": "2025-11-20T10:00:00",
    "endDate": "2025-11-20T11:00:00",
    "location": "Oficina"
  }'

# Listar eventos
curl http://localhost:3000/api/calendar/events \
  -H "x-access-token: YOUR_TOKEN"
```

### 2. 💬 **Chat con Telegram**
- **Ruta Frontend**: `/chat`
- **API**: `/api/chat/*`
- **Descripción**: Sistema de chat interno con integración de Telegram Bot

**Funcionalidades**:
- ✅ Conversaciones entre administradores
- ✅ Mensajes en tiempo real
- ⚠️ Bot de Telegram (requiere token)
- ✅ Historial de mensajes
- ✅ Notificaciones

**API Endpoints**:
```
GET  /api/chat/conversations          # Listar conversaciones
POST /api/chat/conversations          # Crear conversación
GET  /api/chat/conversations/:id/messages  # Ver mensajes
POST /api/chat/messages               # Enviar mensaje
PUT  /api/chat/conversations/:id/read # Marcar como leído
```

**Prueba (Sin Telegram)**:
```bash
# Crear conversación
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": [1, 2],
    "name": "Equipo Técnico"
  }'

# Enviar mensaje
curl -X POST http://localhost:3000/api/chat/messages \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": 1,
    "message": "Hola equipo!"
  }'
```

### 3. 🏪 **Marketplace / Store**
- **Ruta Frontend**: `/store/dashboard`
- **API**: `/api/store/*`
- **Descripción**: Sistema completo de e-commerce para venta de plugins y licencias

**Funcionalidades**:
- ✅ Gestión de clientes del store
- ✅ Órdenes y carrito de compras
- ✅ Procesamiento de pagos
- ✅ Dashboard de ventas
- ✅ Estadísticas y métricas
- ✅ Top clientes y productos

**API Endpoints**:
```
# Clientes del Store
GET    /api/store/customers              # Listar clientes
POST   /api/store/customers              # Crear cliente
GET    /api/store/customers/:id          # Ver cliente
PUT    /api/store/customers/:id          # Actualizar cliente
DELETE /api/store/customers/:id          # Eliminar cliente
GET    /api/store/customers/:id/purchases # Historial de compras
GET    /api/store/customers/top          # Top clientes

# Órdenes
GET    /api/store/orders                 # Listar órdenes
POST   /api/store/orders                 # Crear órden
GET    /api/store/orders/:id             # Ver órden
PUT    /api/store/orders/:id/status      # Actualizar estado
POST   /api/store/orders/:id/payment     # Procesar pago
POST   /api/store/orders/:id/cancel      # Cancelar órden
POST   /api/store/orders/:id/refund      # Reembolsar

# Estadísticas
GET    /api/store/sales/stats            # Estadísticas de ventas
```

**Prueba**:
```bash
# Crear cliente del store
curl -X POST http://localhost:3000/api/store/customers \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@store.com",
    "fullName": "Cliente Prueba",
    "company": "Mi Empresa",
    "country": "MX"
  }'

# Ver estadísticas
curl http://localhost:3000/api/store/sales/stats \
  -H "x-access-token: YOUR_TOKEN"
```

### 4. 🔌 **Sistema de Upload de Plugins**
- **Ruta Frontend**: `/plugins/upload`
- **API**: `/api/plugin-upload/*`
- **Descripción**: Interfaz web para subir plugins al marketplace

**Funcionalidades**:
- ✅ Upload de archivos ZIP
- ✅ Validación de manifest.json
- ✅ Extracción automática
- ✅ Hash SHA256 para verificación
- ✅ Publish/Unpublish plugins
- ✅ Categorización
- ✅ Drag & drop upload

**Estructura de Plugin**:
```
mi-plugin.zip
├── manifest.json      # Requerido
├── main.js           # Código principal
├── README.md
└── assets/
```

**manifest.json**:
```json
{
  "name": "Mi Plugin",
  "version": "1.0.0",
  "description": "Descripción del plugin",
  "author": "Tu Nombre",
  "category": "utilidades",
  "dependencies": []
}
```

**API Endpoints**:
```
POST   /api/plugin-upload/upload         # Subir plugin (multipart/form-data)
GET    /api/plugin-upload                # Listar plugins
GET    /api/plugin-upload/:id            # Ver plugin
PUT    /api/plugin-upload/:id/status     # Publicar/despublicar
DELETE /api/plugin-upload/:id            # Eliminar plugin
POST   /api/plugin-upload/validate-manifest  # Validar manifest
```

**Prueba**:
```bash
# Crear manifest de prueba
cat > /tmp/manifest.json << 'EOF'
{
  "name": "Plugin de Prueba",
  "version": "1.0.0",
  "description": "Plugin de ejemplo",
  "author": "Admin",
  "category": "utilidades"
}
EOF

# Crear main.js
echo "console.log('Plugin cargado');" > /tmp/main.js

# Crear ZIP
cd /tmp
zip test-plugin.zip manifest.json main.js

# Upload
curl -X POST http://localhost:3000/api/plugin-upload/upload \
  -H "x-access-token: YOUR_TOKEN" \
  -F "plugin=@/tmp/test-plugin.zip"
```

### 5. 📊 **Dashboard de Ganancias**
- **Ruta Frontend**: `/store/dashboard`
- **API**: `/api/store/sales/stats`
- **Descripción**: Dashboard con métricas de ventas y ganancias

**Métricas Incluidas**:
- ✅ Ventas totales del mes
- ✅ Gráfico de ventas mensuales
- ✅ Top 10 productos más vendidos
- ✅ Top 10 clientes
- ✅ Tasa de conversión
- ✅ Ingresos por categoría

### 6. 🔄 **Integración con n8n**
- **Ruta Frontend**: No tiene (configuración desde n8n)
- **API**: `/api/n8n/*`
- **Descripción**: Automatización de workflows con n8n

**Funcionalidades**:
- ✅ Registrar workflows
- ✅ Triggers automáticos
- ⚠️ Webhooks (requiere n8n instalado)
- ✅ Ejecutar acciones del sistema

**Triggers Disponibles**:
- `client_created` - Al crear un cliente
- `ticket_created` - Al crear un ticket
- `invoice_overdue` - Factura vencida
- `payment_received` - Pago recibido
- `service_suspended` - Servicio suspendido
- `custom` - Trigger personalizado

**API Endpoints**:
```
GET    /api/n8n/workflows            # Listar workflows
POST   /api/n8n/workflows            # Crear workflow
PUT    /api/n8n/workflows/:id        # Actualizar workflow
DELETE /api/n8n/workflows/:id        # Eliminar workflow
POST   /api/n8n/workflows/:id/trigger # Ejecutar workflow
POST   /api/n8n/webhook              # Webhook para n8n (sin auth)
GET    /api/n8n/test-connection      # Probar conexión
```

**Prueba (Sin n8n)**:
```bash
# Crear workflow
curl -X POST http://localhost:3000/api/n8n/workflows \
  -H "x-access-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notificar cliente nuevo",
    "triggerType": "client_created",
    "webhookUrl": "http://localhost:5678/webhook/test",
    "active": true,
    "config": {
      "sendEmail": true,
      "emailTemplate": "welcome"
    }
  }'
```

---

## ⚙️ Configuración del Sistema

### 1. **Logo Personalizado**
- **Ruta**: `/settings`
- **Ubicación**: `frontend/src/assets/logo.png`
- **Formatos**: PNG, JPG, SVG
- **Tamaño recomendado**: 200x200px

### 2. **Plantillas de Email**
- **Ruta**: `/communications` → Plantillas
- **API**: `/api/templates`
- **Tipos**:
  - Bienvenida
  - Recordatorio de pago
  - Suspensión de servicio
  - Reactivación
  - Factura generada
  - Ticket creado

**Variables disponibles**:
- `{firstName}`, `{lastName}`, `{fullName}`
- `{email}`, `{phone}`
- `{amount}`, `{dueDate}`, `{daysOverdue}`
- `{invoiceNumber}`, `{ticketNumber}`
- `{serviceName}`, `{serviceSpeed}`

### 3. **Plantillas de Documentos**
- **Ruta**: `/document-templates`
- **API**: `/api/document-templates`
- **Tipos**:
  - Contrato de servicio
  - Recibo de pago
  - Ficha de instalación
  - Orden de servicio
  - Carta responsiva

**Formatos de exportación**:
- PDF
- DOCX
- HTML

### 4. **Ficha de Pago**
- **Ruta**: `/billing` → Configuración
- **Descripción**: Plantilla para recibos de pago
- **Personalizable**:
  - Logo de empresa
  - Datos fiscales
  - Métodos de pago aceptados
  - Términos y condiciones
  - Código QR para pago

---

## 🔐 Gestión de Usuarios y Roles

### Usuarios
- **Ruta**: `/users`
- **API**: `/api/users`
- **Funcionalidades**:
  - ✅ Crear/editar usuarios
  - ✅ Asignar roles
  - ✅ Activar/desactivar
  - ✅ Resetear contraseña
  - ✅ Ver actividad

### Roles y Permisos
- **Ruta**: `/roles`
- **API**: `/api/roles`
- **Roles predeterminados**:
  - **Admin**: Acceso total
  - **Técnico**: Tickets, clientes, dispositivos
  - **Facturación**: Clientes, facturación, pagos
  - **Soporte**: Tickets, comunicaciones

**Permisos granulares**:
- `clients.view`, `clients.create`, `clients.edit`, `clients.delete`
- `inventory.view`, `inventory.create`, `inventory.edit`
- `tickets.view`, `tickets.assign`, `tickets.close`
- `billing.view`, `billing.create`, `billing.process`
- `users.view`, `users.create`, `users.edit`
- `settings.view`, `settings.edit`

---

## 📝 Licencias del Sistema

### Licencia Maestra
- **Clave**: `0113-F8D3-9CDD-A5F2-9BB7-6475-7DF8-0BFB`
- **Plan**: Enterprise
- **Características**:
  - Clientes ilimitados
  - Usuarios ilimitados
  - Todos los módulos habilitados
  - Sin fecha de expiración
  - Soporte prioritario

### Gestión de Licencias
- **Ruta**: `/settings` → Licencias
- **API**: `/api/system/license`

---

## 🧪 Scripts de Prueba

### Prueba Completa del Sistema
```bash
#!/bin/bash

# Variables
BASE_URL="http://localhost:3000"
TOKEN=""  # Se obtiene después del login

# 1. Crear usuario
echo "Creando usuario..."
curl -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@isp.com",
    "password": "Admin123!",
    "fullName": "Administrador Sistema"
  }'

# 2. Login
echo "Iniciando sesión..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

# 3. Probar módulos
echo "Probando calendario..."
curl -X GET $BASE_URL/api/calendar/events \
  -H "x-access-token: $TOKEN"

echo "Probando chat..."
curl -X GET $BASE_URL/api/chat/conversations \
  -H "x-access-token: $TOKEN"

echo "Probando store..."
curl -X GET $BASE_URL/api/store/sales/stats \
  -H "x-access-token: $TOKEN"

echo "Probando plugins..."
curl -X GET $BASE_URL/api/plugin-upload \
  -H "x-access-token: $TOKEN"

echo "Probando n8n..."
curl -X GET $BASE_URL/api/n8n/workflows \
  -H "x-access-token: $TOKEN"
```

---

## 📊 Resumen de Estado

### ✅ Completamente Funcional (Sin Dependencias Externas)
- Dashboard
- Clientes
- Inventario
- Tickets
- Dispositivos
- Usuarios y Roles
- Licencias
- Documentos
- Calendario (eventos locales)
- Chat (conversaciones internas)
- Store/Marketplace
- Upload de Plugins
- N8N workflows (registro)

### ⚠️ Requiere Configuración Externa
- MikroTik (requiere router físico)
- Google Calendar (requiere OAuth credentials)
- Microsoft Calendar (requiere OAuth credentials)
- Telegram Bot (requiere bot token)
- SMS (requiere proveedor SMS)
- WhatsApp (requiere API de WhatsApp)
- N8N Webhooks (requiere n8n instalado)
- PayPal/Stripe (requiere API keys)

---

## 🎯 Conclusión

El sistema ISP está completamente funcional con todas las características principales implementadas. Las 6 nuevas funcionalidades (Calendario, Chat, Store, Plugins, Dashboard de Ganancias, N8N) están integradas y accesibles desde el sidebar.

**Para probar en navegador**:
1. Backend: `cd backend && npm start`
2. Frontend: `cd frontend && npm run serve`
3. Acceder a: `http://localhost:8080`

**Próximos pasos recomendados**:
- Configurar OAuth para Google/Microsoft Calendar
- Crear Telegram Bot para chat
- Configurar n8n para automatizaciones
- Agregar gateways de pago reales
