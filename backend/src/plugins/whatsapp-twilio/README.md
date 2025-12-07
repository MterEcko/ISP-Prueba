# WhatsApp Twilio Plugin

Plugin de WhatsApp usando Twilio para ISP-Prueba

## 📋 Descripción

Este plugin permite integrar WhatsApp Business mediante Twilio para enviar y recibir mensajes, gestionar conversaciones y automatizar respuestas.

## ✨ Características

- ✅ Envío de mensajes de WhatsApp
- ✅ Recepción de mensajes mediante webhooks
- ✅ Gestión de conversaciones
- ✅ Envío masivo de mensajes
- ✅ Soporte para multimedia (imágenes, documentos)
- ✅ Respuestas automáticas
- ✅ Historial completo de conversaciones
- ✅ Estadísticas de mensajes

## 🚀 Instalación

### 1. Requisitos Previos

- Cuenta de Twilio (https://www.twilio.com/)
- WhatsApp Business API habilitado en Twilio
- Número de WhatsApp Business aprobado

### 2. Obtener Credenciales de Twilio

1. Ve a tu [Twilio Console](https://www.twilio.com/console)
2. Copia tu **Account SID**
3. Copia tu **Auth Token**
4. Ve a "Messaging" > "Try it out" > "Send a WhatsApp message"
5. Copia tu **número de WhatsApp** (ej: `+14155238886`)

### 3. Configurar el Plugin

1. Activa el plugin desde el marketplace
2. Configura las credenciales:

```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "your_auth_token_here",
  "phoneNumber": "+14155238886",
  "enableAutoResponse": false,
  "autoResponseMessage": "Gracias por contactarnos. Un agente te responderá pronto."
}
```

### 4. Configurar Webhook en Twilio

1. Ve a tu [Twilio Console](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. En "Sandbox Configuration", pega tu URL de webhook:
   ```
   https://tu-dominio.com/api/plugins/whatsapp-twilio/webhook
   ```
3. Selecciona método `POST`
4. Guarda los cambios

## 📖 Uso

### Enviar Mensaje Simple

```javascript
// POST /api/plugins/whatsapp-twilio/send
{
  "to": "+5215512345678",
  "message": "Hola, este es un mensaje de prueba desde WhatsApp"
}
```

### Enviar Mensaje con Imagen

```javascript
// POST /api/plugins/whatsapp-twilio/send
{
  "to": "+5215512345678",
  "message": "Aquí está tu recibo",
  "mediaUrl": "https://example.com/imagen.jpg"
}
```

### Envío Masivo

```javascript
// POST /api/plugins/whatsapp-twilio/send-bulk
{
  "recipients": [
    { "phone": "+5215512345678" },
    { "phone": "+5215587654321" }
  ],
  "message": "Mensaje masivo para todos",
  "delayMs": 1000
}
```

### Probar Conexión

```javascript
// POST /api/plugins/whatsapp-twilio/test
{
  "testPhoneNumber": "+5215512345678"
}
```

### Obtener Estadísticas

```javascript
// GET /api/plugins/whatsapp-twilio/statistics?days=30
```

## 🔧 API Reference

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/send` | Enviar mensaje individual |
| POST | `/send-bulk` | Envío masivo de mensajes |
| POST | `/webhook` | Webhook para recibir mensajes |
| POST | `/test` | Probar conexión |
| GET | `/status` | Estado del plugin |
| GET | `/statistics` | Estadísticas de mensajes |
| GET | `/message/:messageSid` | Estado de un mensaje |

### Formato de Números

Los números deben incluir código de país:
- ✅ `+5215512345678` (Correcto)
- ✅ `+14155238886` (Correcto)
- ❌ `5512345678` (Incorrecto)
- ❌ `(555) 123-4567` (Incorrecto)

## 🔐 Seguridad

- Las credenciales se almacenan de forma encriptada
- Los webhooks validan la firma de Twilio
- Solo usuarios autenticados pueden enviar mensajes
- Rate limiting automático para envíos masivos

## 💰 Costos

Revisa los precios de Twilio WhatsApp:
- **Mensajes entrantes**: Gratis
- **Mensajes salientes**:
  - Sesión iniciada por usuario: $0.005 USD
  - Mensaje fuera de sesión: $0.02 USD

Ver precios completos: https://www.twilio.com/whatsapp/pricing

## 🐛 Troubleshooting

### Error: "Account SID inválido"
- Verifica que copiaste correctamente el Account SID
- Debe comenzar con `AC`

### Error: "Número no autorizado"
- Verifica que el número esté aprobado en Twilio
- En sandbox, solo números pre-aprobados pueden recibir mensajes

### Mensajes no se reciben
- Verifica que el webhook esté configurado correctamente en Twilio
- Asegúrate que la URL sea accesible públicamente (usa ngrok para desarrollo)

### Rate Limit Exceeded
- Twilio limita a 1 mensaje por segundo por número
- El plugin implementa delays automáticos para envíos masivos

## 📚 Recursos

- [Documentación de Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)
- [Twilio WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox)
- [Twilio Console](https://www.twilio.com/console)

## 📝 Licencia

MIT License - ISP-Prueba Team

## 🆘 Soporte

- Email: soporte@isp-prueba.com
- Documentación: https://docs.isp-prueba.com
