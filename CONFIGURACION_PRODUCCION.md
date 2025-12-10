# Sistema de Configuracion para Produccion

## Arquitectura Segura para SaaS/Membresia

### El Problema
Si vendes tu software como membresia, NO puedes usar archivos `.env` porque:
- Los clientes veran el codigo fuente
- Podrian copiar tus credenciales
- No es profesional tener secretos en archivos de texto

### La Solucion (YA IMPLEMENTADA)

Tu sistema ya tiene la arquitectura correcta:

```
┌─────────────────┐
│  Interfaz Web   │  ← Cliente configura desde navegador
│ (SettingView)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │  ← /api/settings/telegram, /whatsapp
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ConfigHelper   │  ← Cifra con AES-256-CBC
│   (encrypted)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SystemConfiguration  │  ← Almacena en BD
│     (Tabla)          │    (PostgreSQL/MySQL)
└──────────────────────┘
```

## Configuraciones en Base de Datos

### Tabla: SystemConfigurations

```sql
CREATE TABLE SystemConfigurations (
  id SERIAL PRIMARY KEY,
  configKey VARCHAR(255),        -- Ej: "telegramBotToken"
  configValue TEXT,              -- ENCRIPTADO si configType='encrypted'
  configType ENUM('string', 'json', 'encrypted'),
  module VARCHAR(100),           -- 'telegram', 'whatsapp', 'email'
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Ejemplo de Datos Almacenados

```sql
-- TELEGRAM (Bot de Soporte)
INSERT INTO SystemConfigurations (configKey, configValue, configType, module)
VALUES
('telegramSupportBotToken', 'a1b2:c3d4e5f6g7...', 'encrypted', 'telegram'),
('telegramSupportEnabled', 'true', 'string', 'telegram');

-- TELEGRAM (Bot de Notificaciones Staff)
INSERT INTO SystemConfigurations (configKey, configValue, configType, module)
VALUES
('telegramNotificationsBotToken', 'x9y8:z7w6v5u4...', 'encrypted', 'telegram'),
('telegramNotificationsChatId', '-1001234567890', 'string', 'telegram'),
('telegramNotificationsEnabled', 'true', 'string', 'telegram');

-- WHATSAPP
INSERT INTO SystemConfigurations (configKey, configValue, configType, module)
VALUES
('whatsappMethod', 'twilio', 'string', 'whatsapp'),
('whatsappEnabled', 'true', 'string', 'whatsapp'),
('whatsappTwilioAccountSid', 'AC1234567890...', 'encrypted', 'whatsapp'),
('whatsappTwilioAuthToken', 'abcdef1234567890...', 'encrypted', 'whatsapp'),
('whatsappTwilioNumber', 'whatsapp:+14155238886', 'string', 'whatsapp');
```

## Configuracion en .env (Solo para Desarrollo)

```bash
# .env - DESARROLLO
NODE_ENV=development
PORT=3000

# IMPORTANTE: En produccion, esta es la UNICA variable que debe estar en .env
CONFIG_ENCRYPTION_KEY=tu_clave_super_secreta_de_32_caracteres_exactos

# En desarrollo puedes usar estas (se ignoran si existen en BD):
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
WHATSAPP_API_TOKEN=EAAFZBpX...
```

## Configuracion en Produccion

### Opcion 1: Variables de Entorno del Sistema (Recomendado)

```bash
# Solo la clave de cifrado
export CONFIG_ENCRYPTION_KEY="clave_unica_para_cada_instalacion_32b"
```

### Opcion 2: Docker Secrets

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    image: tu-isp-backend
    environment:
      - CONFIG_ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
    secrets:
      - encryption_key

secrets:
  encryption_key:
    file: ./secrets/encryption_key.txt
```

### Opcion 3: Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  encryption-key: base64_encoded_key
```

## Flujo de Uso

### 1. Cliente Instala Tu Software

```bash
# El cliente recibe tu codigo
git clone tu-repo
cd backend

# Solo necesita configurar UNA variable
echo "CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 16)" > .env

# Inicia el sistema
docker-compose up -d
```

### 2. Cliente Configura desde Web

```
1. Va a http://su-dominio.com/settings
2. Click en pestana "Telegram"
3. Ingresa su propio bot token
4. Guarda
5. El sistema encripta y guarda en BD
```

### 3. Sistema Usa las Configuraciones

```javascript
// backend/src/services/telegramBot.service.js

class TelegramBotService {
  async initialize() {
    // Lee desde BD (encriptado)
    const token = await configHelper.get('telegramSupportBotToken');

    if (!token) {
      logger.warn('Telegram no configurado');
      return;
    }

    // Usa el token (ya desencriptado automaticamente)
    this.bot = new TelegramBot(token, { polling: true });
  }
}
```

## Ventajas de Este Sistema

### Para Ti (Vendedor)
1. Los clientes no ven tus credenciales
2. Cada instalacion usa sus propias credenciales
3. Sistema profesional y escalable
4. Facil de actualizar sin tocar configuraciones

### Para el Cliente
1. Configuracion desde interfaz web (no tocar archivos)
2. No necesita conocimientos tecnicos
3. Puede cambiar credenciales cuando quiera
4. Backup facil (solo exportar BD)

## Estructura de Dos Bots de Telegram

### Bot 1: Soporte a Clientes

```
Configuracion en BD:
- telegramSupportBotToken
- telegramSupportEnabled

Uso:
- Clientes escriben a @TuISPSoporteBot
- Mensajes aparecen en /chat del sistema
- Staff responde desde web
- Respuesta llega al cliente en Telegram
```

### Bot 2: Notificaciones al Staff

```
Configuracion en BD:
- telegramNotificationsBotToken
- telegramNotificationsChatId (ID del grupo del staff)
- telegramNotificationsEnabled

Uso:
- Nuevo ticket → Notifica al grupo
- Factura vencida → Notifica al grupo
- Router caido → Notifica al grupo
- Cliente moroso → Notifica al grupo
```

## Migracion de .env a BD

Si ya tienes configuraciones en .env, migra asi:

```javascript
// backend/src/scripts/migrate-config.js

const db = require('../models');
const configHelper = require('../helpers/configHelper');

async function migrateEnvToDb() {
  // Telegram
  if (process.env.TELEGRAM_BOT_TOKEN) {
    await db.SystemConfiguration.create({
      configKey: 'telegramSupportBotToken',
      configValue: configHelper.encrypt(process.env.TELEGRAM_BOT_TOKEN),
      configType: 'encrypted',
      module: 'telegram'
    });
  }

  // WhatsApp
  if (process.env.WHATSAPP_API_TOKEN) {
    await db.SystemConfiguration.create({
      configKey: 'whatsappApiToken',
      configValue: configHelper.encrypt(process.env.WHATSAPP_API_TOKEN),
      configType: 'encrypted',
      module: 'whatsapp'
    });
  }

  console.log('Migracion completada!');
}

migrateEnvToDb();
```

## Seguridad

### Encriptacion AES-256-CBC

```javascript
// El sistema ya implementa esto:

// Cifrar
const encrypted = configHelper.encrypt('mi_token_secreto');
// Resultado: "iv:encrypted_text"
// Ejemplo: "a1b2c3d4e5f6:g7h8i9j0k1l2m3n4..."

// Descifrar (automatico al leer)
const decrypted = configHelper.decrypt(encrypted);
// Resultado: "mi_token_secreto"
```

### Rotacion de Claves

Si necesitas cambiar la clave de cifrado:

```bash
# 1. Genera nueva clave
export NEW_KEY=$(openssl rand -hex 16)

# 2. Ejecuta script de rotacion
node scripts/rotate-encryption-key.js --old-key=$CONFIG_ENCRYPTION_KEY --new-key=$NEW_KEY

# 3. Actualiza variable
export CONFIG_ENCRYPTION_KEY=$NEW_KEY
```

## Backup y Restauracion

### Backup

```bash
# Solo necesitas respaldar la BD
pg_dump -U postgres tu_base_datos > backup.sql

# O exportar solo configuraciones
psql -U postgres -d tu_base_datos -c "COPY SystemConfigurations TO '/tmp/configs.csv' CSV HEADER"
```

### Restauracion

```bash
# Restaurar BD completa
psql -U postgres -d nueva_base_datos < backup.sql

# Importante: Usa la MISMA clave de cifrado
export CONFIG_ENCRYPTION_KEY="la_misma_clave_del_backup"
```

## Preguntas Frecuentes

### P: Puedo modificar el .env en produccion?
R: NO. Usa la interfaz web o la BD directamente.

### P: Donde se almacenan las configuraciones?
R: En la tabla `SystemConfigurations` de tu base de datos.

### P: Estan seguras las credenciales?
R: Si, se cifran con AES-256-CBC antes de almacenarse.

### P: Puedo tener multiples instalaciones?
R: Si, cada instalacion tiene su propia BD con sus propias credenciales.

### P: Como actualizo una configuracion?
R: Desde http://tu-dominio.com/settings o directo en BD.

### P: Que pasa si pierdo la clave de cifrado?
R: Las configuraciones encriptadas seran irrecuperables. Debes configurarlas de nuevo.

### P: Puedo cambiar de Twilio a WhatsApp API?
R: Si, solo cambias el metodo desde /settings y actualizas las credenciales.

## Resumen

1. **DESARROLLO**: Usa .env para rapidez
2. **PRODUCCION**: Todo en BD encriptada
3. **CLIENTES**: Configuran desde web
4. **SEGURIDAD**: AES-256-CBC automatico
5. **ESCALABLE**: Multiples instalaciones sin conflictos

Tu sistema ya esta listo para produccion!
