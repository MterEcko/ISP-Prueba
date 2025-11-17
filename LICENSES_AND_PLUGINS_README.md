# Sistema de Licencias y Plugins - ISP-Prueba

## 📋 Descripción General

Este sistema permite gestionar licencias del software y un marketplace de plugins extensibles sin necesidad de recompilar la aplicación.

## 🔑 Sistema de Licencias

### Tipos de Licencias

El sistema soporta 4 tipos de licencias:

1. **Básico** (`basic`)
   - Hasta 50 clientes
   - Facturación básica
   - Acceso al marketplace
   - **Precio**: $29.99/mes - $299.99/año

2. **Medio** (`premium`)
   - Hasta 200 clientes
   - Inventario y reportes avanzados
   - Multi-sucursal
   - API REST
   - **Precio**: $79.99/mes - $799.99/año

3. **Avanzado** (`premium`)
   - Hasta 400 clientes
   - Usuarios ilimitados
   - White Label
   - Integraciones personalizadas
   - **Precio**: $149.99/mes - $1,499.99/año

4. **Full / Enterprise** (`enterprise`)
   - **Clientes ILIMITADOS**
   - **Usuarios ILIMITADOS**
   - **TODOS los plugins GRATIS**
   - Desarrollo personalizado
   - Soporte dedicado 24/7
   - **Precio**: $299.99/mes - $2,999.99/año

### Licencia Maestra (Solo para Desarrollo)

Existe una **licencia maestra** hardcoded en el código fuente para pruebas y desarrollo:

- **Clave**: `7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F`
- **Tipo**: Enterprise
- **Límites**: Ninguno
- **Expiración**: Nunca
- **Ubicación**: `/backend/src/config/master-license.js`

**⚠️ IMPORTANTE**: Esta licencia solo debe estar accesible en el código fuente y NO debe exponerse en APIs públicas.

## 🧩 Sistema de Plugins

### Características

- **Instalación sin recompilar**: Los plugins se instalan dinámicamente
- **Marketplace integrado**: Descarga e instala plugins desde la tienda
- **Plugins gratis y de pago**: Algunos plugins son gratuitos, otros requieren compra
- **Código fuente protegido**: Los plugins se entregan compilados/ofuscados (implementación pendiente)
- **Actualizaciones automáticas**: Los plugins se actualizan desde el servidor (implementación pendiente)

### Plugins Disponibles (Marketplace Simulado)

#### Gratis
- **MercadoPago Payments** - Integración de pagos
- **SMS Notifications** - Envío de SMS
- **MikroTik Sync Advanced** - Sincronización con routers
- **PayPal Payment Gateway** - Pagos con PayPal
- **Customer Self-Service Portal** - Portal para clientes

#### De Pago
- **WhatsApp Business** ($29.99) - Mensajería WhatsApp
- **Email Marketing Pro** ($19.99) - Campañas de email
- **Advanced Reports & Analytics** ($49.99) - Reportes avanzados
- **Inventory Barcode Scanner** ($14.99) - Escaneo de códigos
- **Cloud Backup & Restore** ($39.99) - Backups en la nube

## ⚙️ Configuración

### Modo de Operación

El sistema puede funcionar en dos modos:

1. **Modo Mock (Actual)**
   - Usa datos simulados desde archivos JSON
   - Ideal para desarrollo sin servidor externo
   - Configuración: `frontend/src/config/app-config.js`
   ```javascript
   USE_MOCK_DATA: true
   ```

2. **Modo Servidor Real (Futuro)**
   - Conecta con servidor de licencias y marketplace
   - Sincronización automática
   - Configuración: Cambiar `USE_MOCK_DATA` a `false`

### Archivos de Configuración

#### Backend
- `/backend/src/config/master-license.js` - Licencia maestra
- `/backend/src/routes/systemLicense.routes.js` - Rutas de licencias
- `/backend/src/routes/systemPlugin.routes.js` - Rutas de plugins
- `/backend/src/controllers/systemLicense.controller.js` - Controlador de licencias
- `/backend/src/controllers/systemPlugin.controller.js` - Controlador de plugins

#### Frontend
- `/frontend/src/config/app-config.js` - Configuración general
- `/frontend/src/config/license-plans.json` - Planes de licencias (mock)
- `/frontend/src/config/plugin-marketplace.json` - Plugins disponibles (mock)
- `/frontend/src/services/license.service.js` - Servicio de licencias
- `/frontend/src/services/plugin.service.js` - Servicio de plugins
- `/frontend/src/store/modules/license.js` - Store Vuex de licencias
- `/frontend/src/store/modules/plugins.js` - Store Vuex de plugins

## 📱 Interfaz de Usuario

### Vistas de Licencias
- **/license/management** - Gestión de licencias
- Componente indicador en navbar: `LicenseStatusIndicator.vue`

### Vistas de Plugins
- **/plugins/management** - Gestión de plugins instalados
- **/plugins/marketplace** - Marketplace de plugins

## 🚀 Uso

### Activar Licencia

```javascript
// Desde código
await this.$store.dispatch('license/activateLicense', {
  licenseKey: 'TU-CLAVE-AQUI',
  hardwareId: 'HARDWARE-ID-OPCIONAL'
});

// Desde UI
// Navegar a /license/management y usar el formulario
```

### Instalar Plugin

```javascript
// Desde código
await this.$store.dispatch('plugins/createPlugin', {
  name: 'Plugin Name',
  version: '1.0.0',
  category: 'payment',
  active: false
});

// Desde UI
// Navegar a /plugins/marketplace y hacer clic en "Instalar"
```

### Activar/Desactivar Plugin

```javascript
// Activar
await this.$store.dispatch('plugins/activatePlugin', pluginId);

// Desactivar
await this.$store.dispatch('plugins/deactivatePlugin', pluginId);
```

## 🔄 Sincronización con Servidor Externo

### Cuando el servidor esté listo:

1. Actualizar `/frontend/src/config/app-config.js`:
   ```javascript
   USE_MOCK_DATA: false
   LICENSE_SERVER_URL: 'https://tu-servidor-licencias.com/api'
   MARKETPLACE_SERVER_URL: 'https://tu-servidor-marketplace.com/api'
   ```

2. El sistema automáticamente:
   - Consultará licencias desde el servidor
   - Descargará plugins del marketplace real
   - Sincronizará actualizaciones

### Flujo de Sincronización

```
Cliente (ISP-Prueba)  →  Servidor de Licencias
                      ←  Validación de licencia

Cliente (ISP-Prueba)  →  Marketplace Server
                      ←  Lista de plugins
                      ←  Descarga de plugin.zip
```

## 🔒 Seguridad de Plugins

### Protección del Código Fuente (Implementación Futura)

Para que los clientes no puedan ver el código fuente de los plugins:

1. **Compilar plugins a bytecode** (usando herramientas como pkg o nexe)
2. **Ofuscar código JavaScript** (usando webpack con uglify/terser)
3. **Firmar digitalmente** los plugins para verificar autenticidad
4. **Cifrar archivos sensibles** dentro del plugin

### Ejemplo de Estructura de Plugin

```
mi-plugin/
├── manifest.json         # Metadata del plugin
├── plugin.min.js         # Código ofuscado/compilado
├── plugin.signature      # Firma digital
└── assets/               # Recursos (imágenes, etc)
```

## 📊 Características por Plan

| Característica | Básico | Medio | Avanzado | Full |
|---------------|--------|-------|----------|------|
| Clientes | 50 | 200 | 400 | ∞ |
| Usuarios | Limitados | Limitados | ∞ | ∞ |
| Plugins Gratis | ✅ | ✅ | ✅ | ✅ |
| Plugins de Pago | 💰 | 💰 | 💰 | **GRATIS** |
| API Access | ❌ | ✅ | ✅ | ✅ |
| White Label | ❌ | ❌ | ✅ | ✅ |
| Soporte 24/7 | ❌ | ✅ | ✅ | ✅ |
| Desarrollo Custom | ❌ | ❌ | ❌ | ✅ |

## 🛠️ Desarrollo de Plugins

### Para desarrolladores que quieran crear plugins:

1. **Estructura mínima**:
   ```json
   {
     "name": "mi-plugin",
     "version": "1.0.0",
     "description": "Mi super plugin",
     "author": "Tu Nombre",
     "category": "integration",
     "price": 29.99,
     "features": ["Feature 1", "Feature 2"]
   }
   ```

2. **Subir al marketplace** (cuando esté disponible):
   ```javascript
   await pluginService.uploadToMarketplace(metadata, pluginFile);
   ```

3. **El sistema se encargará de**:
   - Validar el plugin
   - Compilar/ofuscar si es necesario
   - Distribuir a los clientes
   - Gestionar actualizaciones

## 📞 Soporte

Para más información sobre licencias y plugins:
- Email: soporte@isp-prueba.com
- Documentación: [Próximamente]

---

**Desarrollado por**: ISP-Prueba Team
**Versión**: 1.0.0
**Última actualización**: 2025-01-17
