# 🚀 Marketplace - Inicio Rápido

## ✅ Estado Actual del Sistema

### Store Server (Puerto 3001)
```bash
✅ Corriendo correctamente
✅ 10 plugins disponibles
✅ 4 licencias de prueba creadas
✅ API funcionando: http://localhost:3001/api/marketplace/plugins
```

### Plugins Disponibles

| # | Plugin | Categoría | Precio | Licencia | Estado |
|---|--------|-----------|--------|----------|--------|
| 1 | **WhatsApp Twilio** | Comunicación | Gratis | Basic | ✅ Listo |
| 2 | **WhatsApp Meta API** | Comunicación | $19.99 | Medium | ✅ Listo |
| 3 | **Telegram** | Comunicación | Gratis | Basic | ✅ Listo |
| 4 | **Email** | Comunicación | Gratis | Basic | ✅ Listo |
| 5 | **SMS Twilio** | Comunicación | Gratis | Basic | ✅ Listo |
| 6 | **MercadoPago** | Pagos | Gratis | Basic | ✅ Listo |
| 7 | **PayPal** | Pagos | Gratis | Basic | ✅ Listo |
| 8 | **Stripe** | Pagos | Gratis | Basic | ✅ Listo |
| 9 | **OpenPay** | Pagos | Gratis | Basic | ✅ Listo |
| 10 | **n8n** | Automatización | $29.99 | Medium | ✅ Listo |

## 🔑 Licencias de Prueba

### Copiar y usar estas licencias:

```bash
# Basic - Acceso a plugins gratuitos
TEST-BASIC-23d7abc7

# Medium - Acceso a plugins premium nivel medio
TEST-MEDIUM-6a940e8d

# Advanced - Acceso a plugins avanzados
TEST-ADVANCED-3fd8e2fd

# Enterprise - Acceso a TODOS los plugins
TEST-ENTERPRISE-6ba6b0aa
```

## 🎯 Cómo Probar el Marketplace

### Opción 1: Usar dashboard del Store (Rápido)

```bash
# 1. Abrir en navegador
http://localhost:3001/dashboard/plugins

# 2. Ver plugins en la tabla
# 3. Hacer clic en "👁️ Ver" para ver detalles
```

### Opción 2: Usar API directamente (Desarrollo)

```bash
# Ver todos los plugins
curl http://localhost:3001/api/marketplace/plugins | python3 -m json.tool

# Filtrar por licencia basic
curl "http://localhost:3001/api/marketplace/plugins?licenseKey=TEST-BASIC-23d7abc7"

# Filtrar por licencia enterprise (todos los plugins)
curl "http://localhost:3001/api/marketplace/plugins?licenseKey=TEST-ENTERPRISE-6ba6b0aa"

# Filtrar por categoría
curl "http://localhost:3001/api/marketplace/plugins?category=communication"
```

### Opción 3: Desde el frontend ISP (Producción)

```bash
# 1. Iniciar frontend ISP
cd frontend
npm run serve

# 2. Abrir en navegador
http://localhost:8080

# 3. Login en el sistema

# 4. En localStorage del navegador (F12 → Console), agregar licencia:
localStorage.setItem('licenseKey', 'TEST-BASIC-23d7abc7');
localStorage.setItem('installationKey', 'INSTALL-test123');

# 5. Navegar a:
/plugins/marketplace

# 6. Ver plugins filtrados según tu licencia
# 7. Hacer clic en "Obtener" para activar
```

## 🔧 Comandos Útiles

```bash
# ==================== STORE ====================

# Iniciar Store
cd store && npm start

# Reiniciar base de datos (borra todo y recrea)
cd store && npm run setup

# Ver logs del Store
tail -f store/logs/combined.log

# ==================== BACKEND ====================

# Iniciar backend ISP
cd backend && npm start

# Ver plugins instalados
curl http://localhost:3000/api/system-plugins \
  -H "x-access-token: YOUR_TOKEN"

# ==================== FRONTEND ====================

# Iniciar frontend
cd frontend && npm run serve

# Build para producción
cd frontend && npm run build
```

## 📊 Verificar que Todo Funciona

```bash
# 1. Store está corriendo
curl http://localhost:3001/health
# Debería retornar: { "status": "ok", ... }

# 2. Store tiene plugins
curl http://localhost:3001/api/marketplace/plugins | grep -o "name" | wc -l
# Debería retornar: 10

# 3. Store tiene licencias
curl http://localhost:3001/api/licenses | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))"
# Debería retornar: 4

# 4. Verificar un plugin específico
curl http://localhost:3001/api/marketplace/plugins | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('✅ Plugins encontrados:', len(data['data']))
for p in data['data'][:3]:
    print(f\"  - {p['name']} ({p['category']}) - License: {p['requirements']['requiredLicense']}\")
"
```

## 🎨 URLs Importantes

```
Store Dashboard:
  http://localhost:3001/dashboard

Store API Docs:
  http://localhost:3001/api-docs (si está configurado)

ISP Frontend:
  http://localhost:8080

ISP Backend API:
  http://localhost:3000/api

Marketplace en ISP:
  http://localhost:8080/plugins/marketplace
```

## 📝 Próximos Pasos

Para seguir desarrollando:

1. **Crear plugins reales** en `backend/src/plugins/[nombre]/`
   - Cada plugin debe tener `manifest.json`
   - Implementar hooks y rutas según la arquitectura

2. **Empaquetar plugins como ZIP**
   - Usar `store/scripts/package-plugin.js` (si existe)
   - Subir a Store via API

3. **Probar activación completa**
   - Frontend → Click "Obtener"
   - Sistema descarga ZIP automáticamente
   - Backend instala y activa
   - Plugin se integra en el sistema

4. **Producción**
   - Cambiar `VUE_APP_MARKETPLACE_URL` a dominio real
   - Configurar CORS en Store para dominio de producción
   - Usar PostgreSQL en lugar de SQLite

## ⚠️ Notas Importantes

- **Frontend .env**: Configurado con `VUE_APP_MARKETPLACE_URL=http://localhost:3001/api/marketplace`
- **Store .env**: Usar `.env.example` como base
- **Licencias**: Solo para pruebas, crear sistema de licencias real para producción
- **Base de datos**: Store usa SQLite por defecto (cambiar a PostgreSQL para producción)

---

**Última actualización:** 2025-12-04
**Documentación completa:** Ver `MARKETPLACE_SETUP.md`
