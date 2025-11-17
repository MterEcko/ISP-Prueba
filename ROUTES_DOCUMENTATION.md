# 📋 DOCUMENTACIÓN DE RUTAS - Sistema ISP

## ✅ Rutas Implementadas

### 🗓️ CALENDARIO (Calendar)
**Base:** `/api/calendar`

#### Events
- `GET /api/calendar/events` - Obtener eventos
- `POST /api/calendar/events` - Crear evento
- `PUT /api/calendar/events/:id` - Actualizar evento
- `DELETE /api/calendar/events/:id` - Eliminar evento
- `POST /api/calendar/sync` - Sincronizar desde calendarios externos

#### Google Calendar Integration
- `GET /api/calendar/google/auth-url` - Obtener URL de OAuth
- `GET /api/calendar/google/callback` - Callback de OAuth
- `POST /api/calendar/integrations/google` - Guardar integración
- `DELETE /api/calendar/integrations/google` - Eliminar integración

#### Microsoft Calendar Integration
- `GET /api/calendar/microsoft/auth-url` - Obtener URL de OAuth
- `GET /api/calendar/microsoft/callback` - Callback de OAuth
- `POST /api/calendar/integrations/microsoft` - Guardar integración
- `DELETE /api/calendar/integrations/microsoft` - Eliminar integración

---

### 💬 CHAT
**Base:** `/api/chat`

#### Conversations
- `GET /api/chat/conversations` - Obtener conversaciones
- `POST /api/chat/conversations` - Crear conversación
- `GET /api/chat/conversations/:id/messages` - Obtener mensajes
- `POST /api/chat/conversations/:id/messages` - Enviar mensaje
- `POST /api/chat/conversations/:id/mark-read` - Marcar como leído

#### Telegram
- `GET /api/chat/telegram/status` - Estado de Telegram Bot

---

### 🛒 STORE (Marketplace)
**Base:** `/api/store`

#### Customers
- `GET /api/store/customers` - Listar clientes
- `GET /api/store/customers/top` - Top clientes (por gasto)
- `GET /api/store/customers/:id` - Obtener cliente
- `POST /api/store/customers` - Crear cliente
- `PUT /api/store/customers/:id` - Actualizar cliente
- `DELETE /api/store/customers/:id` - Eliminar cliente
- `GET /api/store/customers/:id/purchases` - Historial de compras
- `GET /api/store/customers/:id/stats` - Estadísticas del cliente

#### Orders
- `GET /api/store/orders` - Listar órdenes
- `GET /api/store/orders/:id` - Obtener orden
- `POST /api/store/orders` - Crear orden
- `PUT /api/store/orders/:id/status` - Actualizar estado
- `POST /api/store/orders/:id/payment` - Procesar pago
- `POST /api/store/orders/:id/cancel` - Cancelar orden
- `POST /api/store/orders/:id/refund` - Reembolsar orden

#### Sales Stats
- `GET /api/store/sales/stats` - Estadísticas de ventas

---

### 📤 PLUGIN UPLOAD
**Base:** `/api/plugin-upload`

- `POST /api/plugin-upload/upload` - Subir plugin (multipart/form-data)
- `GET /api/plugin-upload` - Listar plugins subidos
- `GET /api/plugin-upload/:id` - Obtener plugin
- `PUT /api/plugin-upload/:id/status` - Cambiar estado (publicar/despublicar)
- `DELETE /api/plugin-upload/:id` - Eliminar plugin
- `POST /api/plugin-upload/validate-manifest` - Validar manifest.json

---

### ⚡ N8N INTEGRATION
**Base:** `/api/n8n`

#### Workflows
- `GET /api/n8n/workflows` - Listar workflows
- `POST /api/n8n/workflows` - Crear workflow
- `PUT /api/n8n/workflows/:id` - Actualizar workflow
- `DELETE /api/n8n/workflows/:id` - Eliminar workflow

#### Execution
- `POST /api/n8n/webhook` - Webhook endpoint (NO requiere auth)
- `GET /api/n8n/test-connection` - Probar conexión con n8n
- `POST /api/n8n/trigger` - Ejecutar workflow manualmente

---

## 🔐 Autenticación

Todas las rutas (excepto webhook de n8n) requieren autenticación mediante header:
```
x-access-token: <JWT_TOKEN>
```

---

## 🧪 Pruebas Sugeridas

### 1. Calendario
```bash
# Obtener URL de OAuth de Google
GET /api/calendar/google/auth-url

# Crear evento
POST /api/calendar/events
{
  "title": "Reunión de equipo",
  "startDate": "2024-01-15T10:00:00Z",
  "endDate": "2024-01-15T11:00:00Z",
  "eventType": "meeting"
}
```

### 2. Chat
```bash
# Estado de Telegram
GET /api/chat/telegram/status

# Crear conversación
POST /api/chat/conversations
{
  "name": "Soporte técnico",
  "type": "group",
  "participants": [1, 2, 3]
}
```

### 3. Store
```bash
# Crear cliente
POST /api/store/customers
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "country": "Mexico",
  "password": "securepassword123"
}

# Estadísticas de ventas
GET /api/store/sales/stats?dateFrom=2024-01-01&dateTo=2024-12-31
```

### 4. Plugin Upload
```bash
# Subir plugin
POST /api/plugin-upload/upload
Content-Type: multipart/form-data
{
  "plugin": <archivo.zip>,
  "publish": "true"
}

# Validar manifest
POST /api/plugin-upload/validate-manifest
{
  "name": "Mi Plugin",
  "version": "1.0.0",
  "description": "Plugin de prueba",
  "author": "Desarrollador"
}
```

### 5. n8n
```bash
# Probar conexión
GET /api/n8n/test-connection

# Crear workflow
POST /api/n8n/workflows
{
  "name": "Auto crear ticket",
  "triggerType": "client_created",
  "webhookUrl": "http://localhost:5678/webhook/abc123",
  "isActive": true
}
```

---

## ⚠️ Notas Importantes

1. **Telegram Bot**: Debe estar iniciado en el backend para recibir mensajes
2. **n8n**: Debe estar corriendo en el puerto configurado (default: 5678)
3. **Google/Microsoft Calendar**: Requiere configurar OAuth credentials en `.env`
4. **Plugin Upload**: Los archivos se guardan en `/backend/uploads/plugins/`
5. **Webhooks n8n**: Endpoint `/api/n8n/webhook` NO requiere autenticación (usa API key en header)
