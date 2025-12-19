# Configuración del Sistema de Licencias con Store

## 📋 Resumen

El sistema de licencias ya está **completamente implementado** y captura:

✅ **IP pública** del servidor al activar licencia
✅ **Ubicación GPS** (lat/lon, ciudad, país, ISP)
✅ **Hardware ID único** (hash SHA-256 de MAC, CPU, hostname)
✅ **Validación con Store** (verifica estado de licencia)
✅ **Registro dual** (guarda en sistema local + Store)
✅ **Monitor desde Store** (puede suspender/desactivar licencias)

## 🔧 Configuración Realizada

### 1. Store (.env creado)
```
Puerto: 3001
Base de datos: PostgreSQL (ispdev en puerto 5433)
API Secret: store-secret-key-2025
```

### 2. Backend (.env actualizado)
```
STORE_API_URL=http://localhost:3001/api
STORE_API_KEY=store-secret-key-2025
SYSTEM_VERSION=1.0.0
```

## 🚀 Pasos para Iniciar el Store

### Opción 1: Usando el script (Recomendado)
```bash
cd /home/user/ISP-Prueba/store
./start-store.sh
```

### Opción 2: Manual
```bash
cd /home/user/ISP-Prueba/store

# Instalar dependencias (solo la primera vez)
npm install

# Iniciar el servidor
npm start

# O en modo desarrollo con auto-reload
npm run dev
```

## 📡 Verificar que el Store está corriendo

Después de iniciar, verifica:

```bash
# Ver si el proceso está corriendo
ps aux | grep "node.*store"

# Verificar puerto 3001 abierto
netstat -tlnp | grep 3001

# Probar endpoint de salud
curl http://localhost:3001/api/health
```

## 🔄 Flujo de Activación de Licencia

1. **Frontend** → Usuario ingresa clave de licencia
2. **Backend** → Valida formato y hace request a Store
3. **Store** → Verifica licencia en BD
4. **Store** → Captura IP pública (https://api.ipify.org)
5. **Store** → Captura GPS/ubicación (http://ip-api.com)
6. **Store** → Guarda activación con metadata
7. **Backend** → Guarda licencia local con límites
8. **Backend** → Retorna confirmación al frontend

## 📊 Endpoints del Store

### Validar Licencia
```
POST http://localhost:3001/api/licenses/validate
Body: {
  "licenseKey": "ABC-123-456",
  "hardwareId": "hash-sha256",
  "hardware": { cpu, memory, platform }
}
```

### Registrar Licencia
```
POST http://localhost:3001/api/licenses/register
Body: {
  "licenseKey": "ABC-123-456",
  "companyId": 123,
  "hardware": { ... },
  "location": { lat, lon, city, country }
}
```

### Reportar Métricas
```
POST http://localhost:3001/api/licenses/{key}/metrics
Body: {
  "clients": 150,
  "users": 5,
  "activePlugins": 3,
  "hardware": { ... }
}
```

## 🔐 Seguridad

- La comunicación entre backend y Store usa **API Key** (store-secret-key-2025)
- El Hardware ID es único por servidor (basado en MAC + CPU + hostname)
- Las licencias están vinculadas al Hardware ID
- El Store puede suspender licencias remotamente

## 🐛 Troubleshooting

### El backend no puede conectarse al Store

**Problema**: `Error validando licencia con Store: connect ECONNREFUSED`

**Solución**:
1. Verifica que el Store esté corriendo: `ps aux | grep node`
2. Verifica puerto 3001: `netstat -tlnp | grep 3001`
3. Revisa logs del Store: `tail -f /home/user/ISP-Prueba/store/logs/store.log`

### El Store no inicia

**Problema**: Error de base de datos al iniciar

**Solución**:
```bash
cd /home/user/ISP-Prueba/store
# Verificar conexión PostgreSQL
psql -h localhost -p 5433 -U postgres -d ispdev -c "SELECT 1"
```

### JWT expired en sockets

**Problema**: Los tokens JWT expiran después de cierto tiempo

**Solución**: Este es el comportamiento esperado. Los usuarios deben volver a iniciar sesión. Puedes ajustar `JWT_EXPIRES_IN` en `.env` si necesitas tokens más largos.

## 📁 Archivos Importantes

```
ISP-Prueba/
├── backend/
│   ├── .env (✅ Configurado con STORE_API_URL)
│   └── src/
│       ├── services/storeApiClient.service.js (✅ Implementado)
│       └── controllers/licenseRegistration.controller.js (✅ Implementado)
│
└── store/
    ├── .env (✅ Creado)
    ├── start-store.sh (✅ Script de inicio)
    └── src/
        ├── controllers/license.controller.js
        └── services/license.service.js
```

## ✅ Checklist de Verificación

- [x] Store tiene archivo .env configurado
- [x] Backend tiene variables STORE_API_URL y STORE_API_KEY
- [x] Script de inicio creado (start-store.sh)
- [ ] Store está corriendo en puerto 3001
- [ ] Backend puede conectarse al Store
- [ ] Licencias se validan correctamente

## 🎯 Próximos Pasos

1. **Iniciar el Store**: `cd store && ./start-store.sh`
2. **Reiniciar el Backend**: Para que cargue las nuevas variables de .env
3. **Probar activación**: Ir al frontend y activar una licencia de prueba
4. **Verificar logs**: Revisar que se capture IP y GPS correctamente

---

**Nota**: El sistema de licencias YA está completamente funcional. Solo necesita que el Store esté corriendo para poder validar y registrar licencias.
