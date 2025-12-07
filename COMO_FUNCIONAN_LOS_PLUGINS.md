# 🔌 Cómo Funcionan los Plugins en ISP-Prueba

## 📖 Resumen Ejecutivo

Este documento explica **exactamente** cómo el sistema ISP-Prueba carga, activa y ejecuta plugins. Está basado en el código real del sistema.

---

## 🏗️ Arquitectura Interna

### Ubicaciones de Código

```
backend/src/
├── controllers/
│   └── systemPlugin.controller.js   ← Gestión de plugins
├── plugins/
│   ├── email/                       ← Ejemplo: Plugin de Email
│   ├── mercadopago/                 ← Ejemplo: Plugin MercadoPago
│   └── whatsapp/                    ← Ejemplo: Plugin WhatsApp
├── routes/
│   └── systemPlugin.routes.js       ← Rutas API de plugins
└── models/
    └── systemPlugin.model.js        ← Modelo de base de datos
```

### Clase SystemPluginController

El controlador central está en `backend/src/controllers/systemPlugin.controller.js`:

```javascript
class SystemPluginController {
  constructor() {
    this.pluginsPath = path.join(__dirname, '../plugins');
    this.loadedPlugins = new Map();      // Plugins cargados en memoria
    this.activePlugins = new Map();      // Plugins activos
  }
}
```

---

## 🔄 Ciclo de Vida Completo

### 1. Instalación (ZIP → Filesystem)

**Endpoint:** `POST /api/system-plugins/install`

**Proceso:**

```javascript
installPlugin(req, res) {
  // 1. Recibe archivo ZIP vía multer
  const zipFile = req.file;
  
  // 2. Extrae ZIP temporal
  const zip = new AdmZip(zipFile.path);
  
  // 3. Lee manifest.json desde el ZIP
  const manifestEntry = zip.getEntry('manifest.json');
  const manifest = JSON.parse(manifestEntry.getData().toString());
  
  // 4. Valida estructura del manifest
  // - name
  // - version
  // - main (controller path)
  
  // 5. Extrae archivos a backend/src/plugins/[nombre]/
  const targetPath = path.join(this.pluginsPath, manifest.name);
  zip.extractAllTo(targetPath, true);
  
  // 6. Instala dependencias NPM
  execSync(`cd ${targetPath} && npm install`);
  
  // 7. Crea registro en base de datos
  const newPlugin = await SystemPlugin.create({
    name: manifest.name,
    version: manifest.version,
    category: manifest.category,
    active: true,  // ← Activar automáticamente
    configuration: manifest.config || {},
    pluginTables: manifest.tables || [],
    pluginRoutes: manifest.routes || []
  });
  
  // 8. Activa el plugin inmediatamente
  await this._activatePlugin(newPlugin);
}
```

### 2. Activación (Filesystem → Memoria)

**Endpoint:** `POST /api/system-plugins/:id/activate`

**Proceso interno en `_activatePlugin(plugin)`:**

```javascript
async _activatePlugin(plugin) {
  // Paso 1: Verificar que el directorio existe
  const pluginPath = path.join(this.pluginsPath, plugin.name);
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin ${plugin.name} no encontrado`);
  }

  // Paso 2: Cargar el controller en memoria
  const controllerPath = path.join(
    pluginPath, 
    'src', 
    `${plugin.name}.controller.js`
  );
  const pluginController = require(controllerPath);
  
  // Paso 3: Validar métodos obligatorios
  const requiredMethods = this._getRequiredMethodsForCategory(plugin.category);
  // Ejemplo para 'communication': ['initialize', 'send']
  // Ejemplo para 'payment': ['initialize', 'processPayment']
  
  for (const method of requiredMethods) {
    if (typeof pluginController[method] !== 'function') {
      throw new Error(`Falta método obligatorio: ${method}`);
    }
  }
  
  // Paso 4: Desencriptar configuración sensible
  let decryptedConfig = plugin.configuration;
  try {
    const pluginInfo = await this._getPluginInfo(plugin.name);
    const configSchema = pluginInfo.configSchema;
    decryptedConfig = pluginConfigEncryption.decryptConfig(
      plugin.configuration, 
      configSchema
    );
  } catch (error) {
    // Continuar con config original si falla
  }
  
  // Paso 5: Llamar a initialize() del plugin
  if (pluginController.initialize) {
    await pluginController.initialize(decryptedConfig);
    // Aquí el plugin se conecta a APIs, inicializa transporters, etc.
  }
  
  // Paso 6: Guardar en Map de plugins activos
  this.activePlugins.set(plugin.name, pluginController);
  
  logger.info(`✅ Plugin ${plugin.name} activado exitosamente`);
}
```

### 3. Ejecución (Llamadas desde el sistema)

Cuando el sistema necesita usar un plugin:

```javascript
// Ejemplo: Enviar notificación por WhatsApp
const whatsappPlugin = this.activePlugins.get('whatsapp');

if (whatsappPlugin && whatsappPlugin.send) {
  const result = await whatsappPlugin.send({
    to: '+52123456789',
    message: 'Tu pago ha sido recibido'
  });
}
```

### 4. Desactivación (Memoria → Idle)

**Endpoint:** `POST /api/system-plugins/:id/deactivate`

```javascript
async _deactivatePlugin(plugin) {
  // 1. Obtener plugin activo
  const pluginController = this.activePlugins.get(plugin.name);
  
  if (pluginController) {
    // 2. Llamar a cleanup() si existe
    if (pluginController.cleanup) {
      await pluginController.cleanup();
      // Aquí el plugin cierra conexiones, limpia recursos, etc.
    }
    
    // 3. Eliminar de Map de activos
    this.activePlugins.delete(plugin.name);
  }
  
  // 4. Limpiar caché de require
  const pluginPath = path.join(this.pluginsPath, plugin.name);
  Object.keys(require.cache).forEach(key => {
    if (key.includes(pluginPath)) {
      delete require.cache[key];
    }
  });
  
  logger.info(`❌ Plugin ${plugin.name} desactivado`);
}
```

---

## 📋 Métodos Obligatorios por Categoría

El sistema valida diferentes métodos según la categoría del plugin:

```javascript
_getRequiredMethodsForCategory(category) {
  const requirements = {
    'communication': ['initialize', 'send'],
    'payment': ['initialize', 'processPayment'],
    'automation': ['initialize', 'execute'],
    'integration': ['initialize', 'sync'],
    'reporting': ['initialize', 'generate'],
    'security': ['initialize', 'validate']
  };
  
  return requirements[category] || ['initialize'];
}
```

### Ejemplo: Plugin de Comunicación

```javascript
class WhatsAppController {
  // ✅ OBLIGATORIO
  static async initialize(config) {
    // Conectar a Twilio/Meta API
    this.client = new WhatsAppClient(config.apiKey);
    await this.client.connect();
  }
  
  // ✅ OBLIGATORIO para category='communication'
  static async send(data) {
    const { to, message } = data;
    return await this.client.sendMessage(to, message);
  }
  
  // ⚠️ OPCIONAL
  static async cleanup() {
    await this.client.disconnect();
  }
}
```

### Ejemplo: Plugin de Pago

```javascript
class MercadoPagoController {
  // ✅ OBLIGATORIO
  static async initialize(config) {
    this.mp = new MercadoPago(config.accessToken);
  }
  
  // ✅ OBLIGATORIO para category='payment'
  static async processPayment(data) {
    const { amount, description, payer } = data;
    return await this.mp.payment.create({
      transaction_amount: amount,
      description,
      payer
    });
  }
  
  // ⚠️ OPCIONAL (pero recomendado)
  static async handleWebhook(req, res) {
    const { data } = req.body;
    // Procesar webhook de MercadoPago
  }
}
```

---

## 🗂️ Estructura de Base de Datos

### Tabla: SystemPlugins

```sql
CREATE TABLE system_plugins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  active BOOLEAN DEFAULT FALSE,
  configuration JSONB,          -- Configuración del usuario
  plugin_tables JSONB,          -- Tablas personalizadas del plugin
  plugin_routes JSONB,          -- Rutas adicionales del plugin
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Ejemplo de Registro

```json
{
  "id": 1,
  "name": "email",
  "version": "1.0.0",
  "category": "communication",
  "active": true,
  "configuration": {
    "provider": "smtp",
    "from": {
      "name": "ISP Notificaciones",
      "email": "noreply@misp.com"
    },
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "auth": {
        "user": "encrypted_value_here",
        "pass": "encrypted_value_here"
      }
    }
  },
  "plugin_tables": [],
  "plugin_routes": [
    {
      "path": "/webhook/email",
      "method": "POST",
      "handler": "handleWebhook"
    }
  ]
}
```

---

## 🔐 Encriptación de Configuración

El sistema encripta automáticamente campos sensibles:

```javascript
// pluginConfigEncryption.service.js

// Al guardar configuración:
const encrypted = pluginConfigEncryption.encryptConfig(
  userConfig,
  configSchema  // Del manifest.json
);

await plugin.update({ configuration: encrypted });

// Al activar plugin:
const decrypted = pluginConfigEncryption.decryptConfig(
  plugin.configuration,
  configSchema
);

await pluginController.initialize(decrypted);
```

Campos que se encriptan automáticamente:
- `format: "password"` en configSchema
- Nombres que contengan: `password`, `secret`, `token`, `key`, `apiKey`

---

## 🚀 Inicialización al Arrancar el Servidor

Cuando el backend arranca, se cargan todos los plugins activos:

```javascript
// backend/src/index.js (o server.js)

app.listen(PORT, async () => {
  logger.info('Servidor iniciado');
  
  // Inicializar plugins activos
  await systemPluginController.initializeActivePlugins();
});

// systemPlugin.controller.js
async initializeActivePlugins() {
  const activePlugins = await SystemPlugin.findAll({
    where: { active: true }
  });
  
  for (const plugin of activePlugins) {
    try {
      await this._activatePlugin(plugin);
      logger.info(`✅ Plugin ${plugin.name} cargado al iniciar`);
    } catch (error) {
      logger.error(`❌ Error cargando ${plugin.name}: ${error.message}`);
      // Marcar como inactivo si falla
      await plugin.update({ active: false });
    }
  }
}
```

---

## 🔍 Debugging de Plugins

### Ver Plugins Activos en Memoria

```javascript
// Desde cualquier parte del backend:
const activePlugins = systemPluginController.activePlugins;

console.log('Plugins activos:', Array.from(activePlugins.keys()));
// Output: ['email', 'whatsapp', 'mercadopago']

// Obtener instancia de un plugin:
const emailPlugin = activePlugins.get('email');
if (emailPlugin) {
  await emailPlugin.send({ to: 'test@example.com', ... });
}
```

### Logs Importantes

```bash
# Ver inicialización de plugins
tail -f backend/logs/combined.log | grep "Plugin"

# Ejemplos de logs:
[2025-12-05 10:30:15] info: 🚀 Activando plugin email...
[2025-12-05 10:30:15] info: [Email Plugin] Inicializando...
[2025-12-05 10:30:16] info: [EmailService] SMTP verificado correctamente
[2025-12-05 10:30:16] info: ✅ Plugin email activado exitosamente
```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Plugin no encontrado en filesystem` | Carpeta no existe en `plugins/` | Verificar que el ZIP se extrajo correctamente |
| `Controlador no encontrado` | Falta `src/[nombre].controller.js` | Crear controller con nombre correcto |
| `No implementa método requerido` | Falta `initialize()` o `send()` | Implementar método en el controller |
| `Error activando plugin` | Exception en `initialize()` | Revisar logs, validar configuración |
| `Plugin no implementa el método` | Método mal escrito o ausente | Verificar nombre exacto del método |

---

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    INSTALACIÓN DE PLUGIN                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. POST /api/system-plugins/install                          │
│    - Recibe ZIP vía multer                                   │
│    - Valida manifest.json                                    │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Extracción                                                │
│    - Extrae a backend/src/plugins/[nombre]/                  │
│    - npm install (si tiene package.json)                     │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Registro en DB                                            │
│    - Crea SystemPlugin con active=true                       │
│    - Guarda configuration, routes, tables                    │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Activación (_activatePlugin)                              │
│    - Carga controller en memoria                             │
│    - Valida métodos obligatorios                             │
│    - Desencripta configuración                               │
│    - Ejecuta pluginController.initialize(config)             │
│    - Guarda en activePlugins Map                             │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Plugin Activo y Funcionando                               │
│    - Disponible en activePlugins.get('nombre')               │
│    - Se puede llamar a métodos: send(), processPayment(), etc│
│    - Ejecutándose en memoria del servidor                    │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist para que tu Plugin Funcione

- [ ] Directorio: `backend/src/plugins/[nombre]/`
- [ ] Archivo `manifest.json` con campos obligatorios
- [ ] Archivo `src/[nombre].controller.js`
- [ ] Controller exporta clase o objeto con métodos
- [ ] Método `getPluginInfo()` implementado
- [ ] Método `initialize(config)` implementado
- [ ] Método específico de categoría (`send`, `processPayment`, etc.)
- [ ] Package.json con dependencias correctas
- [ ] Código sin errores de sintaxis
- [ ] Plugin registrado en DB (`SystemPlugins` table)
- [ ] Plugin marcado como `active: true`
- [ ] Configuración válida según `configSchema`

---

**Última actualización:** 2025-12-05
**Versión del sistema:** 1.0.0
**Basado en:** Código real de `systemPlugin.controller.js`
