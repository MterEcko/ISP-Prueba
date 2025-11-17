# ISP-Prueba Store - Guía de Configuración

## Requisitos Previos

- Node.js >= 16.0.0
- npm >= 8.0.0
- **Base de datos**: SQLite (para desarrollo) o PostgreSQL >= 12 (para producción)

## Instalación

### 1. Instalar Dependencias

```bash
cd store
npm install
```

### 2. Elegir Base de Datos

El sistema soporta dos opciones de base de datos:

#### Opción A: SQLite (Recomendado para desarrollo/pruebas)

✅ **Ventajas**:
- No requiere instalación adicional
- Archivo único portable
- Perfecto para desarrollo y testing
- Configuración instantánea

⚠️ **Limitaciones**:
- No recomendado para producción con alta concurrencia
- Menor rendimiento con muchos usuarios simultáneos

**Configuración**: En `.env` usa:
```env
DB_DIALECT=sqlite
SQLITE_PATH=./database.sqlite
```

#### Opción B: PostgreSQL (Recomendado para producción)

✅ **Ventajas**:
- Alta concurrencia
- Mejor rendimiento
- Robusto para producción

### 3. Configurar PostgreSQL (Solo si elegiste Opción B)

Asegúrate de que PostgreSQL esté instalado y en ejecución:

```bash
# En Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql

# En macOS con Homebrew
brew services start postgresql

# En Windows
# Inicia el servicio de PostgreSQL desde Servicios
```

### 3. Crear la Base de Datos

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Crear la base de datos
CREATE DATABASE isp_store;

# Crear usuario (opcional, si no usas el usuario postgres por defecto)
CREATE USER isp_admin WITH PASSWORD 'tu_contraseña';
GRANT ALL PRIVILEGES ON DATABASE isp_store TO isp_admin;

# Salir
\q
```

### 4. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isp_store
DB_USER=postgres
DB_PASSWORD=tu_contraseña
```

### 5. Inicializar la Base de Datos

El servidor creará automáticamente las tablas en el primer inicio. Para poblar con datos de prueba:

```bash
npm run seed
```

Esto creará:
- ✅ Licencia Master (`7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F`)
- ✅ 3 licencias de ejemplo (Basic, Premium, Enterprise)
- ✅ 6 plugins procesados y ofuscados:
  - MercadoPago (Gratis)
  - PayPal (Gratis)
  - VoIP Linphone (Gratis)
  - WhatsApp Business ($29.99)
  - Telegram Bot (Gratis)
  - Discord Bot (Gratis)
- ✅ 1 instalación de ejemplo
- ✅ Datos de telemetría de ejemplo

## Iniciar el Servidor

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

### Modo Producción

```bash
npm start
```

El servidor estará disponible en: http://localhost:3001

## Endpoints Disponibles

### API

- `GET /health` - Health check del servidor
- `POST /api/licenses/generate` - Generar nueva licencia
- `POST /api/licenses/activate` - Activar licencia
- `POST /api/licenses/verify` - Verificar licencia
- `GET /api/licenses` - Listar todas las licencias
- `POST /api/installations/register` - Registrar nueva instalación
- `POST /api/installations/heartbeat` - Enviar heartbeat
- `GET /api/installations` - Listar instalaciones
- `POST /api/installations/:id/block` - Bloquear instalación
- `POST /api/installations/:id/unblock` - Desbloquear instalación
- `GET /api/marketplace/plugins` - Listar plugins del marketplace
- `POST /api/marketplace/plugins/:id/download` - Descargar plugin
- `POST /api/telemetry/event` - Registrar evento de telemetría
- `POST /api/telemetry/metrics` - Enviar métricas del sistema
- `POST /api/telemetry/location` - Enviar ubicación GPS
- `POST /api/remote-control/command` - Enviar comando remoto
- `GET /api/remote-control/:installationId/pending` - Obtener comandos pendientes
- `GET /api/analytics/dashboard` - Estadísticas del dashboard
- `GET /api/analytics/map` - Datos del mapa de instalaciones

### Dashboard Web

- `GET /dashboard` - Dashboard principal
- `GET /dashboard/installations` - Gestión de instalaciones
- `GET /dashboard/licenses` - Gestión de licencias
- `GET /dashboard/plugins` - Gestión de plugins
- `GET /dashboard/map` - Mapa geográfico

## Licencia Master

La licencia master para desarrollo está hardcodeada:

```
7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F
```

Esta licencia:
- ✅ Nunca expira
- ✅ Clientes ilimitados
- ✅ Todas las features habilitadas
- ✅ No requiere activación en servidor
- ✅ Solo accesible viendo el código fuente

## Sistema de Plugins

Los plugins se almacenan ofuscados en `/store/uploads/plugins/`.

### Estructura de un Plugin

```
/uploads/plugins/
  ├── nombre-plugin/
  │   ├── manifest.json (metadata del plugin)
  │   ├── src/
  │   │   └── index.js (código principal)
  │   └── README.md
  └── nombre-plugin.plugin (archivo compilado y ofuscado)
```

### Agregar un Nuevo Plugin

1. Crea la carpeta del plugin en `/uploads/plugins/nombre-plugin/`
2. Crea el `manifest.json` con la metadata
3. Crea el código en `src/index.js`
4. Ejecuta el script de seed para procesar y ofuscar:

```bash
npm run seed
```

El sistema automáticamente:
- ✅ Ofuscará el código (Base64 + eval wrapper)
- ✅ Creará el archivo `.plugin` compilado
- ✅ Calculará el hash SHA256 para verificación
- ✅ Lo registrará en la base de datos

## Telemetría

El sistema recopila automáticamente:

- 📡 **Heartbeat**: Cada 5 minutos
- 💻 **Métricas**: CPU, RAM, Disco
- 📍 **GPS**: Ubicación geográfica
- 📊 **Eventos**: Acciones del usuario

## Control Remoto

Comandos disponibles:

- `block` - Bloquear instalación
- `unblock` - Desbloquear instalación
- `restart` - Reiniciar aplicación
- `message` - Enviar mensaje al usuario
- `collect_logs` - Solicitar logs del sistema

## Troubleshooting

### Error de conexión a PostgreSQL

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución**: Verifica que PostgreSQL esté corriendo:

```bash
sudo systemctl status postgresql
```

### Error: database "isp_store" does not exist

**Solución**: Crea la base de datos manualmente (ver paso 3 arriba)

### Puerto 3001 ya en uso

**Solución**: Cambia el puerto en `.env`:

```env
PORT=3002
```

## Producción

### Consideraciones de Seguridad

1. ✅ Cambia todas las claves secretas en `.env`
2. ✅ Usa contraseñas fuertes para PostgreSQL
3. ✅ Configura SSL/TLS para conexiones de base de datos
4. ✅ Habilita HTTPS en el servidor
5. ✅ Configura firewall para limitar acceso
6. ✅ Usa variables de entorno del sistema, no archivos .env
7. ✅ Habilita rate limiting más estricto

### Deploy con PM2

```bash
npm install -g pm2
pm2 start server.js --name isp-store
pm2 save
pm2 startup
```

### Deploy con Docker

```bash
docker build -t isp-store .
docker run -d -p 3001:3001 --name isp-store isp-store
```

## Cron Jobs Activos

- 🕐 **Verificación de licencias expiradas**: Cada 6 horas
- 🕐 **Limpieza de telemetría antigua**: Cada día a las 2 AM

## Soporte

Para reportar problemas o solicitar features, contacta al equipo de desarrollo de ISP-Prueba.
