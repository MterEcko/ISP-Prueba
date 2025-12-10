# 🔌 Cómo Crear un Plugin - Guía Práctica

## ⚡ Estructura REAL de un Plugin

Los plugins del sistema ISP-Prueba son **solo backend** (Node.js/Express). NO tienen archivos Vue.

### Estructura de Archivos

```
backend/src/plugins/mi-plugin/
├── manifest.json              ← Configuración del plugin
├── package.json               ← Dependencias NPM
└── src/
    ├── mi-plugin.controller.js    ← OBLIGATORIO: Lógica principal
    ├── mi-plugin.service.js       ← OPCIONAL: Lógica de negocio
    └── mi-plugin.routes.js        ← OPCIONAL: Rutas API personalizadas
```

**Eso es todo.** No se necesita nada más.

---

## 📝 Paso 1: Crear manifest.json

```json
{
  "name": "mi-plugin",
  "version": "1.0.0",
  "description": "Mi primer plugin",
  "category": "communication",
  "author": "Tu Nombre",
  "main": "src/mi-plugin.controller.js"
}
```

**Campos obligatorios:**
- `name`: slug del plugin (sin espacios, minúsculas)
- `version`: versión semántica
- `description`: qué hace el plugin
- `category`: `communication`, `payment`, `automation`, `integration`, `reporting`, `security`
- `author`: tu nombre
- `main`: ruta al controller (siempre `src/[nombre].controller.js`)

---

## 📝 Paso 2: Crear package.json

```json
{
  "name": "isp-mi-plugin",
  "version": "1.0.0",
  "description": "Mi primer plugin",
  "main": "src/mi-plugin.controller.js",
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

**Solo necesitas esto si tu plugin usa dependencias externas.** Si no, puedes omitirlo.

---

## 📝 Paso 3: Crear Controller (OBLIGATORIO)

**Archivo:** `src/mi-plugin.controller.js`

```javascript
const logger = require('../../../utils/logger');

class MiPluginController {
  /**
   * ✅ OBLIGATORIO: Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'mi-plugin',
      version: '1.0.0',
      description: 'Mi primer plugin',
      category: 'communication',
      author: 'Tu Nombre'
    };
  }

  /**
   * ✅ OBLIGATORIO: Inicializar plugin
   * Se ejecuta cuando se activa el plugin
   */
  static async initialize(config) {
    try {
      logger.info('[Mi Plugin] Inicializando...');

      // Aquí va tu lógica de inicialización
      // Ejemplo: conectar a API, inicializar cliente, etc.
      this.apiKey = config.apiKey;
      this.enabled = config.enabled || true;

      logger.info('[Mi Plugin] ✅ Inicializado correctamente');
      return { success: true };

    } catch (error) {
      logger.error('[Mi Plugin] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * ✅ OBLIGATORIO para category='communication'
   * Función principal del plugin
   */
  static async send(data) {
    try {
      const { to, message } = data;

      logger.info(`[Mi Plugin] Enviando mensaje a: ${to}`);

      // Aquí va la lógica de envío
      // Ejemplo: llamar a API externa, enviar SMS, etc.

      return {
        success: true,
        messageId: 'msg-' + Date.now()
      };

    } catch (error) {
      logger.error('[Mi Plugin] Error al enviar:', error);
      throw error;
    }
  }

  /**
   * ⚠️ OPCIONAL: Limpiar al desactivar
   */
  static async cleanup() {
    logger.info('[Mi Plugin] Limpiando recursos...');
    // Cerrar conexiones, limpiar timers, etc.
    return { success: true };
  }
}

module.exports = MiPluginController;
```

### Métodos Obligatorios según Categoría

| Categoría | Métodos Obligatorios |
|-----------|---------------------|
| `communication` | `initialize()`, `send()` |
| `payment` | `initialize()`, `processPayment()` |
| `automation` | `initialize()`, `execute()` |
| `integration` | `initialize()`, `sync()` |
| `reporting` | `initialize()`, `generate()` |
| `security` | `initialize()`, `validate()` |

**Si tu plugin es de otra categoría, solo necesitas `initialize()`**

---

## 📝 Paso 4: Crear Service (OPCIONAL)

**Archivo:** `src/mi-plugin.service.js`

Solo créalo si tienes lógica compleja que separar del controller.

```javascript
const axios = require('axios');
const logger = require('../../../utils/logger');

class MiPluginService {
  constructor() {
    this.client = null;
  }

  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.ejemplo.com';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    logger.info('[Mi Plugin Service] Inicializado');
  }

  async enviarMensaje(to, message) {
    const response = await this.client.post('/send', {
      recipient: to,
      text: message
    });

    return response.data;
  }
}

module.exports = new MiPluginService();
```

Luego úsalo en el controller:

```javascript
const miPluginService = require('./mi-plugin.service');

static async initialize(config) {
  await miPluginService.initialize(config);
}

static async send(data) {
  return await miPluginService.enviarMensaje(data.to, data.message);
}
```

---

## 📝 Paso 5: Crear Routes (OPCIONAL)

**Archivo:** `src/mi-plugin.routes.js`

Solo créalo si necesitas endpoints personalizados.

```javascript
const express = require('express');
const router = express.Router();
const MiPluginController = require('./mi-plugin.controller');

/**
 * POST /api/plugins/mi-plugin/send
 * Enviar mensaje
 */
router.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    const result = await MiPluginController.send({ to, message });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/plugins/mi-plugin/status
 * Estado del plugin
 */
router.get('/status', async (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'mi-plugin',
      status: 'active'
    }
  });
});

module.exports = router;
```

---

## 📦 Paso 6: Empaquetar como ZIP

```bash
cd backend/src/plugins/mi-plugin

# Crear ZIP (sin node_modules ni git)
zip -r ../../../../store/plugins/mi-plugin.zip . \
  -x "*.git*" \
  -x "*node_modules*"
```

El archivo quedará en: `store/plugins/mi-plugin.zip`

---

## 🚀 Paso 7: Instalar el Plugin

### Opción A: Desde el Marketplace (Producción)

1. El ZIP debe estar en `store/plugins/mi-plugin.zip`
2. Ejecutar seed del Store:
   ```bash
   cd store
   npm run seed
   ```
3. Abrir frontend: `http://localhost:8080/plugins/marketplace`
4. Buscar "Mi Plugin" y hacer clic en "Obtener"
5. El sistema automáticamente:
   - Descarga el ZIP
   - Extrae a `backend/src/plugins/mi-plugin/`
   - Ejecuta `npm install`
   - Registra en DB
   - Llama a `initialize()`

### Opción B: Instalación Manual (Desarrollo)

```bash
# 1. Copiar directamente
cp -r /tu/plugin backend/src/plugins/mi-plugin

# 2. Instalar dependencias
cd backend/src/plugins/mi-plugin
npm install

# 3. Registrar en DB vía API
curl -X POST http://localhost:3000/api/system-plugins \
  -H "Content-Type: application/json" \
  -H "x-access-token: TU_TOKEN" \
  -d '{
    "name": "mi-plugin",
    "version": "1.0.0",
    "category": "communication",
    "active": true
  }'
```

### Opción C: Upload de ZIP vía API

```bash
curl -X POST http://localhost:3000/api/system-plugins/install \
  -H "x-access-token: TU_TOKEN" \
  -F "plugin=@mi-plugin.zip"
```

---

## ✅ Verificar que Funciona

### 1. Ver logs del backend

```bash
tail -f backend/logs/combined.log | grep "Mi Plugin"
```

Deberías ver:
```
[Mi Plugin] Inicializando...
[Mi Plugin] ✅ Inicializado correctamente
```

### 2. Verificar en DB

```bash
# PostgreSQL
psql -d isp_db -c "SELECT name, active FROM system_plugins WHERE name='mi-plugin';"

# SQLite
sqlite3 backend/database.sqlite "SELECT name, active FROM SystemPlugins WHERE name='mi-plugin';"
```

### 3. Probar endpoint

```bash
curl -X POST http://localhost:3000/api/plugins/mi-plugin/send \
  -H "Content-Type: application/json" \
  -H "x-access-token: TU_TOKEN" \
  -d '{
    "to": "+521234567890",
    "message": "Hola desde mi plugin"
  }'
```

---

## 🎨 UI del Plugin (Frontend)

**Los plugins NO tienen archivos Vue propios.** La configuración se hace desde el frontend principal:

### Configurar Plugin desde la UI

1. Ir a: `/plugins/management`
2. Buscar tu plugin en la lista
3. Hacer clic en "Configurar"
4. Aparecerá un formulario generado automáticamente desde `manifest.json`

### Ejemplo de manifest con UI de configuración:

```json
{
  "name": "mi-plugin",
  "version": "1.0.0",
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
        "title": "Reintentos máximos",
        "minimum": 1,
        "maximum": 10,
        "default": 3
      }
    },
    "required": ["apiKey"]
  }
}
```

El frontend automáticamente:
- ✅ Genera un formulario con campos para `apiKey`, `enabled`, `maxRetries`
- ✅ Valida según las reglas (required, minimum, maximum)
- ✅ Encripta campos con `format: "password"`
- ✅ Guarda en la DB
- ✅ Pasa la configuración a `initialize(config)`

**NO necesitas crear código Vue. El sistema lo hace automáticamente.**

---

## 📋 Checklist Mínimo

Para que tu plugin funcione:

- [ ] Archivo `manifest.json` con campos obligatorios
- [ ] Archivo `src/[nombre].controller.js`
- [ ] Método `getPluginInfo()` en controller
- [ ] Método `initialize(config)` en controller
- [ ] Método específico de categoría (`send`, `processPayment`, etc.)
- [ ] Plugin exporta con `module.exports = MiPluginController;`

**Eso es todo lo mínimo indispensable.**

---

## 🐛 Errores Comunes

### Error: "Controlador no encontrado"

**Causa:** El archivo no se llama exactamente `src/[nombre].controller.js`

**Solución:**
```bash
# Si tu plugin se llama "mi-plugin"
# El archivo DEBE ser: src/mi-plugin.controller.js
```

### Error: "No implementa método requerido"

**Causa:** Falta el método obligatorio para tu categoría

**Solución:**
```javascript
// Si category='communication', DEBES tener:
static async send(data) { ... }

// Si category='payment', DEBES tener:
static async processPayment(data) { ... }
```

### Error: "Plugin no se activa"

**Causa:** Exception en `initialize()`

**Solución:**
```bash
# Ver logs completos
tail -f backend/logs/combined.log

# Verificar que la configuración es válida
# El sistema pasa config desde la DB a initialize()
```

---

## 🎯 Ejemplos Reales

Revisa estos plugins funcionando en el sistema:

```bash
# Plugin de Email (completo con service y routes)
ls -la backend/src/plugins/email/

# Plugin de MercadoPago (pasarela de pago)
ls -la backend/src/plugins/mercadopago/

# Plugin de Stripe
ls -la backend/src/plugins/stripe/
```

Copia cualquiera y modifícalo según tu necesidad.

---

**Última actualización:** 2025-12-05
**Basado en:** Plugins reales del sistema
