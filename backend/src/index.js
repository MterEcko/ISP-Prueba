// backend/src/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require("morgan");
const helmet = require('helmet');
const dotenv = require("dotenv");
const configHelper = require('./helpers/configHelper');
const path = require('path');
const websocketService = require('./services/websocket.service');

const { setupTPLinkPermissions } = require("./config/permissions-setup");

dotenv.config();

console.log('=== DEBUG CONFIGURACIÓN ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_DIALECT:', process.env.DB_DIALECT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('============================');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware CORS - Configuración dinámica para múltiples orígenes
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://127.0.0.1:8080',
      'http://10.10.0.121:8080', // Red local
      'https://isp.serviciosqbit.net', // Dominio producción
      'http://isp.serviciosqbit.net',
    ];

    // Agregar orígenes desde variable de entorno si existen
    if (process.env.CORS_ORIGIN) {
      const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      allowedOrigins.push(...envOrigins);
    }

    // Permitir requests sin origin (como Postman, curl, mobile apps)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueó origen: ${origin}`);
      callback(null, true); // En desarrollo, permitir de todos modos
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization', 'Origin', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Configuración de Helmet con CSP personalizado para permitir Store API
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "http://localhost:3001",  // Store API local
        "https://store.serviciosqbit.net",  // Store API producción
        "http://store.serviciosqbit.net",
        "ws://localhost:3000",  // WebSocket local
        "wss://isp.serviciosqbit.net"  // WebSocket producción
      ],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"]
    }
  }
}));

app.use(morgan("dev")); // Logger de peticiones HTTP para desarrollo
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// ==================== SERVIR FRONTEND (SIN NGINX) ====================
// En producción, el backend sirve el frontend buildeado
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
console.log('Frontend path:', frontendPath);

// La ruta '/' sirve automáticamente index.html desde frontendPath

// Base de datos - IMPORTAR LA INSTANCIA CORRECTA
const db = require('./models');

// Función para sincronizar modelos en orden
async function synchronizeDatabase() {
  try {
    console.log('🔄 Sincronizando base de datos...');

    // Usar sequelize.sync() que automáticamente maneja las dependencias
    // Esto evita problemas de orden al crear tablas con foreign keys
    await db.sequelize.sync({
      force: false,  // NO borrar tablas existentes
      alter: false   // NO modificar estructura automáticamente (usar migraciones para eso)
    });

    console.log("Conexión a la base de datos establecida y modelos sincronizados desde src/index.");

    // ==================== MIGRACIÓN: AGREGAR COLUMNAS A SYSTEMPLUGINS ====================
    try {
      console.log('\n=== VERIFICANDO COLUMNAS DE SYSTEMPLUGINS ===');
      const queryInterface = db.sequelize.getQueryInterface();
      const tableDescription = await queryInterface.describeTable('SystemPlugins');

      // Agregar displayName si no existe
      if (!tableDescription.displayName) {
        await queryInterface.addColumn('SystemPlugins', 'displayName', {
          type: db.Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Columna displayName agregada');
      }

      // Agregar description si no existe
      if (!tableDescription.description) {
        await queryInterface.addColumn('SystemPlugins', 'description', {
          type: db.Sequelize.TEXT,
          allowNull: true
        });
        console.log('✅ Columna description agregada');
      }

      // Agregar category si no existe
      if (!tableDescription.category) {
        await queryInterface.addColumn('SystemPlugins', 'category', {
          type: db.Sequelize.STRING,
          allowNull: true,
          defaultValue: 'other'
        });
        console.log('✅ Columna category agregada');

        // Actualizar categorías de plugins existentes
        await db.sequelize.query(`UPDATE "SystemPlugins" SET category = 'payment' WHERE name IN ('mercadopago', 'openpay', 'paypal', 'stripe');`);
        await db.sequelize.query(`UPDATE "SystemPlugins" SET category = 'communication' WHERE name IN ('email', 'telegram', 'whatsapp');`);
        await db.sequelize.query(`UPDATE "SystemPlugins" SET category = 'automation' WHERE name = 'n8n';`);
        await db.sequelize.query(`UPDATE "SystemPlugins" SET category = 'other' WHERE category IS NULL;`);
        console.log('✅ Categorías de plugins actualizadas');
      } else {
        console.log('ℹ️  Columnas ya existen');
      }

      console.log('=== FIN VERIFICACIÓN DE COLUMNAS ===\n');
    } catch (error) {
      console.error('❌ Error verificando columnas de SystemPlugins:', error.message);
    }
    // ==================== FIN MIGRACIÓN ====================

    // ==================== MIGRACIÓN: AGREGAR COLUMNAS A SYSTEMLICENSES ====================
    try {
      console.log('\n=== VERIFICANDO COLUMNAS DE SYSTEMLICENSES ===');
      const queryInterface = db.sequelize.getQueryInterface();

      // Verificar si la tabla existe
      const tables = await queryInterface.showAllTables();
      if (tables.includes('SystemLicenses')) {
        const licenseDescription = await queryInterface.describeTable('SystemLicenses');

        // Agregar hardwareId
        if (!licenseDescription.hardwareId) {
          await queryInterface.addColumn('SystemLicenses', 'hardwareId', {
            type: db.Sequelize.STRING(64),
            allowNull: true
          });
          console.log('✅ Columna hardwareId agregada');
        }

        // Agregar userLimit
        if (!licenseDescription.userLimit) {
          await queryInterface.addColumn('SystemLicenses', 'userLimit', {
            type: db.Sequelize.INTEGER,
            defaultValue: 5
          });
          console.log('✅ Columna userLimit agregada');
        }

        // Agregar pluginLimit
        if (!licenseDescription.pluginLimit) {
          await queryInterface.addColumn('SystemLicenses', 'pluginLimit', {
            type: db.Sequelize.INTEGER,
            defaultValue: 3
          });
          console.log('✅ Columna pluginLimit agregada');
        }

        // Agregar includedPlugins
        if (!licenseDescription.includedPlugins) {
          await queryInterface.addColumn('SystemLicenses', 'includedPlugins', {
            type: db.Sequelize.JSON,
            defaultValue: []
          });
          console.log('✅ Columna includedPlugins agregada');
        }

        // Agregar activatedAt
        if (!licenseDescription.activatedAt) {
          await queryInterface.addColumn('SystemLicenses', 'activatedAt', {
            type: db.Sequelize.DATE,
            allowNull: true
          });
          console.log('✅ Columna activatedAt agregada');
        }

        // Agregar lastValidated
        if (!licenseDescription.lastValidated) {
          await queryInterface.addColumn('SystemLicenses', 'lastValidated', {
            type: db.Sequelize.DATE,
            allowNull: true
          });
          console.log('✅ Columna lastValidated agregada');
        }

        console.log('ℹ️  Todas las columnas de licencias verificadas');
      } else {
        console.log('ℹ️  Tabla SystemLicenses no existe aún');
      }

      console.log('=== FIN VERIFICACIÓN DE LICENCIAS ===\n');
    } catch (error) {
      console.error('❌ Error verificando columnas de SystemLicenses:', error.message);
    }
    // ==================== FIN MIGRACIÓN DE LICENCIAS ====================

    // ==================== AUTO-REGISTRAR PLUGINS DEL FILESYSTEM ====================
    try {
      console.log('\n=== AUTO-REGISTRANDO PLUGINS DEL FILESYSTEM ===');
      const fs = require('fs');
      const path = require('path');
      const pluginsPath = path.join(__dirname, 'plugins');

      if (fs.existsSync(pluginsPath)) {
        const pluginFolders = fs.readdirSync(pluginsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        let registered = 0;
        let alreadyExists = 0;

        for (const pluginName of pluginFolders) {
          try {
            // Verificar si ya existe en BD
            const existingPlugin = await db.SystemPlugin.findOne({
              where: { name: pluginName }
            });

            if (existingPlugin) {
              alreadyExists++;
              continue;
            }

            // Leer manifest.json para obtener información
            const manifestPath = path.join(pluginsPath, pluginName, 'manifest.json');
            let version = '1.0.0';
            let category = 'general';
            let displayName = pluginName;

            if (fs.existsSync(manifestPath)) {
              try {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                version = manifest.version || '1.0.0';
                category = manifest.category || 'general';
                displayName = manifest.displayName || manifest.name || pluginName;
              } catch (error) {
                console.warn(`⚠️  No se pudo leer manifest de ${pluginName}: ${error.message}`);
              }
            }

            // Registrar plugin en BD
            await db.SystemPlugin.create({
              name: pluginName,
              displayName: displayName,
              version: version,
              category: category,
              active: true, // Activar por defecto
              configuration: {},
              pluginTables: [],
              pluginRoutes: []
            });

            registered++;
            console.log(`✅ Plugin auto-registrado: ${pluginName}`);

          } catch (error) {
            console.error(`❌ Error registrando plugin ${pluginName}: ${error.message}`);
          }
        }

        console.log(`📦 Plugins encontrados: ${pluginFolders.length}`);
        console.log(`✅ Nuevos registrados: ${registered}`);
        console.log(`ℹ️  Ya existían: ${alreadyExists}`);
      }
      console.log('=== FIN AUTO-REGISTRO DE PLUGINS ===\n');
    } catch (error) {
      console.error('❌ Error en auto-registro de plugins:', error.message);
    }
    // ==================== FIN AUTO-REGISTRO ====================

    // ==================== CARGAR MODELOS DE PLUGINS ====================
    try {
      console.log('\n=== CARGANDO MODELOS DE PLUGINS ===');
      const pluginModelsService = require('./services/pluginModels.service');

      // Obtener plugins activos
      const activePlugins = await db.SystemPlugin.findAll({ where: { active: true } });
      const activePluginNames = activePlugins.map(p => p.name);

      // Cargar modelos de plugins
      await pluginModelsService.loadPluginModels(db.sequelize, db, activePluginNames);

      // Sincronizar tablas de plugins
      await pluginModelsService.syncPluginModels(db.sequelize, { force: false, alter: false });

      // Mostrar estadísticas
      const stats = pluginModelsService.getStats();
      console.log(`✅ Modelos de plugins cargados: ${stats.totalModels}`);
      console.log('=== FIN CARGA DE MODELOS DE PLUGINS ===\n');
    } catch (error) {
      console.error('❌ Error cargando modelos de plugins:', error.message);
      console.warn('⚠️ El sistema continuará pero las tablas de plugins no estarán disponibles');
    }
    // ==================== FIN CARGA DE MODELOS ====================

    // ==================== AGREGAR ESTE BLOQUE AQUÍ ====================
    try {
      console.log('\n=== INICIALIZANDO SISTEMA DE CONFIGURACIONES ===');
      configHelper.init(db);
      console.log('✅ ConfigHelper inicializado con instancia de DB');

      await configHelper.loadAllConfigs();
      console.log('✅ Configuraciones cargadas en caché');

      // Mostrar configuración de email actual
      const emailConfig = await configHelper.getEmailConfig();
      console.log('📧 Configuración de Email:');
      console.log('   - Host:', emailConfig.host);
      console.log('   - Puerto:', emailConfig.port);
      console.log('   - Secure:', emailConfig.secure);
      console.log('   - Usuario:', emailConfig.auth.user);
      console.log('================================================\n');
    } catch (error) {
      console.error('❌ Error inicializando ConfigHelper:', error);
      console.warn('⚠️ El sistema continuará pero las configuraciones dinámicas no estarán disponibles');
    }
    // ==================== FIN DEL BLOQUE ====================

    await initial(); // Esta línea ya debe existir en tu código
    
  } catch (error) {
    console.error("No se pudo conectar a la base de datos desde src/index:", error);
    process.exit(1);
  }
}

// Sincronizar con la base de datos y arrancar el servidor
synchronizeDatabase().then(() => {
  // Inicializar WebSocket Service
  websocketService.initialize(server);

  // Escuchar en todas las interfaces (0.0.0.0) para permitir acceso desde red local
  const HOST = process.env.HOST || '0.0.0.0';

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor ISP corriendo en http://${HOST}:${PORT}`);
    console.log(`📍 Accesible desde:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Red:   http://TU_IP_LOCAL:${PORT}`);
    console.log(`   - API:   http://localhost:${PORT}/api`);
    console.log(`   - WebSocket: ws://localhost:${PORT}`);
    console.log(`\n🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Base de datos: ${process.env.DB_DIALECT || 'sqlite'}`);
  });
});

// Inicializar sistema de facturación automática
const BillingJob = require('./jobs/billing-job');

// Inicializar sistema de recordatorios automáticos
const remindersService = require('./services/reminders.service');
try {
  remindersService.scheduleAutomaticReminders();
  console.log('✅ Sistema de recordatorios automáticos inicializado');
} catch (error) {
  console.error('❌ Error inicializando recordatorios automáticos:', error.message);
}

// Solo en producción o si quieres probarlo
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BILLING_JOBS === 'true') {
  BillingJob.initializeJobs();
  console.log('✅ Sistema de facturación automática activado');
} else {
  console.log('⚠️ Sistema de facturación en modo manual');
}

// Inicializar sistema de segmentación automática
const { scheduleSegmentationJob } = require('./jobs/segmentation.job');
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SEGMENTATION_JOBS === 'true') {
  scheduleSegmentationJob();
  console.log('✅ Sistema de segmentación automática activado');
} else {
  console.log('⚠️ Sistema de segmentación en modo manual');
}

// Registrar rutas
// IMPORTANTE: El orden de registro de rutas es crítico
// Las rutas más específicas deben registrarse antes que las más generales
// para evitar conflictos de coincidencia de patrones

console.log('\n=== REGISTRANDO RUTAS ===');

// Rutas de autenticación y usuarios
try {
  console.log('Registrando auth.routes...');
  require('./routes/auth.routes')(app);
  console.log('✅ auth.routes registradas');
} catch (error) {
  console.error('❌ Error en auth.routes:', error.message);
}

try {
  console.log('Registrando user.routes...');
  require('./routes/user.routes')(app);
  console.log('✅ user.routes registradas');
} catch (error) {
  console.error('❌ Error en user.routes:', error.message);
}

try {
  console.log('Registrando role.routes...');
  require('./routes/role.routes')(app);
  console.log('✅ role.routes registradas');
} catch (error) {
  console.error('❌ Error en role.routes:', error.message);
}

try {
  console.log('Registrando permission.routes...');
  require('./routes/permission.routes')(app);
  console.log('✅ permission.routes registradas');
} catch (error) {
  console.error('❌ Error en permission.routes:', error.message);
}


try {
  console.log('Registrando backup.routes...');
  require('./routes/backup.routes')(app);
  console.log('✅ backup.routes registradas');
} catch (error) {
  console.error('❌ Error en backup.routes:', error.message);
}

try {
  console.log('Registrando notification.routes...');
  require('./routes/notification.routes')(app);
  console.log('✅ notification.routes registradas');
} catch (error) {
  console.error('❌ Error en notification.routes:', error.message);
}

try {
  console.log('Registrando commandHistory.routes...');
  require('./routes/commandHistory.routes')(app);
  console.log('✅ commandHistory.routes registradas');
} catch (error) {
  console.error('❌ Error en commandHistory.routes:', error.message);
}

try {
  console.log('Registrando commandImplementation.routes...');
  require('./routes/commandImplementation.routes')(app);
  console.log('✅ commandImplementation.routes registradas');
} catch (error) {
  console.error('❌ Error en commandImplementation.routes:', error.message);
}

try {
  console.log('Registrando commonCommand.routes...');
  require('./routes/commonCommand.routes')(app);
  console.log('✅ commonCommand.routes registradas');
} catch (error) {
  console.error('❌ Error en commonCommand.routes:', error.message);
}

// Rutas de sistema y configuración
try {
  console.log('Registrando systemLicense.routes...');
  require('./routes/systemLicense.routes')(app);
  console.log('✅ systemLicense.routes registradas');
} catch (error) {
  console.error('❌ Error en systemLicense.routes:', error.message);
}

try {
  console.log('Registrando systemPlugin.routes...');
  require('./routes/systemPlugin.routes')(app);
  console.log('✅ systemPlugin.routes registradas');
} catch (error) {
  console.error('❌ Error en systemPlugin.routes:', error.message);
}

try {
  console.log('Registrando pluginAudit.routes...');
  require('./routes/pluginAudit.routes')(app);
  console.log('✅ pluginAudit.routes registradas');
} catch (error) {
  console.error('❌ Error en pluginAudit.routes:', error.message);
}

try {
  console.log('Registrando metrics.routes...');
  require('./routes/metrics.routes')(app);
  console.log('✅ metrics.routes registradas');
} catch (error) {
  console.error('❌ Error en metrics.routes:', error.message);
}

try {
  console.log('Registrando reminders.routes...');
  require('./routes/reminders.routes')(app);
  console.log('✅ reminders.routes registradas');
} catch (error) {
  console.error('❌ Error en reminders.routes:', error.message);
}

try {
  console.log('Registrando settings.routes...');
  require('./routes/settings.routes')(app);
  console.log('✅ settings.routes registradas');
} catch (error) {
  console.error('❌ Error en settings.routes:', error.message);
}

// Rutas de red y Mikrotik
// Primero las rutas específicas
try {
  console.log('Registrando client.mikrotik.routes...');
  require('./routes/client.mikrotik.routes')(app);
  console.log('✅ client.mikrotik.routes registradas');
} catch (error) {
  console.error('❌ Error en client.mikrotik.routes:', error.message);
}

try {
  console.log('Registrando ip.pool.routes...');
  require('./routes/ip.pool.routes')(app);
  console.log('✅ ip.pool.routes registradas');
} catch (error) {
  console.error('❌ Error en ip.pool.routes:', error.message);
}

try {
  console.log('Registrando ip.assignment.routes...');
  require('./routes/ip.assignment.routes')(app);
  console.log('✅ ip.assignment.routes registradas');
} catch (error) {
  console.error('❌ Error en ip.assignment.routes:', error.message);
}






// Luego las rutas generales de red
try {
  console.log('Registrando network.routes...');
  require('./routes/network.routes')(app);
  console.log('✅ network.routes registradas');
} catch (error) {
  console.error('❌ Error en network.routes:', error.message);
}

try {
  console.log('Registrando mikrotik.routes...');
  require('./routes/mikrotik.routes')(app);
  console.log('✅ mikrotik.routes registradas');
} catch (error) {
  console.error('❌ Error en mikrotik.routes:', error.message);
}

// Rutas de clientes y servicios
// Primero las rutas específicas
try {
  console.log('Registrando client.billing.routes...');
  require('./routes/client.billing.routes')(app);
  console.log('✅ client.billing.routes registradas');
} catch (error) {
  console.error('❌ Error en client.billing.routes:', error.message);
}

try {
  console.log('Registrando payment.routes...');
  require('./routes/payment.routes')(app);
  console.log('✅ payment.routes registradas');
} catch (error) {
  console.error('❌ Error en payment.routes:', error.message);
}

try {
  console.log('Registrando manual.payment.routes...');
  require('./routes/manual.payment.routes')(app);
  console.log('✅ manual.payment.routes registradas');
} catch (error) {
  console.error('❌ Error en manual.payment.routes:', error.message);
}

try {
  console.log('Registrando billing.routes...');
  require('./routes/billing.routes')(app);
  console.log('✅ billing.routes registradas');
} catch (error) {
  console.error('❌ Error en billing.routes:', error.message);
}

try {
  console.log('Registrando reports.routes...');
  require('./routes/reports.routes')(app);
  console.log('✅ reports.routes registradas');
} catch (error) {
  console.error('❌ Error en reports.routes:', error.message);
}

/*
try {
  console.log('Registrando client-networks.routes...');
  require('./routes/client-network.routes')(app);
  console.log('✅ client-networks.routes registradas');
} catch (error) {
  console.error('❌ Error en client-networks.routes:', error.message);
}
*/
try {
  console.log('Registrando invoice.routes...');
  require('./routes/invoice.routes')(app);
  console.log('✅ invoice.routes registradas');
} catch (error) {
  console.error('❌ Error en invoice.routes:', error.message);
}

try {
  console.log('Registrando subscription.routes...');
  require('./routes/subscription.routes')(app);
  console.log('✅ subscription.routes registradas');
} catch (error) {
  console.error('❌ Error en subscription.routes:', error.message);
}

try {
  console.log('Registrando service.package.routes...');
  require('./routes/service.package.routes')(app);
  console.log('✅ service.package.routes registradas');
} catch (error) {
  console.error('❌ Error en service.package.routes:', error.message);
}

// Luego las rutas generales
try {
  console.log('Registrando client.routes...');
  require('./routes/client.routes')(app);
  console.log('✅ client.routes registradas');
} catch (error) {
  console.error('❌ Error en client.routes:', error.message);
}

try {
  console.log('Registrando clientInstallation.routes...');
  require('./routes/clientInstallation.routes')(app);
  console.log('✅ clientInstallation.routes registradas');
} catch (error) {
  console.error('❌ Error en clientInstallation.routes:', error.message);
}

try {
  console.log('Registrando clientSupport.routes...');
  require('./routes/clientSupport.routes')(app);
  console.log('✅ clientSupport.routes registradas');
} catch (error) {
  console.error('❌ Error en clientSupport.routes:', error.message);
}

try {
  console.log('Registrando documentTemplate.routes...');
  require('./routes/documentTemplate.routes')(app);
  console.log('✅ documentTemplate.routes registradas');
} catch (error) {
  console.error('❌ Error en documentTemplate.routes:', error.message);
}

try {
  console.log('Registrando documentAdvanced.routes...');
  require('./routes/documentAdvanced.routes')(app);
  console.log('✅ documentAdvanced.routes registradas');
} catch (error) {
  console.error('❌ Error en documentAdvanced.routes:', error.message);
}

// Rutas de inventario


try {
  console.log('Registrando inventoryBatch.routes...');
  require("./routes/inventoryBatch.routes")(app);
  console.log('✅ inventoryBatch.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryBatch.routes:', error.message);
}

try {
  console.log('Registrando inventoryCategory.routes...');
  require("./routes/inventoryCategory.routes")(app);
  console.log('✅ inventoryCategory.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryCategory.routes:', error.message);
}

try {
  console.log('Registrando inventoryTechnician.routes...');
  require("./routes/inventoryTechnician.routes")(app);
  console.log('✅ inventoryTechnician.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryTechnician.routes:', error.message);
}

try {
  console.log('Registrando inventoryReconciliation.routes...');
  require("./routes/inventoryReconciliation.routes")(app);
  console.log('✅ inventoryReconciliation.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryReconciliation.routes:', error.message);
}

// Primero las rutas específicas
try {
  console.log('Registrando inventoryLocation.routes...');
  require('./routes/inventoryLocation.routes')(app);
  console.log('✅ inventoryLocation.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryLocation.routes:', error.message);
}

try {
  console.log('Registrando inventoryMovement.routes...');
  require('./routes/inventoryMovement.routes')(app);
  console.log('✅ inventoryMovement.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryMovement.routes:', error.message);
}

try {
  console.log('Registrando inventoryProduct.routes...');
  require('./routes/inventoryProduct.routes')(app);
  console.log('✅ inventoryProduct.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryProduct.routes:', error.message);
}

// Luego las rutas generales
try {
  console.log('Registrando inventory.routes...');
  require('./routes/inventory.routes')(app);
  console.log('✅ inventory.routes registradas');
} catch (error) {
  console.error('❌ Error en inventory.routes:', error.message);
}



// Rutas de tickets y soporte
try {
  console.log('Registrando ticket.routes...');
  require('./routes/ticket.routes')(app);
  console.log('✅ ticket.routes registradas');
} catch (error) {
  console.error('❌ Error en ticket.routes:', error.message);
}

try {
  console.log('Registrando mikrotikRouter.routes...');
  require('./routes/mikrotikRouter.routes')(app);
  console.log('✅ mikrotikRouter.routes registradas');
} catch (error) {
  console.error('❌ Error en mikrotikRouter.routes:', error.message);
}

try {
  console.log('Registrando device.routes...');
  require('./routes/device.routes')(app);
  console.log('✅ device.routes registradas');
} catch (error) {
  console.error('❌ Error en device.routes:', error.message);
}

try {
  console.log('Registrando snmpOid.routes...');
  require('./routes/snmpOid.routes')(app);
  console.log('✅ snmpOid.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en snmpOid.routes:', error.message);
}

try {
  console.log('Registrando deviceMetric.routes...');
  require('./routes/deviceMetric.routes')(app);
  console.log('✅ deviceMetric.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceMetric.routes:', error.message);
}

try {
  console.log('Registrando deviceCommand.routes...');
  require('./routes/deviceCommand.routes')(app);
  console.log('✅ deviceCommand.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceCommand.routes:', error.message);
}

try {
  console.log('Registrando deviceCredential.routes...');
  require('./routes/deviceCredential.routes')(app);
  console.log('✅ deviceCredential.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceCredential.routes:', error.message);
}

try {
  console.log('Registrando deviceFamily.routes...');
  require('./routes/deviceFamily.routes')(app);
  console.log('✅ deviceFamily.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceFamily.routes.routes:', error.message);
}

try {
  console.log('Registrando deviceBrand.routes...');
  require('./routes/deviceBrand.routes')(app);
  console.log('✅ deviceBrand.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceBrand.routes:', error.message);
}

// ==================== NUEVAS RUTAS DE COMUNICACIÓN ====================
try {
  console.log('Registrando communicationPlugin.routes...');
  require('./routes/communicationPlugin.routes')(app);
  console.log('✅ communicationPlugin.routes registradas');
} catch (error) {
  console.error('❌ Error en communicationPlugin.routes:', error.message);
  console.error('Stack completo:', error.stack);
}
try {
  console.log('Registrando template.routes...');
  require('./routes/template.routes')(app);
  console.log('✅ template.routes registradas');
} catch (error) {
  console.error('❌ Error en template.routes:', error.message);
  console.error('Stack completo:', error.stack);
}

// Nuevas rutas para las 6 funcionalidades
try {
  console.log('Registrando calendar.routes...');
  require('./routes/calendar.routes')(app);
  console.log('✅ calendar.routes registradas');
} catch (error) {
  console.error('❌ Error en calendar.routes:', error.message);
}

try {
  console.log('Registrando chat.routes...');
  require('./routes/chat.routes')(app);
  console.log('✅ chat.routes registradas');
} catch (error) {
  console.error('❌ Error en chat.routes:', error.message);
}

try {
  console.log('Registrando storeCustomer.routes...');
  require('./routes/storeCustomer.routes')(app);
  console.log('✅ storeCustomer.routes registradas');
} catch (error) {
  console.error('❌ Error en storeCustomer.routes:', error.message);
}

try {
  console.log('Registrando pluginUpload.routes...');
  require('./routes/pluginUpload.routes')(app);
  console.log('✅ pluginUpload.routes registradas');
} catch (error) {
  console.error('❌ Error en pluginUpload.routes:', error.message);
}

try {
  console.log('Registrando n8n.routes...');
  require('./routes/n8n.routes')(app);
  console.log('✅ n8n.routes registradas');
} catch (error) {
  console.error('❌ Error en n8n.routes:', error.message);
}

try {
  console.log('Registrando setup.routes...');
  require('./routes/setup.routes')(app);
  console.log('✅ setup.routes registradas');
} catch (error) {
  console.error('❌ Error en setup.routes:', error.message);
}

try {
  console.log('Registrando rutas dinamicas de plugins...');
  require('./routes/plugins.dynamic.routes')(app);
  console.log('✅ Rutas dinamicas de plugins registradas');
} catch (error) {
  console.error('❌ Error registrando rutas de plugins:', error.message);
}

// Rutas de correo de empleados
try {
  console.log('Registrando employeeEmail.routes...');
  app.use('/api/employee-emails', require('./routes/employeeEmail.routes'));
  console.log('✅ employeeEmail.routes registradas');
} catch (error) {
  console.error('❌ Error en employeeEmail.routes:', error.message);
}

// Rutas de contabilidad
try {
  console.log('Registrando expense.routes...');
  app.use('/api/expenses', require('./routes/expense.routes'));
  console.log('✅ expense.routes registradas');
} catch (error) {
  console.error('❌ Error en expense.routes:', error.message);
}

try {
  console.log('Registrando payroll.routes...');
  app.use('/api/payroll', require('./routes/payroll.routes'));
  console.log('✅ payroll.routes registradas');
} catch (error) {
  console.error('❌ Error en payroll.routes:', error.message);
}

try {
  console.log('Registrando accounting.routes...');
  app.use('/api/accounting', require('./routes/accounting.routes'));
  console.log('✅ accounting.routes registradas');
} catch (error) {
  console.error('❌ Error en accounting.routes:', error.message);
}

// Rutas de divisas/monedas
try {
  console.log('Registrando currency.routes...');
  app.use('/api/currencies', require('./routes/currency.routes'));
  console.log('✅ currency.routes registradas');
} catch (error) {
  console.error('❌ Error en currency.routes:', error.message);
}

// Rutas del Portal del Cliente
try {
  console.log('Registrando clientPortal.routes...');
  app.use('/api/client-portal', require('./routes/clientPortal.routes'));
  console.log('✅ clientPortal.routes registradas');
} catch (error) {
  console.error('❌ Error en clientPortal.routes:', error.message);
}

console.log('\n=== FIN REGISTRO DE RUTAS ===');
console.log("Todas las rutas han sido procesadas");

// ==================== RUTA CATCH-ALL PARA SPA (Vue Router) ====================
// IMPORTANTE: Esto debe ir DESPUES de todas las rutas de API
// Usar middleware en lugar de app.get('/*') para evitar PathError en Express 5.x
app.use((req, res, next) => {
  // Si la ruta no es de API, uploads o socket.io, servir el index.html del frontend
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sirviendo index.html:', err);
        res.status(500).send('Error al cargar la aplicación');
      }
    });
  } else {
    // Para rutas de API que no existen, pasar al siguiente middleware (404)
    next();
  }
});

// Función para crear datos iniciales mínimos si no existen
async function initial() {
  try {
    // Importar modelos
    const Role = db.Role;
    const Permission = db.Permission;
    const User = db.User;
    
    // Verificar si ya existen roles
    const roleCount = await Role.count();
    if (roleCount === 0) {
      // Crear roles
      await Role.bulkCreate([
        { name: "cliente", description: "Usuario cliente", level: 1, category: "cliente" },
        { name: "tecnico", description: "Técnico de campo", level: 2, category: "tecnico" },
        { name: "admin", description: "Administrador", level: 5, category: "admin" }
      ]);
      console.log("Roles creados");
    }

    // Verificar si ya existen permisos
    const permissionCount = await Permission.count();
    if (permissionCount === 0) {
      // Crear permisos básicos INCLUYENDO INVENTARIO Y COMUNICACIONES
      await Permission.bulkCreate([
        { name: "view_dashboard", description: "Ver dashboard", module: "dashboard" },
        { name: "manage_clients", description: "Gestionar clientes", module: "clients" },
        { name: "view_network", description: "Ver estado de red", module: "network" },
        { name: "manageNetwork", description: "Gestionar red", module: "network" },
        { name: "view_billing", description: "Ver facturación", module: "billing" },
        { name: "manage_billing", description: "Gestionar facturación", module: "billing" },
        { name: "view_tickets", description: "Ver tickets", module: "tickets" },
        { name: "manage_tickets", description: "Gestionar tickets", module: "tickets" },
        { name: "view_inventory", description: "Ver inventario", module: "inventory" },
        { name: "manage_inventory", description: "Gestionar inventario", module: "inventory" },
		{ name: "manage_device", description: "Gestionar dispositivos", module: "device" },
        
        // Nuevos permisos para usuarios y roles
        { name: "view_users", description: "Ver usuarios", module: "users" },
        { name: "manage_users", description: "Gestionar usuarios", module: "users" },
        { name: "view_roles", description: "Ver roles", module: "roles" },
        { name: "manage_roles", description: "Gestionar roles", module: "roles" },
        { name: "manage_permissions", description: "Gestionar permisos", module: "permissions" },
        
        // ==================== NUEVOS PERMISOS DE COMUNICACIÓN ====================
        { name: "manage_communication", description: "Gestionar canales de comunicación", module: "communication" },
        { name: "send_messages", description: "Enviar mensajes individuales", module: "communication" },
        { name: "send_mass_messages", description: "Enviar mensajes masivos", module: "communication" },
        { name: "schedule_messages", description: "Programar mensajes", module: "communication" },
        { name: "send_payment_reminders", description: "Enviar recordatorios de pago", module: "communication" },
        { name: "send_service_notifications", description: "Enviar notificaciones de servicio", module: "communication" },
        { name: "manage_templates", description: "Gestionar plantillas de mensajes", module: "communication" },
        { name: "view_communication_history", description: "Ver historial de comunicaciones", module: "communication" }
      ]);
      console.log("Permisos creados (incluyendo comunicaciones)");
    }

    // Asignar permisos a roles si no se ha hecho
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    if (adminRole) {
      const permissions = await Permission.findAll();
      
      // Verificar si ya existen relaciones entre roles y permisos
      const rolePermissions = await adminRole.getPermissions();
      if (rolePermissions.length === 0) {
        await adminRole.addPermissions(permissions);
        console.log("Permisos asignados al rol de administrador");
      }

      // Verificar si ya existe el usuario administrador
      const adminExists = await User.findOne({ where: { username: "admin" } });
      if (!adminExists) {
        // Crear usuario admin
        await User.create({
          username: "admin",
          email: "admin@example.com",
          password: "admin123", // En producción usar contraseña segura
          fullName: "Administrador",
          roleId: adminRole.id
        });
        console.log("Usuario administrador creado - username: admin, password: admin123");
      }
    }

    // Crear ubicaciones de inventario por defecto
    const InventoryLocation = db.InventoryLocation;
    const locationCount = await InventoryLocation.count();
    if (locationCount === 0) {
      await InventoryLocation.bulkCreate([
        {
          name: "Almacén Principal",
          type: "warehouse",
          description: "Almacén principal de equipos",
          active: true
        },
        {
          name: "Almacén Secundario",
          type: "warehouse", 
          description: "Almacén secundario para equipos de respaldo",
          active: true
        },
        {
          name: "Vehículo Técnico 1",
          type: "vehicle",
          description: "Equipos en vehículo del técnico principal",
          active: true
        },
        {
          name: "Taller de Reparación",
          type: "repairShop",
          description: "Área de reparación de equipos defectuosos",
          active: true
        },
        {
          name: "Cliente",
          type: "clientSite",
          description: "Asignado a cliente",
          active: true
        }
      ]);
      console.log("Ubicaciones de inventario creadas");
    }

    // ==================== CREAR CANALES DE COMUNICACIÓN POR DEFECTO ====================
    
    const CommunicationChannel = db.CommunicationChannel;
    const channelCount = await CommunicationChannel.count();
    
    if (channelCount === 0) {
      await CommunicationChannel.bulkCreate([
        {
          name: "Email Principal",
          channelType: "email",
          active: false, // Inactivo hasta configurar
          configuration: {
            provider: "smtp",
            from: {
              name: "Mi ISP",
              email: "noreply@miisp.com"
            },
            smtp: {
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: "",
                pass: ""
              }
            }
          }
        },
        {
          name: "WhatsApp Business",
          channelType: "whatsapp",
          active: false,
          configuration: {
            provider: "whatsapp-web",
            webhook: {
              url: "",
              secret: ""
            }
          }
        },
        {
          name: "Telegram Bot",
          channelType: "telegram",
          active: false,
          configuration: {
            botToken: "",
            webhook: {
              url: "",
              secret: ""
            }
          }
        },
        {
          name: "SMS Twilio",
          channelType: "sms",
          active: false,
          configuration: {
            provider: "twilio",
            accountSid: "",
            authToken: "",
            fromNumber: ""
          }
        }
      ]);
      console.log("Canales de comunicación por defecto creados");
    }

    // ==================== CREAR PLANTILLAS POR DEFECTO ====================

    const MessageTemplate = db.MessageTemplate;
    const templateCount = await MessageTemplate.count();

    if (templateCount === 0) {
      const emailChannel = await CommunicationChannel.findOne({
        where: { channelType: "email" }
      });

      if (!emailChannel) {
        console.log("No se encontró canal de email, creando plantillas sin canal asociado");
      }

      const channelId = emailChannel ? emailChannel.id : null;

      await MessageTemplate.bulkCreate([
        {
          channelId,
          name: "Recordatorio de Pago",
          templateType: "paymentReminder",
          subject: "Recordatorio de Pago - {firstName}",
          messageBody: `Estimado/a {firstName},

Le recordamos que tiene un pago pendiente:
- Monto: {amount}
- Días de atraso: {daysOverdue}

Por favor realice su pago lo antes posible para evitar suspensión del servicio.

Gracias por su preferencia.`,
          variables: ["firstName", "lastName", "amount", "daysOverdue", "dueDate"],
          active: true
        },
        {
          channelId,
          name: "Bienvenida Nuevo Cliente",
          templateType: "welcome",
          subject: "¡Bienvenido a nuestros servicios!",
          messageBody: `¡Hola {firstName}!

¡Bienvenido/a a nuestra familia de clientes!

Nos complace confirmar que su servicio de internet ha sido activado exitosamente.

Si tiene alguna pregunta, no dude en contactarnos.

¡Gracias por confiar en nosotros!`,
          variables: ["firstName", "lastName"],
          active: true
        },
        {
          channelId,
          name: "Suspensión de Servicio",
          templateType: "suspension",
          subject: "Suspensión de Servicio - {firstName}",
          messageBody: `Estimado/a {firstName},

Lamentamos informarle que su servicio ha sido suspendido por: {reason}

Fecha de suspensión: {suspensionDate}

Para reactivar su servicio, por favor póngase en contacto con nosotros.

Atentamente,
Equipo de Soporte`,
          variables: ["firstName", "reason", "suspensionDate"],
          active: true
        },
        {
          channelId,
          name: "Reactivación de Servicio",
          templateType: "reactivation",
          subject: "¡Servicio Reactivado! - {firstName}",
          messageBody: `¡Estimado/a {firstName}!

Nos complace informarle que su servicio ha sido reactivado exitosamente.

Fecha de reactivación: {reactivationDate}

Gracias por su pago y por continuar confiando en nuestros servicios.

¡Bienvenido/a de vuelta!`,
          variables: ["firstName", "reactivationDate"],
          active: true
        }
      ]);
      console.log("Plantillas de mensaje por defecto creadas");
    }
    
  } catch (error) {
    console.error("Error al crear datos iniciales desde src/index:", error);
  }
  
}

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

module.exports = app;