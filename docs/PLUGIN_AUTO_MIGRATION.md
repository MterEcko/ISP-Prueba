# Arquitectura de Auto-Migración por Plugin

## 📋 Concepto

Cada plugin debe gestionar sus propias migraciones de base de datos de forma automática. Cuando un plugin se instala o actualiza, debe poder crear/actualizar sus tablas y columnas sin intervención manual.

## 🏗️ Estructura de un Plugin con Auto-Migración

```
backend/src/plugins/
  ├── email/
  │   ├── package.json
  │   ├── src/
  │   │   ├── index.js                 # Punto de entrada
  │   │   ├── config/
  │   │   │   └── ConfigView.vue       # Vista de configuración
  │   │   ├── models/
  │   │   │   └── email-log.model.js   # Modelos del plugin
  │   │   ├── services/
  │   │   │   └── email.service.js
  │   │   └── utils/
  │   │       └── auto-migration.js    # 🔥 MIGRACIONES DEL PLUGIN
  │   └── README.md
  │
  ├── mercadopago/
  │   ├── package.json
  │   ├── src/
  │   │   ├── index.js
  │   │   ├── config/
  │   │   │   └── ConfigView.vue
  │   │   ├── models/
  │   │   │   └── mercadopago-transaction.model.js
  │   │   └── utils/
  │   │       └── auto-migration.js    # 🔥 MIGRACIONES DEL PLUGIN
  │   └── README.md
  │
  └── [otros plugins...]
```

## 📝 Implementación

### 1. Archivo `auto-migration.js` del Plugin

Cada plugin debe tener su propio archivo de migraciones:

**Ejemplo: `backend/src/plugins/email/src/utils/auto-migration.js`**

```javascript
const logger = require('../../../../utils/logger');

/**
 * Registrar migraciones del plugin Email
 * @param {AutoMigration} autoMigration - Instancia del sistema de auto-migración
 */
function registerEmailMigrations(autoMigration) {
  // Migración 1: Crear tabla EmailLogs si no existe
  autoMigration.register('email-plugin-email-logs-table', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('EmailLogs');

    if (!tableExists) {
      await sequelize.query(`
        CREATE TABLE "EmailLogs" (
          "id" SERIAL PRIMARY KEY,
          "channelId" INTEGER REFERENCES "CommunicationChannels"("id"),
          "recipient" VARCHAR(255) NOT NULL,
          "subject" VARCHAR(255),
          "body" TEXT,
          "status" VARCHAR(50) DEFAULT 'pending',
          "sentAt" TIMESTAMP,
          "error" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `);
      logger.info('✅ Tabla EmailLogs creada');
    }

    return true;
  });

  // Migración 2: Agregar columna de template si falta
  autoMigration.register('email-plugin-template-column', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('EmailLogs');

    if (tableExists) {
      await autoMigration.addColumnIfNotExists(
        'EmailLogs',
        'templateId',
        'INTEGER'
      );
    }

    return true;
  });

  // Migración 3: Agregar columna de attachments
  autoMigration.register('email-plugin-attachments-column', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('EmailLogs');

    if (tableExists) {
      await autoMigration.addColumnIfNotExists(
        'EmailLogs',
        'attachments',
        'JSON'
      );
    }

    return true;
  });
}

module.exports = {
  registerEmailMigrations
};
```

### 2. Integración en el Plugin

**Archivo: `backend/src/plugins/email/src/index.js`**

```javascript
const { registerEmailMigrations } = require('./utils/auto-migration');

module.exports = {
  name: 'email',
  displayName: 'Email SMTP',
  category: 'communication',
  version: '1.0.0',

  // 🔥 NUEVO: Función de auto-migración
  autoMigration: (autoMigration) => {
    registerEmailMigrations(autoMigration);
  },

  // Resto de la configuración del plugin
  initialize: async (config) => {
    // ...
  },

  sendEmail: async (emailData) => {
    // ...
  }
};
```

### 3. Carga Automática en el Sistema

**Modificar: `backend/src/index.js`**

```javascript
// Después de sincronizar la base de datos
async function synchronizeDatabase() {
  try {
    console.log('🔄 Sincronizando base de datos...');

    await db.sequelize.sync({
      force: false,
      alter: false
    });

    // ============================================
    // AUTO-MIGRACIONES DEL SISTEMA
    // ============================================
    const autoMigration = new AutoMigration(db.sequelize);
    registerSystemMigrations(autoMigration);

    // ============================================
    // AUTO-MIGRACIONES DE PLUGINS INSTALADOS
    // ============================================
    const pluginModelsService = require('./services/pluginModels.service');
    const activePlugins = await db.SystemPlugin.findAll({
      where: { active: true }
    });

    for (const pluginRecord of activePlugins) {
      try {
        const pluginPath = path.join(__dirname, 'plugins', pluginRecord.name, 'src', 'index.js');

        if (fs.existsSync(pluginPath)) {
          const plugin = require(pluginPath);

          // Si el plugin tiene función de auto-migración, ejecutarla
          if (typeof plugin.autoMigration === 'function') {
            console.log(`📦 Registrando migraciones del plugin: ${pluginRecord.displayName || pluginRecord.name}`);
            plugin.autoMigration(autoMigration);
          }
        }
      } catch (error) {
        console.warn(`⚠️  No se pudieron cargar migraciones del plugin ${pluginRecord.name}:`, error.message);
      }
    }

    // Ejecutar todas las migraciones (sistema + plugins)
    await autoMigration.runAll();

    console.log("Conexión a la base de datos establecida y modelos sincronizados.");

    // ... resto del código
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error);
    process.exit(1);
  }
}
```

## 🔄 Flujo de Ejecución

```
1. Backend inicia
2. Sincroniza modelos base (Sequelize sync)
3. Crea instancia de AutoMigration
4. Registra migraciones del SISTEMA
5. Busca plugins activos en la DB
6. Para cada plugin:
   - Carga su archivo index.js
   - Llama a plugin.autoMigration(autoMigration)
   - El plugin registra sus migraciones
7. Ejecuta TODAS las migraciones (sistema + plugins)
8. Backend listo
```

## ✅ Ventajas

1. **Auto-contenido**: Cada plugin gestiona sus propias tablas
2. **Sin conflictos**: Las migraciones son independientes
3. **Versionable**: Puedes agregar migraciones nuevas sin romper instalaciones antiguas
4. **Reversible**: Podrías implementar rollback por plugin
5. **Debugging fácil**: Los logs muestran qué plugin hizo qué cambio

## 📦 Ejemplo Completo: Plugin MercadoPago

**Archivo: `backend/src/plugins/mercadopago/src/utils/auto-migration.js`**

```javascript
const logger = require('../../../../utils/logger');

function registerMercadoPagoMigrations(autoMigration) {
  // Migración 1: Crear tabla de transacciones
  autoMigration.register('mercadopago-transactions-table', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('MercadoPagoTransactions');

    if (!tableExists) {
      const dialect = sequelize.getDialect();

      if (dialect === 'postgres') {
        await sequelize.query(`
          CREATE TABLE "MercadoPagoTransactions" (
            "id" SERIAL PRIMARY KEY,
            "paymentId" INTEGER REFERENCES "Payments"("id"),
            "mpPaymentId" VARCHAR(255) UNIQUE,
            "mpPreferenceId" VARCHAR(255),
            "status" VARCHAR(50),
            "statusDetail" VARCHAR(255),
            "payerEmail" VARCHAR(255),
            "payerName" VARCHAR(255),
            "amount" DECIMAL(10,2),
            "currency" VARCHAR(10) DEFAULT 'MXN',
            "webhook Data" JSON,
            "createdAt" TIMESTAMP DEFAULT NOW(),
            "updatedAt" TIMESTAMP DEFAULT NOW()
          );
        `);
      } else {
        await sequelize.query(`
          CREATE TABLE MercadoPagoTransactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paymentId INTEGER,
            mpPaymentId TEXT UNIQUE,
            mpPreferenceId TEXT,
            status TEXT,
            statusDetail TEXT,
            payerEmail TEXT,
            payerName TEXT,
            amount REAL,
            currency TEXT DEFAULT 'MXN',
            webhookData TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }

      logger.info('✅ Tabla MercadoPagoTransactions creada');
    }

    return true;
  });

  // Migración 2: Agregar método de pago 'mercadopago' al enum
  autoMigration.register('mercadopago-payment-method-enum', async (sequelize) => {
    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      await autoMigration.addEnumValue('enum_Payments_paymentMethod', 'mercadopago');
    } else {
      logger.info('✅ Método de pago mercadopago validado (SQLite)');
    }

    return true;
  });
}

module.exports = {
  registerMercadoPagoMigrations
};
```

## 🚀 Instalación de Nuevo Plugin

Cuando se instala un plugin:

1. Se registra en `SystemPlugins`
2. Se marca como `active: true`
3. En el próximo reinicio del backend:
   - El sistema detecta el nuevo plugin activo
   - Carga su `index.js`
   - Ejecuta `plugin.autoMigration(autoMigration)`
   - El plugin registra sus migraciones
   - Se ejecutan automáticamente

**No se requiere intervención manual!** 🎉

## 📌 Notas Importantes

1. **Nombres únicos**: Cada migración debe tener un nombre único (usa prefijo del plugin)
2. **Idempotencia**: Las migraciones deben poder ejecutarse múltiples veces sin error
3. **Logs claros**: Usa logger.info para indicar qué se hizo
4. **Compatibilidad**: Soporta PostgreSQL y SQLite
5. **No borrar datos**: Las migraciones solo AGREGAN, nunca ELIMINAN

## 🔍 Troubleshooting

**Problema**: Plugin no ejecuta migraciones
- **Solución**: Verificar que `plugin.autoMigration` esté definido en `index.js`

**Problema**: Error "tabla ya existe"
- **Solución**: Usar `tableExists()` antes de CREATE TABLE

**Problema**: Migración falla pero backend inicia
- **Solución**: Normal! Las migraciones solo generan warnings, no detienen el inicio
