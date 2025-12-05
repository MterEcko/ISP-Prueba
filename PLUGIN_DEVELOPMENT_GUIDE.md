# 📘 Guía de Desarrollo de Plugins - ISP-Prueba

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Plugins](#arquitectura-de-plugins)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Manifest.json - Configuración](#manifestjson---configuración)
5. [Controller - Lógica Principal](#controller---lógica-principal)
6. [Service - Lógica de Negocio](#service---lógica-de-negocio)
7. [Routes - Rutas API](#routes---rutas-api)
8. [Package.json - Dependencias](#packagejson---dependencias)
9. [Ejemplos Completos](#ejemplos-completos)
10. [Empaquetado y Distribución](#empaquetado-y-distribución)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Introducción

El sistema ISP-Prueba utiliza una **arquitectura modular de plugins** que permite extender funcionalidades sin modificar el código base. Los plugins se pueden:

- ✅ Desarrollar independientemente
- ✅ Distribuir a través del Marketplace
- ✅ Activar/Desactivar sin reiniciar el servidor
- ✅ Configurar mediante interfaz web
- ✅ Actualizar automáticamente

### Tipos de Plugins Soportados

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| `communication` | Canales de comunicación | WhatsApp, Email, SMS, Telegram |
| `payment` | Pasarelas de pago | MercadoPago, Stripe, PayPal |
| `automation` | Automatización | n8n, Workflows |
| `integration` | Integraciones externas | CRMs, ERPs |
| `reporting` | Reportes y analytics | BI, Dashboards |
| `security` | Seguridad | 2FA, Firewalls |

---

## Arquitectura de Plugins

### Ciclo de Vida de un Plugin

```
┌─────────────────┐
│   Marketplace   │
│   (Store API)   │
└────────┬────────┘
         │ 1. Usuario hace clic en "Obtener"
         ▼
┌─────────────────┐
│   Descarga ZIP  │
│  desde Store    │
└────────┬────────┘
         │ 2. Descarga plugin.zip
         ▼
┌─────────────────┐
│  Instalación    │
│  (Backend ISP)  │
└────────┬────────┘
         │ 3. Extrae ZIP a plugins/[nombre]/
         │ 4. Lee manifest.json
         │ 5. Instala dependencias (npm install)
         ▼
┌─────────────────┐
│   Activación    │
│  (Plugin Mgr)   │
└────────┬────────┘
         │ 6. Ejecuta initialize()
         │ 7. Monta rutas en Express
         │ 8. Registra en DB
         ▼
┌─────────────────┐
│ Plugin Activo   │
│ (En Producción) │
└─────────────────┘
```

### Ubicación de Archivos

```
ISP-Prueba/
├── backend/
│   └── src/
│       └── plugins/
│           └── [nombre-plugin]/        ← Tu plugin aquí
│               ├── manifest.json       ← Configuración
│               ├── package.json        ← Dependencias
│               └── src/
│                   ├── [nombre].controller.js  ← Lógica
│                   ├── [nombre].service.js     ← Servicios
│                   └── [nombre].routes.js      ← Rutas
└── store/
    └── plugins/
        └── [nombre-plugin].zip         ← Distribución
```

---

## Estructura de Archivos

### Ejemplo: Plugin de Email

```
backend/src/plugins/email/
├── manifest.json          # Configuración del plugin
├── package.json           # Dependencias NPM
├── README.md              # Documentación
└── src/
    ├── email.controller.js    # Controller principal
    ├── email.service.js       # Lógica de negocio
    └── email.routes.js        # Rutas Express
```

### Archivos Obligatorios

| Archivo | Obligatorio | Descripción |
|---------|-------------|-------------|
| `manifest.json` | ✅ Sí | Metadata y configuración |
| `package.json` | ✅ Sí | Dependencias NPM |
| `src/[nombre].controller.js` | ✅ Sí | Controller principal |
| `src/[nombre].service.js` | ⚠️ Recomendado | Lógica de negocio |
| `src/[nombre].routes.js` | ⚠️ Opcional | Rutas personalizadas |
| `README.md` | ⚠️ Opcional | Documentación |

---

## Manifest.json - Configuración

El `manifest.json` es el **archivo más importante**. Define cómo el sistema interactúa con tu plugin.

### Estructura Completa

```json
{
  "name": "email",
  "version": "1.0.0",
  "description": "Plugin para envío de correos electrónicos",
  "category": "communication",
  "author": "Tu Nombre o Empresa",
  "main": "src/email.controller.js",
  "channelType": "email",
  "capabilities": ["send", "verify", "template", "webhook"],
  "providers": ["smtp", "sendgrid", "mailgun"],
  "countries": ["all"],
  "tables": [],
  "routes": [
    {
      "path": "/webhook/email",
      "method": "POST",
      "handler": "handleWebhook"
    }
  ],
  "configSchema": {
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["smtp", "sendgrid", "mailgun"],
        "title": "Proveedor de Email",
        "description": "Seleccione el proveedor a utilizar"
      },
      "from": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "title": "Nombre" },
          "email": { "type": "string", "format": "email", "title": "Email" }
        },
        "required": ["name", "email"]
      }
    },
    "required": ["provider", "from"]
  },
  "permissions": [
    "send_emails",
    "manage_email_templates",
    "view_email_statistics"
  ],
  "webhookSupport": {
    "sendgrid": {
      "events": ["delivered", "bounce", "dropped"],
      "signatureHeader": "X-Twilio-Email-Event-Webhook-Signature"
    }
  },
  "minimumVersions": {
    "node": "14.0.0",
    "system": "1.0.0"
  }
}
```

### Campos del Manifest

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `name` | string | ✅ | Identificador único (slug) |
| `version` | string | ✅ | Versión semántica (1.0.0) |
| `description` | string | ✅ | Descripción breve |
| `category` | string | ✅ | Categoría del plugin |
| `author` | string | ✅ | Nombre del desarrollador |
| `main` | string | ✅ | Archivo controller principal |
| `channelType` | string | ⚠️ | Tipo de canal (email, sms, whatsapp) |
| `capabilities` | array | ⚠️ | Capacidades del plugin |
| `providers` | array | ⚠️ | Proveedores soportados |
| `countries` | array | ⚠️ | Países soportados o ["all"] |
| `tables` | array | ⚠️ | Tablas de DB personalizadas |
| `routes` | array | ⚠️ | Rutas adicionales |
| `configSchema` | object | ⚠️ | JSON Schema para configuración |
| `permissions` | array | ⚠️ | Permisos requeridos |
| `webhookSupport` | object | ⚠️ | Config de webhooks |
| `minimumVersions` | object | ⚠️ | Versiones mínimas |

### Config Schema (JSON Schema)

El `configSchema` define la configuración que el usuario puede modificar en la UI:

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Tu clave de API",
        "format": "password"
      },
      "enabled": {
        "type": "boolean",
        "title": "Activado",
        "default": true
      },
      "maxRetries": {
        "type": "number",
        "title": "Máximo de Reintentos",
        "minimum": 1,
        "maximum": 10,
        "default": 3
      },
      "country": {
        "type": "string",
        "enum": ["MX", "AR", "BR", "CL"],
        "title": "País"
      }
    },
    "required": ["apiKey", "country"]
  }
}
```

**Tipos soportados:** `string`, `number`, `boolean`, `object`, `array`

**Formatos:** `email`, `password`, `url`, `date-time`

---

## Controller - Lógica Principal

El controller es el **punto de entrada** de tu plugin. Debe implementar métodos específicos.

### Estructura Básica

```javascript
// src/email.controller.js
const emailService = require('./email.service');
const logger = require('../../../utils/logger');

class EmailController {
  /**
   * ✅ OBLIGATORIO: Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'email',
      version: '1.0.0',
      description: 'Plugin para envío de correos electrónicos',
      category: 'communication',
      author: 'Sistema ISP',
      capabilities: ['send', 'verify', 'template'],
      supportedMethods: ['smtp', 'sendgrid', 'mailgun']
    };
  }

  /**
   * ✅ OBLIGATORIO: Inicializar plugin
   * Se ejecuta cuando se activa el plugin
   */
  static async initialize(config) {
    try {
      logger.info('[Email Plugin] Inicializando...');

      // Validar configuración
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Inicializar servicio con la configuración
      await emailService.initialize(config);

      logger.info('[Email Plugin] ✅ Inicializado correctamente');
      return { success: true, message: 'Plugin inicializado' };

    } catch (error) {
      logger.error('[Email Plugin] ❌ Error al inicializar:', error);
      throw error;
    }
  }

  /**
   * ⚠️ RECOMENDADO: Validar configuración
   */
  static validateConfig(config) {
    const errors = [];

    if (!config.provider) {
      errors.push('Provider es requerido');
    }

    if (!config.from || !config.from.email) {
      errors.push('Email del remitente es requerido');
    }

    if (config.provider === 'smtp' && !config.smtp) {
      errors.push('Configuración SMTP es requerida');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * ✅ OBLIGATORIO: Enviar mensaje
   * Método principal del plugin
   */
  static async send(data) {
    try {
      const { to, subject, body, attachments } = data;

      logger.info(`[Email Plugin] Enviando email a: ${to}`);

      // Delegar al servicio
      const result = await emailService.sendEmail({
        to,
        subject,
        body,
        attachments
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: result.provider
      };

    } catch (error) {
      logger.error('[Email Plugin] Error al enviar:', error);
      throw error;
    }
  }

  /**
   * ⚠️ OPCIONAL: Verificar estado
   */
  static async verify(messageId) {
    return await emailService.verifyDelivery(messageId);
  }

  /**
   * ⚠️ OPCIONAL: Webhook handler
   */
  static async handleWebhook(req, res) {
    try {
      const { provider } = req.body;

      logger.info(`[Email Plugin] Webhook recibido de ${provider}`);

      const result = await emailService.processWebhook(req.body);

      res.status(200).json({ success: true, result });

    } catch (error) {
      logger.error('[Email Plugin] Error en webhook:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * ⚠️ OPCIONAL: Cleanup al desactivar
   */
  static async cleanup() {
    logger.info('[Email Plugin] Limpiando recursos...');
    await emailService.disconnect();
    return { success: true };
  }
}

module.exports = EmailController;
```

### Métodos Obligatorios

| Método | Descripción | Cuándo se ejecuta |
|--------|-------------|-------------------|
| `getPluginInfo()` | Retorna metadata | Al listar plugins |
| `initialize(config)` | Inicializa el plugin | Al activar |
| `send(data)` | Función principal | Según tipo de plugin |

### Métodos Opcionales

| Método | Descripción |
|--------|-------------|
| `validateConfig(config)` | Valida configuración |
| `handleWebhook(req, res)` | Procesa webhooks |
| `cleanup()` | Limpia al desactivar |
| `getStatus()` | Estado del plugin |
| `updateConfig(newConfig)` | Actualiza config |

---

## Service - Lógica de Negocio

El service contiene la **lógica compleja** y se comunica con APIs externas.

### Ejemplo Completo

```javascript
// src/email.service.js
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const mailgun = require('mailgun-js');
const logger = require('../../../utils/logger');

class EmailService {
  constructor() {
    this.config = null;
    this.transporter = null;
    this.provider = null;
  }

  /**
   * Inicializar el servicio con configuración
   */
  async initialize(config) {
    this.config = config;
    this.provider = config.provider;

    switch (this.provider) {
      case 'smtp':
        await this.initializeSMTP(config.smtp);
        break;

      case 'sendgrid':
        await this.initializeSendGrid(config.sendgrid);
        break;

      case 'mailgun':
        await this.initializeMailgun(config.mailgun);
        break;

      default:
        throw new Error(`Provider no soportado: ${this.provider}`);
    }

    logger.info(`[EmailService] Inicializado con provider: ${this.provider}`);
  }

  /**
   * Inicializar SMTP
   */
  async initializeSMTP(smtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass
      }
    });

    // Verificar conexión
    await this.transporter.verify();
    logger.info('[EmailService] SMTP verificado correctamente');
  }

  /**
   * Inicializar SendGrid
   */
  async initializeSendGrid(sendgridConfig) {
    sgMail.setApiKey(sendgridConfig.apiKey);
    logger.info('[EmailService] SendGrid configurado');
  }

  /**
   * Inicializar Mailgun
   */
  async initializeMailgun(mailgunConfig) {
    this.mailgunClient = mailgun({
      apiKey: mailgunConfig.apiKey,
      domain: mailgunConfig.domain
    });
    logger.info('[EmailService] Mailgun configurado');
  }

  /**
   * Enviar email
   */
  async sendEmail({ to, subject, body, attachments = [] }) {
    try {
      let result;

      switch (this.provider) {
        case 'smtp':
          result = await this.sendViaSMTP(to, subject, body, attachments);
          break;

        case 'sendgrid':
          result = await this.sendViaSendGrid(to, subject, body, attachments);
          break;

        case 'mailgun':
          result = await this.sendViaMailgun(to, subject, body, attachments);
          break;
      }

      logger.info(`[EmailService] Email enviado a ${to} via ${this.provider}`);
      return result;

    } catch (error) {
      logger.error('[EmailService] Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Enviar vía SMTP
   */
  async sendViaSMTP(to, subject, body, attachments) {
    const info = await this.transporter.sendMail({
      from: `${this.config.from.name} <${this.config.from.email}>`,
      to,
      subject,
      html: body,
      attachments
    });

    return {
      messageId: info.messageId,
      provider: 'smtp'
    };
  }

  /**
   * Enviar vía SendGrid
   */
  async sendViaSendGrid(to, subject, body, attachments) {
    const msg = {
      to,
      from: {
        email: this.config.from.email,
        name: this.config.from.name
      },
      subject,
      html: body,
      attachments: attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.contentType
      }))
    };

    const [response] = await sgMail.send(msg);

    return {
      messageId: response.headers['x-message-id'],
      provider: 'sendgrid'
    };
  }

  /**
   * Enviar vía Mailgun
   */
  async sendViaMailgun(to, subject, body, attachments) {
    const data = {
      from: `${this.config.from.name} <${this.config.from.email}>`,
      to,
      subject,
      html: body,
      attachment: attachments
    };

    const response = await this.mailgunClient.messages().send(data);

    return {
      messageId: response.id,
      provider: 'mailgun'
    };
  }

  /**
   * Verificar entrega
   */
  async verifyDelivery(messageId) {
    // Implementar según provider
    return { delivered: true, messageId };
  }

  /**
   * Procesar webhook
   */
  async processWebhook(data) {
    // Implementar procesamiento de webhook
    logger.info('[EmailService] Procesando webhook:', data);
    return { processed: true };
  }

  /**
   * Desconectar
   */
  async disconnect() {
    if (this.transporter) {
      this.transporter.close();
    }
    logger.info('[EmailService] Desconectado');
  }
}

module.exports = new EmailService();
```

---

## Routes - Rutas API

Define rutas personalizadas para tu plugin.

```javascript
// src/email.routes.js
const express = require('express');
const router = express.Router();
const EmailController = require('./email.controller');
const { authenticateToken } = require('../../../middleware/auth');

/**
 * POST /api/plugins/email/send
 * Enviar email
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, body, attachments } = req.body;

    const result = await EmailController.send({
      to,
      subject,
      body,
      attachments
    });

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/plugins/email/webhook
 * Webhook para notificaciones
 */
router.post('/webhook', async (req, res) => {
  await EmailController.handleWebhook(req, res);
});

/**
 * GET /api/plugins/email/status/:messageId
 * Verificar estado de envío
 */
router.get('/status/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await EmailController.verify(messageId);

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

---

## Package.json - Dependencias

```json
{
  "name": "isp-email-plugin",
  "version": "1.0.0",
  "description": "Plugin de Email para Sistema ISP",
  "main": "src/email.controller.js",
  "scripts": {
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "nodemailer": "^6.9.0",
    "@sendgrid/mail": "^7.7.0",
    "mailgun-js": "^0.22.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  },
  "keywords": ["email", "communication", "isp"],
  "author": "Tu Nombre",
  "license": "MIT"
}
```

---

## Ejemplos Completos

Ver plugins de referencia en `backend/src/plugins/`:

1. **Email** - Plugin de comunicación completo
2. **MercadoPago** - Plugin de pagos con webhooks
3. **Stripe** - Plugin de pagos internacional
4. **WhatsApp** - Plugin de mensajería

---

## Empaquetado y Distribución

### 1. Crear ZIP del Plugin

```bash
cd backend/src/plugins/email
zip -r ../../../../store/plugins/email.zip . -x "*.git*" -x "*node_modules*"
```

### 2. Subir al Store

El ZIP debe estar en `store/plugins/[nombre].zip`

### 3. Actualizar Base de Datos del Store

```bash
cd store
npm run seed  # Actualiza plugins en Store DB
```

### 4. Verificar Disponibilidad

```bash
curl http://localhost:3001/api/marketplace/plugins | grep "email"
```

---

## Testing

### Estructura de Tests

```javascript
// tests/email.test.js
const EmailController = require('../src/email.controller');

describe('Email Plugin', () => {
  test('should initialize with valid config', async () => {
    const config = {
      provider: 'smtp',
      from: {
        name: 'Test',
        email: 'test@example.com'
      },
      smtp: {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test',
          pass: 'password'
        }
      }
    };

    const result = await EmailController.initialize(config);
    expect(result.success).toBe(true);
  });

  test('should validate config correctly', () => {
    const invalidConfig = {};
    const validation = EmailController.validateConfig(invalidConfig);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
```

---

## Troubleshooting

### Plugin no aparece en lista

```bash
# Verificar que el manifest.json es válido
cat backend/src/plugins/[nombre]/manifest.json | python3 -m json.tool

# Verificar permisos
chmod -R 755 backend/src/plugins/[nombre]/
```

### Error al instalar dependencias

```bash
# Instalar manualmente
cd backend/src/plugins/[nombre]
npm install

# Verificar package.json
cat package.json
```

### Plugin no se activa

```bash
# Ver logs del backend
tail -f backend/logs/combined.log

# Verificar que initialize() no falla
```

---

## Checklist de Desarrollo

- [ ] Crear estructura de carpetas
- [ ] Escribir `manifest.json` completo
- [ ] Implementar controller con métodos obligatorios
- [ ] Crear service con lógica de negocio
- [ ] Definir routes si es necesario
- [ ] Agregar `package.json` con dependencias
- [ ] Escribir tests unitarios
- [ ] Crear README.md con documentación
- [ ] Empaquetar como ZIP
- [ ] Subir al Store
- [ ] Probar instalación desde Marketplace
- [ ] Verificar activación y configuración
- [ ] Probar funcionalidad completa

---

**Última actualización:** 2025-12-05
**Versión del sistema:** 1.0.0
**Documentación oficial:** https://github.com/tu-repo/docs
