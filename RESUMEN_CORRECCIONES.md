# Resumen de Correcciones - Sistema de Licencias

## ✅ Problemas Resueltos

### 1. Error de Columnas (snake_case vs camelCase)
**Problema:**
```
Error: no existe la columna SystemLicense.license_key
```

**Causa:**
Los controladores usaban snake_case (`license_key`, `hardware_id`) pero el modelo Sequelize usa camelCase (`licenseKey`, `hardwareId`).

**Solución:**
Actualizar todos los controladores y servicios a camelCase:
- `systemLicense.controller.js` ✅
- `license.controller.js` ✅
- `licenseClient.js` ✅

**Commit:** `bc4766f`

---

### 2. Plan de Licencia Incorrecto
**Problema:**
La licencia del Store es tipo "Router" pero se mostraba como "Basic" en el frontend.

**Causa:**
El ENUM de `planType` en el modelo `SystemLicense` no incluía 'router', solo:
- 'freemium', 'basic', 'premium', 'enterprise', 'full_access'

**Solución:**
- Agregar 'router' al ENUM en `systemLicense.model.js`
- Crear migración automática para actualizar el ENUM en PostgreSQL

**Commit:** `284d159`

---

## ⚠️ Problemas Pendientes

### 3. Datos de Activación no se Registran
**Síntoma:**
Cuando se activa una licencia, no se captura:
- IP pública del servidor
- Ubicación GPS (latitud, longitud, ciudad, país)
- Información de hardware

**Diagnóstico:**
El código para capturar IP/GPS existe en `storeApiClient.service.js`:
- `getPublicIP()` - línea 331
- `getGPSLocation()` - línea 95
- `registerLicense()` - línea 138

Pero parece que no se está llamando correctamente durante el registro.

**Ubicación del código:**
- Backend: `/backend/src/services/storeApiClient.service.js`
- Controller: `/backend/src/controllers/licenseRegistration.controller.js`

---

### 4. Plugins No Aparecen
**Síntoma:**
Los plugins incluidos en el plan de licencia no se muestran en el frontend debajo del marketplace.

**Diagnóstico Necesario:**
- Verificar si `includedPlugins` se está guardando correctamente en la BD
- Verificar endpoint que consulta plugins disponibles
- Revisar componente del frontend que muestra plugins

**Campos relacionados en SystemLicense:**
```javascript
includedPlugins: {
  type: DataTypes.JSON,
  defaultValue: [],
  comment: 'Lista de plugins incluidos en el plan'
}
```

---

### 5. Error 403 en Payroll
**Síntoma:**
```
GET /api/payroll/summary/totals 403 3.320 ms - 41
POST /api/payroll/generate-monthly 403 0.646 ms - 41
```

**Causa Probable:**
Falta de permisos para el usuario actual.

**Endpoints afectados:**
- `/api/payroll/summary/totals`
- `/api/payroll/generate-monthly`

**Solución Sugerida:**
Verificar que el usuario tenga los permisos:
- `view_payroll`
- `manage_payroll`
- `generate_payroll`

---

## 📝 Pasos Siguientes

### Para Probar las Correcciones:

1. **Reiniciar el Backend:**
   ```bash
   # Detener el backend
   # Iniciar nuevamente para aplicar migraciones
   cd backend && npm start
   ```

2. **Verificar las Migraciones:**
   - Al iniciar, debería ejecutar la migración `system-license-router-plan`
   - Verificar que el enum se actualizó: `SELECT enum_range(NULL::enum_SystemLicenses_planType);`

3. **Probar Validación de Licencia:**
   ```bash
   # Hacer request a:
   POST http://localhost:3000/api/system-licenses/verify
   {
     "licenseKey": "8D01153D-87FD0E05-5B7F96F7-112DCEBF-BD781C8D-2E177AC3-90D7EDEC-45C6B286"
   }
   ```

4. **Verificar Plan en Frontend:**
   - Ir a http://localhost:3000/license/management
   - Debería mostrar "Router" en lugar de "Basic"

---

## 🔧 Para Resolver Pendientes

### Captura de IP/GPS:
Necesita revisión del flujo de registro en `licenseRegistration.controller.js` para asegurar que llame a `storeApiClient.registerLicense()` con todos los parámetros.

### Plugins:
Necesita:
1. Endpoint para consultar plugins del plan actual
2. Componente frontend para mostrar plugins incluidos
3. Lógica para habilitar/deshabilitar plugins según licencia

### Permisos Payroll:
Verificar permisos del usuario en tabla `RolePermissions` y asegurar que el rol tenga acceso a endpoints de nómina.

---

## 📊 Commits de esta Sesión

1. `062dc71` - Selector de pools con ID inmutable
2. `68c6d36` - Sistema de configuración de empleados
3. `ab6c0d6` - Cálculo correcto de nóminas
4. `4fc8188` - Configuración del Store
5. `1ece736` - Fix: Remover comments SQL
6. `bc4766f` - Fix: snake_case a camelCase en licencias
7. `284d159` - Feature: Agregar plan 'Router'
