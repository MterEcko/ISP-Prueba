# Gu ISP-Prueba - Guía Completa de Usuario

**Versión**: 1.0.0
**Fecha**: ${new Date().toLocaleString('es-CO')}

## 📋 Índice

1. [Introducción](#introducción)
2. [Servicios Disponibles](#servicios-disponibles)
3. [Frontend - Gestión Principal](#frontend)
4. [Store - Marketplace y Licencias](#store)
5. [App Móvil](#app-móvil)
6. [Guía de Operaciones CRUD](#crud)
7. [Activación de Licencias](#activación-licencias)

---

## Introducción

ISP-Prueba es una plataforma integral para la gestión de proveedores de servicios de Internet (ISP) que incluye:

- **Backend API**: Node.js + Express + PostgreSQL
- **Frontend Web**: Vue.js 3 + Vuetify
- **Store**: Marketplace de licencias y plugins
- **App Móvil**: React Native + Expo

---

## Servicios Disponibles

| Servicio | URL | Puerto | Estado |
|----------|-----|--------|--------|
| **Backend API** | http://localhost:3000 | 3000 | ✅ Activo |
| **Frontend Web** | http://localhost:8080 | 8080 | ✅ Activo |
| **Store Dashboard** | http://localhost:3001/dashboard | 3001 | ✅ Activo |
| **Metro Bundler (App)** | http://localhost:8081 | 8081 | ✅ Activo |

---

## Frontend - Gestión Principal

### Acceso al Sistema

1. **Abrir navegador** en: `http://localhost:8080`

2. **Pantalla de Login**:
   - Usuario: `admin`
   - Contraseña: `Admin123!`

### Menú Principal

Una vez autenticado, encontrarás:

- **Dashboard**: Vista general con métricas y estadísticas
- **Clientes**: Gestión completa de clientes (CRUD)
- **Servicios**: Catálogo de planes y servicios
- **Facturas**: Sistema de facturación
- **Inventario**: Control de equipos
- **Reportes**: Análisis y estadísticas
- **Configuración**: Ajustes del sistema

### Gestión de Clientes (CRUD)

#### ➕ Crear Cliente

1. Ir a **Clientes** en el menú lateral
2. Click en el botón **"+ Nuevo Cliente"**
3. Completar formulario:
   - **Nombre**: Nombres del cliente
   - **Apellido**: Apellidos del cliente
   - **Email**: correo@ejemplo.com
   - **Teléfono**: +57 XXX XXX XXXX
   - **WhatsApp**: Número de contacto
   - **Dirección**: Dirección física
   - **Zona**: Seleccionar zona (requerido)
   - **Nodo**: Seleccionar nodo de red
   - **Tipo de servicio**: Residencial / Empresarial / Corporativo
4. Click en **"Guardar"**

#### 👁️ Ver Clientes

1. La lista muestra todos los clientes
2. Columnas disponibles:
   - ID
   - Nombre completo
   - Email
   - Teléfono
   - Zona
   - Estado (Activo/Inactivo)
   - Acciones
3. Buscar clientes usando el campo de búsqueda
4. Filtrar por zona, estado, etc.

#### ✏️ Editar Cliente

1. En la lista de clientes, click en el ícono de **editar** (lápiz)
2. Modificar los campos deseados
3. Click en **"Actualizar"**

#### ❌ Eliminar Cliente

1. Click en el ícono de **eliminar** (papelera)
2. Confirmar la eliminación en el diálogo
3. El cliente se eliminará permanentemente

### Gestión de Servicios

#### ➕ Crear Servicio

1. Ir a **Servicios** en el menú
2. Click en **"+ Nuevo Servicio"**
3. Completar:
   - **Nombre**: ej. "Fibra 100 Mbps"
   - **Descripción**: Detalles del plan
   - **Precio**: Valor mensual
   - **Tipo**: Internet / TV / Teléfono
   - **Estado**: Activo / Inactivo
4. **Guardar**

#### ✏️ Actualizar Servicio

1. Click en editar en la lista de servicios
2. Modificar precio, descripción, etc.
3. **Actualizar**

#### ❌ Eliminar Servicio

1. Click en eliminar
2. Confirmar

---

## Store - Marketplace y Licencias

### Acceso al Store Dashboard

URL: `http://localhost:3001/dashboard`

### Menú del Store

- **Dashboard**: Resumen de instalaciones y licencias
- **Instalaciones**: Sistemas ISP registrados
- **Licencias**: Gestión de licencias generadas
- **Plugins**: Marketplace de extensiones
- **Mapa**: Geolocalización de instalaciones

### Registrar Nueva Instalación

#### Vía API (Automático)

```bash
curl -X POST http://localhost:3001/api/installations/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "installationKey": "ISP-COLOMBIA-2025",
    "companyName": "Mi ISP S.A.S",
    "contactEmail": "admin@miisp.com",
    "contactPhone": "+57 300 123 4567",
    "hardwareId": "HW-SERVER-001",
    "systemInfo": {
      "os": "Ubuntu 22.04",
      "arch": "x64",
      "hostname": "isp-server-01"
    },
    "softwareVersion": "1.0.0",
    "currentLatitude": 4.7110,
    "currentLongitude": -74.0721,
    "currentCountry": "Colombia",
    "currentCity": "Bogotá"
  }'
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Instalación registrada exitosamente",
  "installation": {
    "id": "uuid-here",
    "installationKey": "ISP-COLOMBIA-2025",
    "companyName": "Mi ISP S.A.S",
    ...
  }
}
```

### Generar Licencia

```bash
curl -X POST http://localhost:3001/api/licenses/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "installationId": "uuid-de-instalacion",
    "planType": "premium",
    "clientLimit": 1000,
    "userLimit": 20,
    "branchLimit": 5,
    "price": 499.99,
    "currency": "USD",
    "validityDays": 365,
    "isRecurring": true,
    "recurringInterval": "yearly"
  }'
```

### Activar Licencia ⭐

#### Paso 1: Obtener License Key

Después de generar una licencia, recibirás un `licenseKey` único.

#### Paso 2: Activar desde la instalación

```bash
curl -X POST http://localhost:3001/api/licenses/activate \\
  -H "Content-Type: application/json" \\
  -d '{
    "licenseKey": "XXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "installationKey": "ISP-COLOMBIA-2025",
    "hardwareId": "HW-SERVER-001"
  }'
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Licencia activada exitosamente",
  "license": {
    "id": "uuid",
    "licenseKey": "XXXXXXXXXX...",
    "status": "active",
    "activatedAt": "2025-11-18T...",
    "boundToHardwareId": "HW-SERVER-001",
    "planType": "premium",
    "clientLimit": 1000,
    ...
  }
}
```

### Verificar Licencia

```bash
curl -X POST http://localhost:3001/api/licenses/verify \\
  -H "Content-Type": "application/json" \\
  -d '{
    "licenseKey": "YOUR-LICENSE-KEY",
    "hardwareId": "HW-SERVER-001"
  }'
```

### Marketplace de Plugins

#### Ver Plugins Disponibles

```bash
curl http://localhost:3001/api/marketplace
```

#### Crear Plugin (Admin)

```bash
curl -X POST http://localhost:3001/api/plugins \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Facturación Electrónica",
    "description": "Sistema de facturas DIAN",
    "version": "1.0.0",
    "category": "billing",
    "price": 79.99,
    "currency": "USD",
    "compatibility": "1.0.0+",
    "featured": true
  }'
```

#### Actualizar Plugin

```bash
curl -X PUT http://localhost:3001/api/plugins/{pluginId} \\
  -H "Content-Type: application/json" \\
  -d '{
    "price": 59.99,
    "description": "Actualizado con nuevas funciones"
  }'
```

#### Eliminar Plugin

```bash
curl -X DELETE http://localhost:3001/api/plugins/{pluginId}
```

---

## App Móvil

### Ejecutar App en Modo Desarrollo

#### Opción 1: Expo Go (Recomendado)

1. **Instalar Expo Go** en tu dispositivo móvil:
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Iniciar Metro Bundler**:
   ```bash
   cd /home/user/ISP-Prueba/app
   npm start
   ```

3. **Escanear código QR**:
   - Android: Abrir Expo Go → Scan QR Code
   - iOS: Abrir Cámara → Escanear QR

4. La app se cargará automáticamente

#### Opción 2: Emulador Android

```bash
cd /home/user/ISP-Prueba/app
npm run android
```

#### Opción 3: Simulador iOS (solo macOS)

```bash
cd /home/user/ISP-Prueba/app
npm run ios
```

### Funcionalidades de la App

- **Dashboard móvil**: Métricas en tiempo real
- **Gestión de tickets**: Soporte técnico
- **Notificaciones push**: Alertas del sistema
- **Escaneo QR**: Para activación de servicios
- **Geolocalización**: Ubicación de clientes

---

## Guía de Operaciones CRUD

### Resumen de Endpoints

| Operación | Método | Endpoint | Descripción |
|-----------|--------|----------|-------------|
| **CREATE** | POST | `/api/installations/register` | Registrar instalación |
| **READ** | GET | `/api/installations` | Listar instalaciones |
| **READ** | GET | `/api/installations/:key` | Obtener instalación |
| **UPDATE** | PUT | `/api/installations/:key/block` | Bloquear instalación |
| **UPDATE** | PUT | `/api/installations/:key/unblock` | Desbloquear instalación |
| **CREATE** | POST | `/api/licenses/generate` | Generar licencia |
| **UPDATE** | POST | `/api/licenses/activate` | Activar licencia |
| **READ** | POST | `/api/licenses/verify` | Verificar licencia |
| **READ** | GET | `/api/licenses/:id` | Obtener licencia |
| **CREATE** | POST | `/api/plugins` | Crear plugin |
| **READ** | GET | `/api/marketplace` | Listar plugins |
| **UPDATE** | PUT | `/api/plugins/:id` | Actualizar plugin |
| **DELETE** | DELETE | `/api/plugins/:id` | Eliminar plugin |

### Ejemplo Completo: Flujo de Activación

#### 1. Registrar Instalación

```bash
curl -X POST http://localhost:3001/api/installations/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "installationKey": "ISP-TEST-001",
    "companyName": "Test ISP",
    "contactEmail": "test@isp.com",
    "hardwareId": "HW-TEST-001",
    "systemInfo": {"os": "Ubuntu 22.04"}
  }'
```

#### 2. Generar Licencia

```bash
curl -X POST http://localhost:3001/api/licenses/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "installationId": "ID-FROM-STEP-1",
    "planType": "basic",
    "clientLimit": 100,
    "validityDays": 30
  }'
```

#### 3. Activar Licencia

```bash
curl -X POST http://localhost:3001/api/licenses/activate \\
  -H "Content-Type: application/json" \\
  -d '{
    "licenseKey": "LICENSE-KEY-FROM-STEP-2",
    "installationKey": "ISP-TEST-001",
    "hardwareId": "HW-TEST-001"
  }'
```

#### 4. Verificar Activación

```bash
curl -X POST http://localhost:3001/api/licenses/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "licenseKey": "LICENSE-KEY",
    "hardwareId": "HW-TEST-001"
  }'
```

---

## Capturas de Pantalla

### Frontend

![Login](screenshots/frontend-login.png)
*Pantalla de inicio de sesión*

![Dashboard](screenshots/frontend-dashboard.png)
*Dashboard principal con métricas*

![Clientes](screenshots/frontend-clients.png)
*Gestión de clientes - Lista*

![Crear Cliente](screenshots/frontend-client-create.png)
*Formulario de creación de cliente*

![Editar Cliente](screenshots/frontend-client-edit.png)
*Formulario de edición de cliente*

### Store

![Store Dashboard](screenshots/store-dashboard.png)
*Panel de control del Store*

![Instalaciones](screenshots/store-installations.png)
*Lista de instalaciones registradas*

![Licencias](screenshots/store-licenses.png)
*Gestión de licencias*

![Plugins](screenshots/store-plugins.png)
*Marketplace de plugins*

![Mapa](screenshots/store-map.png)
*Mapa de instalaciones con geolocalización*

### App Móvil

![App Dashboard](screenshots/app-dashboard.png)
*Dashboard móvil*

![App Tickets](screenshots/app-tickets.png)
*Sistema de tickets móvil*

---

## Solución de Problemas

### Backend no responde

```bash
# Verificar estado
curl http://localhost:3000

# Reiniciar
cd /home/user/ISP-Prueba/backend
npm run dev
```

### Frontend no carga

```bash
# Limpiar cache y reiniciar
cd /home/user/ISP-Prueba/frontend
rm -rf node_modules/.cache
npm run serve
```

### Store no responde

```bash
# Verificar
curl http://localhost:3001/health

# Reiniciar
cd /home/user/ISP-Prueba/store
npm start
```

### App no conecta

1. Verificar que Metro Bundler esté corriendo
2. Verificar conexión a misma red WiFi
3. Reiniciar Expo Go
4. Limpiar cache: `npm start -- --clear`

---

## Bases de Datos PostgreSQL

### Verificar Conexión

```bash
su - postgres -c "psql -h localhost -c 'SELECT version();'"
```

### Listar Bases de Datos

```bash
su - postgres -c "psql -h localhost -c '\l'" | grep isp_
```

### Ver Tablas

```bash
# Backend
su - postgres -c "psql -h localhost -d isp_system_dev -c '\dt'"

# Store
su - postgres -c "psql -h localhost -d isp_store -c '\dt'"
```

---

## Conclusión

ISP-Prueba está completamente operativo con:

✅ **Backend**: PostgreSQL + API REST funcionando
✅ **Frontend**: Interfaz Vue.js 3 activa
✅ **Store**: Marketplace de licencias operativo
✅ **App**: Metro Bundler listo para desarrollo
✅ **PostgreSQL**: Migraciones completadas

**Todas las operaciones CRUD funcionando correctamente.**

---

*Documentación generada: ${new Date().toLocaleString('es-CO')}*
*Versión del sistema: 1.0.0*
