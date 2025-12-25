// ISP-Prueba Store Server
// Servidor de Licencias, Marketplace y Telemetría
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./src/config/logger');
const db = require('./src/models');
const cron = require('node-cron');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ==================== SEEDER FUNCTIONS ====================

/**
 * Crea los paquetes de servicio por default si no existen
 */
async function createDefaultPackages() {
  const { ServicePackage } = db;

  const defaultPackages = [
    {
      name: 'Basic',
      slug: 'basic',
      description: 'Plan básico para pequeños ISPs',
      longDescription: 'Ideal para ISPs que están comenzando. Incluye funcionalidades esenciales para gestionar clientes y servicios.',
      price: 29.99,
      currency: 'USD',
      clientLimit: 100,
      userLimit: 3,
      branchLimit: 1,
      features: [
        'Gestión de clientes',
        'Control de pagos',
        'Reportes básicos',
        'Soporte por email'
      ],
      featuresEnabled: {
        clientManagement: true,
        billing: true,
        reports: true,
        support: 'email'
      },
      billingCycle: 'monthly',
      status: 'active',
      displayOrder: 1
    },
    {
      name: 'Premium',
      slug: 'premium',
      description: 'Plan avanzado para ISPs en crecimiento',
      longDescription: 'Para ISPs en expansión. Incluye todas las características del plan básico más herramientas avanzadas de gestión y soporte prioritario.',
      price: 79.99,
      currency: 'USD',
      clientLimit: 500,
      userLimit: 10,
      branchLimit: 3,
      features: [
        'Todo lo del plan Basic',
        'Gestión multi-sucursal',
        'Reportes avanzados',
        'Integración con MikroTik',
        'Soporte prioritario 24/7',
        'API completa'
      ],
      featuresEnabled: {
        clientManagement: true,
        billing: true,
        reports: true,
        multiBranch: true,
        mikrotikIntegration: true,
        api: true,
        support: 'priority'
      },
      billingCycle: 'monthly',
      status: 'active',
      displayOrder: 2
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Plan empresarial sin límites',
      longDescription: 'Para grandes ISPs y empresas. Clientes, usuarios y sucursales ilimitados. Soporte dedicado y personalización completa.',
      price: 199.99,
      currency: 'USD',
      clientLimit: null, // ilimitado
      userLimit: null, // ilimitado
      branchLimit: null, // ilimitado
      features: [
        'Todo lo del plan Premium',
        'Clientes ilimitados',
        'Usuarios ilimitados',
        'Sucursales ilimitadas',
        'Personalización completa',
        'Soporte dedicado',
        'Implementación asistida',
        'Capacitación incluida'
      ],
      featuresEnabled: {
        clientManagement: true,
        billing: true,
        reports: true,
        multiBranch: true,
        mikrotikIntegration: true,
        api: true,
        customization: true,
        dedicatedSupport: true,
        training: true,
        support: 'dedicated'
      },
      billingCycle: 'monthly',
      status: 'active',
      displayOrder: 3
    }
  ];

  try {
    for (const packageData of defaultPackages) {
      const [pkg, created] = await ServicePackage.findOrCreate({
        where: { slug: packageData.slug },
        defaults: packageData
      });

      if (created) {
        logger.info(`📦 Paquete creado: ${packageData.name} (${packageData.slug})`);
      }
    }

    logger.info('✅ Paquetes de servicio verificados/creados');
  } catch (error) {
    logger.error('❌ Error creando paquetes por default:', error);
  }
}

// ==================== MIDDLEWARE ====================

// Security headers: Configuración personalizada para permitir 'scripts' en línea
// Esto resuelve el error "Executing inline script violates..."
app.use(helmet({
    // Deshabilita la cabecera X-Content-Type-Options si causa problemas con estáticos
    // xContentTypeOptions: false,
    
    // Configuración detallada de CSP:
    contentSecurityPolicy: {
        directives: {
            // Fuentes permitidas para SCRIPTS: 'self', scripts en línea, unpkg.com y Cloudflare
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Permite <script>...</script> en el HTML
                "https://unpkg.com", // Permite cargar leaflet.js
                "https://static.cloudflareinsights.com" // Permite Cloudflare Analytics
            ], 
            
            // Fuentes permitidas para ESTILOS: 'self', estilos en línea, y unpkg.com
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", // Permite estilos en línea
                "https://unpkg.com" // *** SOLUCIÓN 2: Permite cargar leaflet.css ***
            ],
            
            // Si usas imágenes de Leaflet o de otros lados:
            imgSrc: ["'self'", "data:", "https://unpkg.com", "https://tile.openstreetmap.org"],

            // Permitir peticiones AJAX/fetch a estos destinos
            connectSrc: [
                "'self'",
                "https://store.serviciosqbit.net",
                "http://store.serviciosqbit.net",
                "https://isp.serviciosqbit.net",
                "http://isp.serviciosqbit.net",
                "https://static.cloudflareinsights.com"
            ],

            // Deshabilitar la directiva script-src-attr
            // Esto es necesario porque algunas versiones de Helmet la configuran como 'none'
            // y bloquean los onclick, onchange, etc.
            scriptSrcAttr: null, // *** SOLUCIÓN 3: Permite los onclick, onchange, etc. ***
        },
    },
}));

// Compression
app.use(compression());

// CORS - Configuración permisiva para desarrollo
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://store.serviciosqbit.net',
  'http://store.serviciosqbit.net',
  'https://isp.serviciosqbit.net',
  'http://isp.serviciosqbit.net'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (ej: Postman, curl, mismo servidor)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // En desarrollo, permitir cualquier origin de localhost o IP local
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/https?:\/\/10\.\d+\.\d+\.\d+/)) {
        return callback(null, true);
      }
    }

    // Permitir dominios de serviciosqbit.net (producción)
    if (origin.includes('serviciosqbit.net')) {
      return callback(null, true);
    }

    console.warn(`⚠️ CORS bloqueó petición desde: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-access-token'],
  exposedHeaders: ['x-access-token']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy - Solo confiar en proxies conocidos (nginx, cloudflare, etc)
// Configuración segura para express-rate-limit
if (process.env.TRUST_PROXY === 'true') {
  // En producción, especifica IPs o cantidad de proxies confiables
  app.set('trust proxy', 1); // Solo confía en el primer proxy
} else {
  // En desarrollo sin proxy, deshabilitar
  app.set('trust proxy', false);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
  // Deshabilitar validaciones estrictas en desarrollo
  validate: {
    trustProxy: false, // No validar trust proxy en desarrollo
    xForwardedForHeader: false
  }
});
app.use('/api/', limiter);

// Static files (para servir plugins descargables)
app.use('/downloads', express.static(path.join(__dirname, 'uploads/plugins')));
app.use('/store/plugins', express.static(path.join(__dirname, 'plugins')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/licenses', require('./src/routes/license.routes'));
app.use('/api/installations', require('./src/routes/installation.routes'));
app.use('/api/plugins', require('./src/routes/plugin.routes'));
app.use('/api/marketplace', require('./src/routes/plugin.routes')); // Marketplace es un alias
app.use('/api/telemetry', require('./src/routes/telemetry.routes'));
app.use('/api/remote-control', require('./src/routes/remoteControl.routes'));
app.use('/api/analytics', require('./src/routes/analytics.routes'));

// Nuevas rutas de Store API para integración con ISP backend
app.use('/api/licenses', require('./src/routes/licenseStore.routes'));
app.use('/api/companies', require('./src/routes/company.routes'));
app.use('/api/cloudflare', require('./src/routes/cloudflare.routes'));

// Rutas de gestión de clientes y paquetes
app.use('/api/customers', require('./src/routes/customer.routes'));
app.use('/api/service-packages', require('./src/routes/servicePackage.routes'));

// Dashboard web de administración
app.use('/dashboard', require('./src/routes/dashboard.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.url
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== CRON JOBS ====================

// Verificar licencias expiradas cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  logger.info('Ejecutando verificación de licencias expiradas...');
  try {
    const { checkExpiredLicenses } = require('./src/services/license.service');
    await checkExpiredLicenses();
  } catch (error) {
    logger.error('Error en cron de licencias:', error);
  }
});

// Limpiar datos de telemetría antiguos cada día
cron.schedule('0 2 * * *', async () => {
  logger.info('Limpiando datos de telemetría antiguos...');
  try {
    const { cleanOldTelemetry } = require('./src/services/telemetry.service');
    await cleanOldTelemetry();
  } catch (error) {
    logger.error('Error en cron de telemetría:', error);
  }
});

// ==================== DATABASE & START ====================

// Sincronizar base de datos e iniciar servidor
db.sequelize.authenticate()
  .then(() => {
    logger.info('✅ Conexión a base de datos establecida');

    // Sincronizar modelos SIN borrar datos existentes
    // force: false = No borra tablas existentes
    // alter: true = Solo en PostgreSQL (SQLite no soporta ALTER TABLE con PRIMARY KEY)
    const dialect = db.sequelize.getDialect();
    const syncOptions = {
      force: false,
      alter: dialect === 'postgres' // Solo modificar estructura en PostgreSQL
    };

    logger.info(`📊 Base de datos: ${dialect.toUpperCase()}`);
    if (syncOptions.alter) {
      logger.info('⚙️  Modo sync: ALTER habilitado (actualizará estructura de tablas)');
    } else {
      logger.info('⚙️  Modo sync: ALTER deshabilitado (solo creará tablas nuevas)');
    }

    return db.sequelize.sync(syncOptions);
  })
  .then(async () => {
    logger.info('✅ Modelos de base de datos sincronizados');

    // Crear paquetes por default si no existen
    await createDefaultPackages();

    // Iniciar servidor
    app.listen(PORT, HOST, () => {
      logger.info('='.repeat(60));
      logger.info('🚀 ISP-Prueba Store Server');
      logger.info('='.repeat(60));
      logger.info(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   Puerto: ${PORT}`);
      logger.info(`   Host: ${HOST}`);
      logger.info(`   URL: http://${HOST}:${PORT}`);
      logger.info(`   Health: http://${HOST}:${PORT}/health`);
      logger.info('='.repeat(60));
      logger.info('📊 Servicios activos:');
      logger.info('   ✓ Gestión de Licencias');
      logger.info('   ✓ Marketplace de Plugins');
      logger.info('   ✓ Sistema de Telemetría');
      logger.info('   ✓ Geolocalización GPS');
      logger.info('   ✓ Control Remoto');
      logger.info('   ✓ Analytics');
      logger.info('='.repeat(60));
    });
  })
  .catch(err => {
    logger.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  });

// Manejo de señales de terminación
process.on('SIGINT', async () => {
  logger.info('⚠️ Recibida señal SIGINT. Cerrando servidor...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('⚠️ Recibida señal SIGTERM. Cerrando servidor...');
  await db.sequelize.close();
  process.exit(0);
});

module.exports = app;
