# ISP-Prueba Store Server

## 📋 Descripción

Servidor centralizado para gestión de licencias, marketplace de plugins, telemetría y control remoto de instalaciones de ISP-Prueba.

## 🚀 Características

### 🔑 Sistema de Licencias
- Generación y activación de licencias
- Validación en tiempo real
- Soporte para múltiples planes (Basic, Premium, Enterprise)
- Licencias maestras para desarrollo
- Control de límites por plan
- Renovación automática y manual

### 🧩 Marketplace de Plugins
- Catálogo de plugins con categorías
- Descarga segura con hash verification
- Estadísticas de descargas
- Ratings y reviews
- Control de versiones
- Distribución de actualizaciones

### 📊 Sistema de Telemetría
- Heartbeat automático de instalaciones
- Métricas de hardware (CPU, RAM, disco)
- Tracking de eventos y acciones
- Geolocalización GPS
- Detección de anomalías

### 🌍 Geolocalización
- Tracking GPS de instalaciones
- Historial de ubicaciones
- Mapas en tiempo real
- Detección de movimientos sospechosos
- GeoIP para IPs públicas

### 🔒 Control Remoto
- Bloqueo/desbloqueo de instalaciones
- Envío de comandos remotos
- Recolección de logs
- Reinicio remoto
- Mensajes al usuario

### 📈 Analytics
- Dashboard de estadísticas
- Mapas de instalaciones
- Reportes por país/ciudad
- Métricas de uso
- Alertas automáticas

## 📦 Instalación

### Requisitos

- Node.js >= 16.0.0
- PostgreSQL >= 13
- npm >= 8.0.0

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   cd /home/user/ISP-Prueba/store
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Crear base de datos**
   ```sql
   CREATE DATABASE isp_store;
   ```

5. **Inicializar base de datos**
   ```bash
   npm run init-db
   ```

6. **Iniciar servidor**
   ```bash
   # Desarrollo
   npm run dev

   # Producción
   npm start
   ```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | Ambiente (development/production) | development |
| `PORT` | Puerto del servidor | 3001 |
| `DB_HOST` | Host de PostgreSQL | localhost |
| `DB_NAME` | Nombre de la base de datos | isp_store |
| `DB_USER` | Usuario de PostgreSQL | postgres |
| `DB_PASSWORD` | Contraseña de PostgreSQL | - |
| `JWT_SECRET` | Secret para JWT | - |
| `TELEMETRY_ENABLED` | Habilitar telemetría | true |
| `GPS_TRACKING_ENABLED` | Habilitar GPS | true |

## 📡 API Endpoints

### Licencias

```http
POST   /api/licenses/generate         # Generar nueva licencia
POST   /api/licenses/activate         # Activar licencia
POST   /api/licenses/verify           # Verificar licencia
GET    /api/licenses/:licenseKey      # Obtener licencia
PUT    /api/licenses/:licenseKey/revoke  # Revocar licencia
GET    /api/licenses                  # Listar todas
```

### Instalaciones

```http
POST   /api/installations/register    # Registrar instalación
POST   /api/installations/heartbeat   # Enviar heartbeat
GET    /api/installations/:key        # Obtener instalación
PUT    /api/installations/:key/block  # Bloquear instalación
PUT    /api/installations/:key/unblock  # Desbloquear
GET    /api/installations             # Listar todas
```

### Plugins

```http
GET    /api/plugins                   # Listar plugins
GET    /api/plugins/:id               # Obtener plugin
POST   /api/plugins/:id/download      # Descargar plugin
POST   /api/plugins                   # Crear plugin
```

### Telemetría

```http
POST   /api/telemetry/event           # Registrar evento
POST   /api/telemetry/metrics         # Enviar métricas
POST   /api/telemetry/location        # Enviar ubicación
GET    /api/telemetry/installation/:key  # Obtener telemetría
```

### Control Remoto

```http
POST   /api/remote-control/command    # Enviar comando
GET    /api/remote-control/commands/:key  # Obtener comandos pendientes
PUT    /api/remote-control/commands/:id/response  # Responder comando
```

### Analytics

```http
GET    /api/analytics/dashboard       # Dashboard general
GET    /api/analytics/map             # Mapa de instalaciones
GET    /api/analytics/stats           # Estadísticas
```

## 🔧 Uso del Cliente

### Registro de Instalación

```javascript
// Frontend
import telemetryService from '@/services/telemetry.service';

// Registrar instalación (primera vez)
await telemetryService.registerInstallation({
  companyName: 'Mi Empresa ISP',
  contactEmail: 'admin@miempresa.com',
  contactPhone: '+1234567890'
});
```

### Activar Licencia

```javascript
await this.$store.dispatch('license/activateLicense', {
  licenseKey: 'XXXX-XXXX-XXXX-XXXX',
  hardwareId: 'AUTO-GENERATED'
});
```

### Telemetría Automática

```javascript
// Se inicia automáticamente al hacer login
// Envía heartbeat cada 5 minutos
// Envía métricas de hardware
// Envía ubicación GPS (si está habilitado)
```

### Recibir Comandos Remotos

```javascript
// El cliente verifica comandos pendientes automáticamente
// Ejecuta: block, unblock, restart, message, collect_logs
```

## 📊 Modelos de Datos

### Installation
- ID único de instalación
- Información de compañía
- Hardware ID
- Estado (active, blocked, suspended)
- Licencia actual
- Última actividad
- Ubicación GPS actual

### License
- Clave de licencia
- Tipo de plan
- Límites (clientes, usuarios, sucursales)
- Características habilitadas
- Fechas de emisión/expiración
- Estado

### Plugin
- Información del plugin
- Versión y autor
- Categoría y precio
- Archivo descargable
- Estadísticas de descarga

### TelemetryData
- Eventos del sistema
- Timestamp
- Datos JSON

### InstallationMetrics
- CPU, RAM, Disco
- Red (upload/download)
- Conexiones activas

### InstallationLocation
- Latitud/Longitud
- Accuracy
- País/Ciudad
- IP Address

### RemoteCommand
- Tipo de comando
- Parámetros
- Estado (pending, sent, executed, failed)
- Respuesta

## 🔒 Seguridad

### Autenticación
- JWT tokens para APIs protegidas
- Rate limiting por IP
- Helmet para headers de seguridad

### Validación
- Hardware ID binding para licencias
- Verificación de hash para plugins
- Sanitización de inputs

### Bloqueo Remoto
- Capacidad de bloquear instalaciones comprometidas
- Revocación de licencias en tiempo real
- Alertas de actividad sospechosa

## 🎯 Casos de Uso

### 1. Nueva Instalación

```
Cliente instala ISP-Prueba
→ Registra instalación en Store
→ Obtiene installationKey
→ Activa licencia
→ Comienza telemetría automática
```

### 2. Monitoreo de Cliente

```
Administrador accede a dashboard
→ Ve instalación en mapa
→ Revisa métricas de hardware
→ Ve eventos recientes
→ Envía comando si es necesario
```

### 3. Bloqueo por Uso Indebido

```
Sistema detecta actividad sospechosa
→ Genera alerta
→ Administrador revisa
→ Envía comando de bloqueo
→ Cliente recibe bloqueo
→ Sistema se bloquea automáticamente
```

### 4. Instalación de Plugin

```
Cliente navega marketplace
→ Selecciona plugin
→ Descarga desde Store
→ Store registra descarga
→ Cliente instala localmente
```

## 📝 Logs

Los logs se guardan en:
- `logs/store.log` - Todos los logs
- `logs/error.log` - Solo errores

Formato:
```
2025-01-17 10:30:45 [INFO]: Nueva instalación registrada: ABC123DEF456
2025-01-17 10:31:00 [WARN]: Instalación bloqueada: ABC123DEF456 - Razón: Licencia expirada
```

## 🔄 Tareas Automáticas (Cron)

- **Cada 6 horas**: Verificar licencias expiradas
- **Cada día (2 AM)**: Limpiar datos de telemetría antiguos
- **En tiempo real**: Detectar instalaciones offline (>10 min sin heartbeat)

## 🚀 Despliegue en Producción

### Usando PM2

```bash
npm install -g pm2
pm2 start server.js --name isp-store
pm2 save
pm2 startup
```

### Usando Docker

```dockerfile
# Próximamente
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name store.ispprueba.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
cat .env
```

### Puerto ya en uso
```bash
# Cambiar el puerto en .env
PORT=3002
```

### Licencias no se activan
```bash
# Verificar logs
tail -f logs/store.log

# Verificar que el cliente tiene el installationKey correcto
```

## 📞 Soporte

- **Email**: soporte@ispprueba.com
- **Docs**: https://docs.ispprueba.com
- **GitHub**: https://github.com/ispprueba/store

---

**Desarrollado por**: ISP-Prueba Team
**Versión**: 1.0.0
**Licencia**: Proprietary
**Última actualización**: 2025-01-17
