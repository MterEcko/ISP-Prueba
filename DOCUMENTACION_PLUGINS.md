# 📚 Documentación del Sistema de Plugins - ISP-Prueba

## 📖 Índice de Documentación

Este repositorio contiene documentación completa sobre el sistema de plugins y marketplace. Aquí encontrarás **todo lo que necesitas** para crear, distribuir y gestionar plugins.

---

## 🎯 Por dónde empezar

### 1. **¿Quieres USAR el Marketplace?**
→ Lee: **[QUICKSTART_MARKETPLACE.md](QUICKSTART_MARKETPLACE.md)**
- Inicio rápido en 5 minutos
- Licencias de prueba
- Cómo activar plugins desde el frontend

### 2. **¿Quieres CREAR un Plugin?**
→ Lee: **[PLUGIN_DEVELOPMENT_GUIDE.md](PLUGIN_DEVELOPMENT_GUIDE.md)**
- Guía completa paso a paso
- Estructura de archivos
- Código de ejemplo funcional
- manifest.json explicado
- Testing y debugging

### 3. **¿Quieres ENTENDER cómo funciona internamente?**
→ Lee: **[COMO_FUNCIONAN_LOS_PLUGINS.md](COMO_FUNCIONAN_LOS_PLUGINS.md)**
- Arquitectura interna
- Código real del sistema
- Ciclo de vida completo
- Métodos obligatorios
- Troubleshooting avanzado

### 4. **¿Quieres CONFIGURAR el Store/Marketplace?**
→ Lee: **[MARKETPLACE_SETUP.md](MARKETPLACE_SETUP.md)**
- Configuración del Store server
- API endpoints
- Licencias y telemetría
- Producción vs desarrollo

---

## 📁 Documentos Disponibles

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[QUICKSTART_MARKETPLACE.md](QUICKSTART_MARKETPLACE.md)** | Inicio rápido del marketplace | Usuarios, Testers |
| **[PLUGIN_DEVELOPMENT_GUIDE.md](PLUGIN_DEVELOPMENT_GUIDE.md)** | Guía completa de desarrollo | Desarrolladores |
| **[COMO_FUNCIONAN_LOS_PLUGINS.md](COMO_FUNCIONAN_LOS_PLUGINS.md)** | Arquitectura interna | Desarrolladores avanzados |
| **[MARKETPLACE_SETUP.md](MARKETPLACE_SETUP.md)** | Configuración del Store | DevOps, Admins |
| **[LICENSES_AND_PLUGINS_README.md](LICENSES_AND_PLUGINS_README.md)** | Sistema de licencias | Todos |

---

## 🚀 Quick Start de 2 Minutos

### Probar el Marketplace

```bash
# 1. Iniciar Store
cd store && npm start

# 2. Iniciar Backend
cd backend && npm start

# 3. Iniciar Frontend
cd frontend && npm run serve

# 4. Abrir navegador
http://localhost:8080/plugins/marketplace

# 5. Activar licencia (en consola del navegador F12)
localStorage.setItem('licenseKey', 'TEST-BASIC-23d7abc7');
```

### Crear tu Primer Plugin

```bash
# 1. Copiar estructura de ejemplo
cp -r backend/src/plugins/email backend/src/plugins/mi-plugin

# 2. Editar manifest.json
nano backend/src/plugins/mi-plugin/manifest.json

# 3. Editar controller
nano backend/src/plugins/mi-plugin/src/mi-plugin.controller.js

# 4. Empaquetar
cd backend/src/plugins/mi-plugin
zip -r ../../../../store/plugins/mi-plugin.zip . -x "*.git*" -x "*node_modules*"

# 5. Actualizar Store
cd store && npm run seed
```

---

## 🔌 Plugins de Ejemplo Incluidos

Revisa estos plugins como referencia:

### 📧 Email (`backend/src/plugins/email/`)
- **Categoría:** communication
- **Providers:** SMTP, SendGrid, Mailgun
- **Métodos:** initialize(), send(), verify()
- **Webhooks:** Sí
- **Archivos:** 872 líneas de código

### 💳 MercadoPago (`backend/src/plugins/mercadopago/`)
- **Categoría:** payment
- **Países:** AR, BR, CL, CO, MX, PE, UY
- **Métodos:** initialize(), processPayment(), handleWebhook()
- **Configuración:** JSON Schema completo
- **Archivos:** Controller, Service, Routes

### 💵 Stripe (`backend/src/plugins/stripe/`)
- **Categoría:** payment
- **Métodos de pago:** Tarjetas, OXXO, SPEI
- **Webhooks:** Signature validation
- **Archivos:** Controller, Service, Routes

### 💬 WhatsApp (`backend/src/plugins/whatsapp/`)
- **Categoría:** communication
- **Providers:** Twilio, Meta Business API
- **Métodos:** initialize(), send(), sendTemplate()

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue.js)                         │
│  - PluginMarketplaceView.vue                                 │
│  - StoreDashboard.vue                                        │
│  - LicenseActivationView.vue                                 │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND ISP (Express.js)                        │
│  - systemPlugin.controller.js  ← Gestión de plugins         │
│  - pluginUpload.controller.js  ← Instalación                │
│  - SystemPlugin model          ← Base de datos              │
└────────────────┬────────────────────────────────────────────┘
                 │ Descarga ZIPs
                 ▼
┌─────────────────────────────────────────────────────────────┐
│            STORE SERVER (Express.js:3001)                    │
│  - Plugin routes           ← API Marketplace                 │
│  - License routes          ← Validación de licencias         │
│  - SQLite database         ← 10 plugins + 4 licencias        │
│  - /store/plugins/*.zip    ← Archivos descargables           │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   PLUGINS INSTALADOS                         │
│  backend/src/plugins/                                        │
│  ├── email/         ← Plugin activo                          │
│  ├── mercadopago/   ← Plugin activo                          │
│  └── stripe/        ← Plugin activo                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuración Necesaria

### Variables de Entorno

**Frontend (.env):**
```bash
VUE_APP_MARKETPLACE_URL=http://localhost:3001/api/marketplace
```

**Store (.env):**
```bash
PORT=3001
ALLOWED_ORIGINS=http://localhost:8080,https://isp.serviciosqbit.net
```

**Backend (.env):**
```bash
MARKETPLACE_URL=http://localhost:3001
```

---

## 📝 Checklist Completo

### Para Desarrolladores de Plugins

- [ ] Leer PLUGIN_DEVELOPMENT_GUIDE.md
- [ ] Leer COMO_FUNCIONAN_LOS_PLUGINS.md
- [ ] Revisar plugins de ejemplo (email, mercadopago)
- [ ] Crear estructura de archivos
- [ ] Escribir manifest.json
- [ ] Implementar controller con métodos obligatorios
- [ ] Crear service si es necesario
- [ ] Escribir tests
- [ ] Empaquetar como ZIP
- [ ] Probar instalación local
- [ ] Subir al Store

### Para Usuarios del Marketplace

- [ ] Leer QUICKSTART_MARKETPLACE.md
- [ ] Iniciar Store server
- [ ] Activar licencia en frontend
- [ ] Navegar a /plugins/marketplace
- [ ] Instalar plugin de prueba
- [ ] Configurar plugin
- [ ] Verificar funcionamiento

### Para Administradores del Store

- [ ] Leer MARKETPLACE_SETUP.md
- [ ] Configurar CORS correctamente
- [ ] Crear licencias de prueba
- [ ] Seed de plugins
- [ ] Verificar archivos ZIP
- [ ] Probar endpoints API
- [ ] Configurar producción

---

## 🐛 Troubleshooting

### Problema: Plugin no aparece en marketplace
**Solución:** Verificar que el Store tiene el plugin en DB
```bash
cd store && npm run seed
curl http://localhost:3001/api/marketplace/plugins
```

### Problema: CORS error al cargar plugins
**Solución:** Verificar ALLOWED_ORIGINS en store/.env y reiniciar Store

### Problema: Plugin no se activa
**Solución:** Revisar logs del backend
```bash
tail -f backend/logs/combined.log | grep "Plugin"
```

### Problema: Método no implementado
**Solución:** Verificar métodos obligatorios según categoría en COMO_FUNCIONAN_LOS_PLUGINS.md

---

## 📞 Soporte y Contribuciones

### Reportar Bugs
- Crear issue en GitHub con logs completos
- Incluir versión del sistema
- Describir pasos para reproducir

### Contribuir
1. Fork del repositorio
2. Crear branch feature/mi-plugin
3. Desarrollar siguiendo PLUGIN_DEVELOPMENT_GUIDE.md
4. Submit PR con documentación

### Contacto
- Documentación oficial: Este repositorio
- Logs: `backend/logs/`, `store/logs/`
- Comunidad: [Tu canal de soporte]

---

## 📊 Estadísticas Actuales

- **Plugins de ejemplo:** 6 (email, mercadopago, stripe, paypal, openpay, whatsapp)
- **Líneas de documentación:** ~1,500
- **Categorías soportadas:** 6 (communication, payment, automation, integration, reporting, security)
- **Licencias de prueba:** 4 (basic, medium, advanced, enterprise)
- **Archivos ZIP funcionales:** 12 plugins listos para instalar

---

## ✅ Estado de la Documentación

| Documento | Estado | Última Actualización |
|-----------|--------|---------------------|
| QUICKSTART_MARKETPLACE.md | ✅ Completo | 2025-12-04 |
| PLUGIN_DEVELOPMENT_GUIDE.md | ✅ Completo | 2025-12-05 |
| COMO_FUNCIONAN_LOS_PLUGINS.md | ✅ Completo | 2025-12-05 |
| MARKETPLACE_SETUP.md | ✅ Completo | 2025-12-04 |
| LICENSES_AND_PLUGINS_README.md | ✅ Completo | 2025-11-26 |

---

## 🎓 Roadmap de Aprendizaje

### Nivel 1: Principiante
1. Lee QUICKSTART_MARKETPLACE.md
2. Instala un plugin de prueba
3. Configura el plugin desde la UI

### Nivel 2: Intermedio
1. Lee PLUGIN_DEVELOPMENT_GUIDE.md
2. Copia un plugin de ejemplo
3. Modifica manifest.json y controller
4. Empaqueta y prueba localmente

### Nivel 3: Avanzado
1. Lee COMO_FUNCIONAN_LOS_PLUGINS.md
2. Entiende el ciclo de vida interno
3. Crea plugin desde cero
4. Implementa webhooks y routes personalizadas

### Nivel 4: Experto
1. Contribuye a la documentación
2. Crea plugins para el marketplace público
3. Optimiza el sistema de plugins
4. Ayuda a otros desarrolladores

---

**Última actualización:** 2025-12-05
**Versión del sistema:** 1.0.0
**Mantenido por:** Equipo ISP-Prueba

---

## 🎯 Siguiente Paso

**¿Qué quieres hacer?**

- 👉 **Probar el marketplace:** [QUICKSTART_MARKETPLACE.md](QUICKSTART_MARKETPLACE.md)
- 👉 **Crear un plugin:** [PLUGIN_DEVELOPMENT_GUIDE.md](PLUGIN_DEVELOPMENT_GUIDE.md)
- 👉 **Entender el sistema:** [COMO_FUNCIONAN_LOS_PLUGINS.md](COMO_FUNCIONAN_LOS_PLUGINS.md)

¡Buena suerte! 🚀
