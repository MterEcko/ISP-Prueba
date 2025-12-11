# Sistema de Licencias - Documentación

## Descripción General

Sistema completo de gestión de licencias con integración a Store API, vinculación de hardware, gestión de empresas y control de subdominios en Cloudflare.

## Características Principales

### 1. Registro de Hardware
- **Hardware ID único**: SHA256(hostname + CPU + MAC + SO)
- **Información recopilada**:
  - CPU: modelo, cores, velocidad
  - Memoria: total, usada, libre
  - Red: MAC address, IP
  - Sistema: plataforma, arquitectura, versión
  - Ubicación GPS (mediante IP geolocation)

### 2. Vinculación con Empresa
- Registro de empresa en Store
- Vinculación de licencia con empresa
- Datos almacenados: RFC, email, teléfono, dirección, contacto

### 3. Subdominios en Cloudflare
- Disponible para planes: Premium, Enterprise, Full Access
- Creación automática al registrar empresa
- Formato: `{subdominio}.tudominio.com`

### 4. Validación Periódica
- **Cada hora**: Validación de licencia con Store
- **Semanal**: Actualización de ubicación GPS
- **Diaria**: Reporte de métricas de uso

### 5. Suspensión de Licencias
- Si la licencia está suspendida:
  - ✅ **Permitido**: GET (consultas), PUT/PATCH (actualizaciones), pagos
  - ❌ **Bloqueado**: POST para crear clientes, usuarios, servicios

## Flujo de Registro

```
1. Usuario accede a /license/register
2. Completa información de empresa
3. Ingresa clave de licencia
4. (Opcional) Configura subdominio si su plan lo permite
5. Sistema:
   - Valida licencia con Store
   - Registra empresa en Store
   - Registra hardware en Store
   - Crea subdominio en Cloudflare (si aplica)
   - Vincula licencia al hardware local
   - Guarda licencia en BD local
6. ✅ Sistema listo para usar
```

## Planes y Límites

### Freemium
- Clientes: 50
- Usuarios: 2
- Plugins: 2
- Plugins incluidos: [email]
- Subdominio: ❌

### Basic
- Clientes: 200
- Usuarios: 5
- Plugins: 5
- Plugins incluidos: [email, whatsapp, telegram]
- Subdominio: ❌

### Premium
- Clientes: 1,000
- Usuarios: 15
- Plugins: 15
- Plugins incluidos: [email, whatsapp, telegram, mercadopago, openpay, n8n]
- Subdominio: ✅

### Enterprise
- Clientes: Ilimitado
- Usuarios: Ilimitado
- Plugins: Ilimitado
- Plugins incluidos: Todos (*)
- Subdominio: ✅

### Full Access
- Clientes: Ilimitado
- Usuarios: Ilimitado
- Plugins: Ilimitado
- Plugins incluidos: Todos (*)
- Subdominio: ✅
- Backdoor: ✅ (usuario POLUX + password hex dinámico)

## API Endpoints

### Registro y Configuración

```javascript
// Obtener información del hardware
GET /api/system/hardware-info
Response: {
  hardware: { hardwareId, hostname, cpu, memory, network },
  location: { latitude, longitude, city, country }
}

// Validar clave de licencia
POST /api/licenses/validate-key
Body: { licenseKey: "..." }
Response: { valid: true, license: {...} }

// Registrar empresa y activar licencia
POST /api/licenses/register-company
Body: {
  company: { name, rfc, email, phone, address, contactName },
  license: { key },
  subdomain: "mi-empresa" (opcional),
  hardware: {...},
  location: {...}
}
Response: {
  success: true,
  data: { companyId, licenseId, subdomain }
}
```

### Operaciones de Licencia

```javascript
// Obtener licencia actual
GET /api/licenses/current
Response: { license: {...} }

// Forzar validación con Store
POST /api/licenses/force-validation
Response: { success: true, validation: {...} }

// Actualizar hardware en Store
POST /api/licenses/update-hardware
Response: { success: true }
```

## Jobs Automáticos

### 1. Validación Horaria
- **Schedule**: Cada hora (0 * * * *)
- **Acciones**:
  - Validar licencia con Store
  - Actualizar timestamp de última validación
  - Verificar suspensión
  - Limpiar cache si está suspendida

### 2. Actualización GPS Semanal
- **Schedule**: Domingos 3 AM (0 3 * * 0)
- **Acciones**:
  - Obtener nueva ubicación GPS
  - Actualizar en Store

### 3. Reporte Diario de Métricas
- **Schedule**: Diariamente 2 AM (0 2 * * *)
- **Acciones**:
  - Recopilar métricas: clientes, usuarios, plugins, facturas, pagos
  - Enviar al Store

## Middleware de Suspensión

### Uso Básico

```javascript
const LicenseSuspensionMiddleware = require('./middleware/licenseSuspension.middleware');

// Aplicar a todas las rutas POST
app.use(LicenseSuspensionMiddleware.blockIfSuspended);

// O aplicar selectivamente
router.post('/clients',
  LicenseSuspensionMiddleware.blockClientCreation,
  clientController.create
);
```

### Rutas Excluidas (siempre permitidas)
- `/api/invoices` - Consultar facturas
- `/api/payments` - Registrar pagos
- `/api/auth/login` - Login
- `/api/licenses/*` - Gestión de licencias

### Rutas Bloqueadas (si está suspendida)
- `/api/clients` - Crear clientes
- `/api/users` - Crear usuarios
- `/api/subscriptions` - Crear servicios
- `/api/service-packages` - Crear paquetes
- `/api/devices` - Crear dispositivos
- `/api/tickets` - Crear tickets

## Servicio Store API

### Configuración

```javascript
// .env
STORE_API_URL=https://store.tudominio.com/api
STORE_API_KEY=tu-api-key-aqui
SYSTEM_VERSION=1.0.0
```

### Métodos Principales

```javascript
const storeApiClient = require('./services/storeApiClient.service');

// Registrar licencia
await storeApiClient.registerLicense(licenseData);

// Validar licencia
await storeApiClient.validateLicense(licenseKey);

// Crear subdominio
await storeApiClient.createSubdomain(licenseKey, subdomain, companyName);

// Reportar métricas
await storeApiClient.reportUsageMetrics(licenseKey);

// Actualizar hardware
await storeApiClient.updateHardwareInfo(licenseKey);
```

## Servicio de Límites

```javascript
const licenseLimitsService = require('./services/licenseLimits.service');

// Verificar si se puede agregar cliente
const canAdd = await licenseLimitsService.canAddClient();
if (!canAdd.allowed) {
  return res.status(403).json({
    message: canAdd.reason,
    requiresUpgrade: canAdd.requiresUpgrade
  });
}

// Verificar si se puede activar plugin
const canActivate = await licenseLimitsService.canActivatePlugin('mercadopago');

// Obtener información completa
const licenseInfo = await licenseLimitsService.getLicenseInfo();
```

## Integración en Controllers

### Ejemplo: Crear Cliente

```javascript
exports.createClient = async (req, res) => {
  try {
    // Verificar límite de clientes
    const canAdd = await licenseLimitsService.canAddClient();

    if (!canAdd.allowed) {
      return res.status(403).json({
        success: false,
        error: 'CLIENT_LIMIT_REACHED',
        message: canAdd.reason,
        current: canAdd.current,
        max: canAdd.max,
        requiresUpgrade: true
      });
    }

    // Proceder con la creación del cliente
    const client = await Client.create(req.body);

    return res.status(201).json({
      success: true,
      client: client
    });

  } catch (error) {
    logger.error('Error creando cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creando cliente'
    });
  }
};
```

## Frontend: Formulario de Registro

### Ruta
```
/license/register
```

### Componente
```
/frontend/src/views/license/CompanyRegistrationView.vue
```

### Pasos del Wizard
1. Datos de Empresa
2. Licencia (validación)
3. Subdominio (opcional, según plan)
4. Confirmación

## Cloudflare Integration

El sistema se comunica con el Store API, y el Store se encarga de crear los subdominios en Cloudflare.

### Flujo:
1. Usuario solicita subdominio en formulario
2. Backend envía solicitud al Store
3. Store crea registro DNS en Cloudflare
4. Store responde con subdomain y fullDomain
5. Backend guarda configuración
6. Sistema queda accesible en: `https://{subdominio}.tudominio.com`

## Troubleshooting

### Error: "Licencia suspendida"
- **Causa**: El ISP no ha pagado la licencia
- **Solución**: Contactar soporte y realizar pago
- **Mientras tanto**: Puedes consultar información y registrar pagos, pero no crear nuevos recursos

### Error: "Hardware mismatch"
- **Causa**: Intentando usar la licencia en otro servidor
- **Solución**: La licencia está vinculada al hardware original. Contactar soporte para transferencia

### Error: "Plugin limit reached"
- **Causa**: Se alcanzó el límite de plugins del plan
- **Solución**: Desactivar plugins no usados o actualizar plan

### Error: "Client limit reached"
- **Causa**: Se alcanzó el límite de clientes del plan
- **Solución**: Actualizar a un plan superior

## Monitoreo

### Logs Importantes

```bash
# Validación de licencia
🔐 === VALIDACIÓN HORARIA DE LICENCIA ===
📋 Estado de licencia: active
✅ Válida: SÍ

# Actualización GPS
📍 === ACTUALIZACIÓN SEMANAL DE GPS ===
📍 Nueva ubicación: Ciudad de México, México
🌐 Coordenadas: 19.4326, -99.1332

# Reporte de métricas
📊 === REPORTE DIARIO DE MÉTRICAS ===
✅ Métricas reportadas al Store
📊 150 clientes
👥 5 usuarios
🔌 8 plugins activos
```

## Seguridad

- Hardware ID cifrado con SHA256
- Licencia almacenada cifrada localmente (AES-256-CBC)
- Comunicación con Store via HTTPS
- API Key requerida para todas las operaciones
- Validación de hardware en cada request al Store
- Cache de validación (1 hora) para reducir latencia

## Contacto y Soporte

Para dudas o problemas con el sistema de licencias, contactar:
- **Email**: soporte@tudominio.com
- **Store Dashboard**: https://store.tudominio.com
- **Documentación API**: https://store.tudominio.com/api/docs
