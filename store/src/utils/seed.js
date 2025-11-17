// Seed Script - Poblar base de datos con datos iniciales
require('dotenv').config();
const db = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');
const pluginObfuscator = require('./pluginObfuscator');

// Generar clave de licencia
function generateLicenseKey() {
  return crypto.randomBytes(32).toString('hex').toUpperCase().match(/.{1,8}/g).join('-');
}

async function seed() {
  try {
    logger.info('🌱 Iniciando seed de base de datos...');

    // Sincronizar base de datos (crear tablas)
    await db.sequelize.sync({ force: true });
    logger.info('✅ Base de datos sincronizada');

    // 1. Crear licencias de ejemplo
    logger.info('📝 Creando licencias...');

    // Licencia Maestra
    const masterLicense = await db.License.create({
      licenseKey: '7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F',
      planType: 'master',
      clientLimit: null,
      userLimit: null,
      branchLimit: null,
      featuresEnabled: {
        unlimited_clients: true,
        unlimited_users: true,
        unlimited_plugins: true,
        plugin_marketplace: true,
        advanced_inventory: true,
        advanced_billing: true,
        advanced_reports: true,
        api_access: true,
        white_label: true,
        priority_support: true,
        custom_integrations: true,
        multi_branch: true,
        advanced_security: true,
        backup_restore: true,
        audit_logs: true
      },
      status: 'active',
      isMasterLicense: true,
      issuedAt: new Date(),
      expiresAt: null,
      price: 0
    });
    logger.info(`✅ Licencia Maestra creada: ${masterLicense.licenseKey}`);

    // Licencias de prueba
    const licenses = [
      {
        planType: 'basic',
        clientLimit: 50,
        userLimit: 5,
        branchLimit: 1,
        price: 29.99,
        featuresEnabled: {
          plugin_marketplace: true,
          advanced_billing: true,
          backup_restore: true
        }
      },
      {
        planType: 'premium',
        clientLimit: 200,
        userLimit: 15,
        branchLimit: 3,
        price: 79.99,
        featuresEnabled: {
          plugin_marketplace: true,
          advanced_inventory: true,
          advanced_billing: true,
          advanced_reports: true,
          api_access: true,
          priority_support: true,
          multi_branch: true,
          advanced_security: true,
          backup_restore: true,
          audit_logs: true
        }
      },
      {
        planType: 'enterprise',
        clientLimit: null,
        userLimit: null,
        branchLimit: null,
        price: 299.99,
        featuresEnabled: {
          unlimited_clients: true,
          unlimited_users: true,
          unlimited_plugins: true,
          plugin_marketplace: true,
          advanced_inventory: true,
          advanced_billing: true,
          advanced_reports: true,
          api_access: true,
          white_label: true,
          priority_support: true,
          custom_integrations: true,
          multi_branch: true,
          advanced_security: true,
          backup_restore: true,
          audit_logs: true
        }
      }
    ];

    for (const licenseData of licenses) {
      const license = await db.License.create({
        licenseKey: generateLicenseKey(),
        ...licenseData,
        status: 'pending',
        issuedAt: new Date()
      });
      logger.info(`✅ Licencia ${license.planType} creada: ${license.licenseKey}`);
    }

    // 2. Procesar y crear plugins
    logger.info('🧩 Procesando plugins...');

    try {
      const processedPlugins = await pluginObfuscator.processAllPlugins();

      for (const pluginData of processedPlugins) {
        const plugin = await db.Plugin.create({
          name: pluginData.manifest.name,
          slug: pluginData.slug,
          version: pluginData.manifest.version,
          description: pluginData.manifest.description,
          longDescription: pluginData.manifest.longDescription,
          author: pluginData.manifest.author,
          category: pluginData.manifest.category,
          price: pluginData.manifest.price,
          isFree: pluginData.manifest.isFree,
          filePath: pluginData.filePath,
          fileSize: pluginData.fileSize,
          fileHash: pluginData.fileHash,
          downloadCount: Math.floor(Math.random() * 10000),
          rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
          ratingCount: Math.floor(Math.random() * 500),
          features: pluginData.manifest.features,
          requirements: pluginData.manifest.requirements,
          screenshots: pluginData.manifest.screenshots || [],
          changelog: pluginData.manifest.changelog || [],
          tags: pluginData.manifest.tags || [],
          status: 'published',
          metadata: pluginData.manifest.configuration || {}
        });

        logger.info(`✅ Plugin creado: ${plugin.name} v${plugin.version}`);
      }
    } catch (error) {
      logger.warn('⚠️ No se pudieron procesar plugins:', error.message);
      logger.info('Creando plugins de ejemplo sin archivos...');

      // Crear plugins de ejemplo sin archivos
      const examplePlugins = [
        {
          name: 'MercadoPago Payment Gateway',
          slug: 'mercadopago-payment-gateway',
          version: '2.1.5',
          description: 'Integración con MercadoPago',
          category: 'payment',
          price: 0,
          isFree: true
        },
        {
          name: 'PayPal Payment Gateway',
          slug: 'paypal-payment-gateway',
          version: '1.6.3',
          description: 'Integración con PayPal',
          category: 'payment',
          price: 0,
          isFree: true
        },
        {
          name: 'VoIP Linphone (Free)',
          slug: 'voip-linphone-free',
          version: '3.0.0',
          description: 'Sistema VoIP gratuito',
          category: 'communication',
          price: 0,
          isFree: true
        },
        {
          name: 'WhatsApp Business Notifications',
          slug: 'whatsapp-business-notifications',
          version: '3.2.0',
          description: 'Notificaciones por WhatsApp',
          category: 'communication',
          price: 29.99,
          isFree: false
        },
        {
          name: 'Telegram Bot Notifications',
          slug: 'telegram-bot-notifications',
          version: '2.4.1',
          description: 'Bot de Telegram',
          category: 'communication',
          price: 0,
          isFree: true
        },
        {
          name: 'Discord Bot Notifications',
          slug: 'discord-bot-notifications',
          version: '1.8.0',
          description: 'Bot de Discord',
          category: 'communication',
          price: 0,
          isFree: true
        }
      ];

      for (const pluginData of examplePlugins) {
        await db.Plugin.create({
          ...pluginData,
          downloadCount: Math.floor(Math.random() * 10000),
          rating: (Math.random() * 2 + 3).toFixed(1),
          ratingCount: Math.floor(Math.random() * 500),
          status: 'published'
        });
        logger.info(`✅ Plugin de ejemplo creado: ${pluginData.name}`);
      }
    }

    // 3. Crear instalación de ejemplo
    logger.info('💻 Creando instalación de ejemplo...');

    const installation = await db.Installation.create({
      installationKey: crypto.randomBytes(16).toString('hex').toUpperCase(),
      companyName: 'ISP Demo Company',
      contactEmail: 'demo@ispdemo.com',
      contactPhone: '+52 1234567890',
      hardwareId: crypto.randomBytes(16).toString('hex').toUpperCase(),
      systemInfo: {
        platform: 'linux',
        arch: 'x64',
        nodeVersion: 'v16.0.0'
      },
      softwareVersion: '1.0.0',
      status: 'active',
      lastHeartbeat: new Date(),
      isOnline: true,
      currentLatitude: 19.4326,
      currentLongitude: -99.1332,
      currentCountry: 'MX',
      currentCity: 'Ciudad de México',
      totalClients: 25,
      totalUsers: 3
    });

    logger.info(`✅ Instalación creada: ${installation.installationKey}`);

    // 4. Asignar licencia master a instalación
    installation.currentLicenseId = masterLicense.id;
    await installation.save();

    masterLicense.installationId = installation.id;
    masterLicense.boundToHardwareId = installation.hardwareId;
    masterLicense.status = 'active';
    masterLicense.activatedAt = new Date();
    await masterLicense.save();

    logger.info('✅ Licencia maestra asignada a instalación');

    // 5. Crear datos de telemetría de ejemplo
    logger.info('📊 Creando datos de telemetría...');

    for (let i = 0; i < 10; i++) {
      await db.TelemetryData.create({
        installationId: installation.id,
        eventType: ['heartbeat', 'action', 'error'][Math.floor(Math.random() * 3)],
        data: {
          message: 'Evento de ejemplo',
          timestamp: new Date(Date.now() - i * 3600000)
        },
        timestamp: new Date(Date.now() - i * 3600000)
      });

      await db.InstallationMetrics.create({
        installationId: installation.id,
        cpuUsage: (Math.random() * 100).toFixed(2),
        memoryUsage: (Math.random() * 100).toFixed(2),
        memoryTotal: 8589934592,
        memoryUsed: Math.floor(Math.random() * 8589934592),
        diskUsage: (Math.random() * 100).toFixed(2),
        diskTotal: 1099511627776,
        diskUsed: Math.floor(Math.random() * 1099511627776),
        timestamp: new Date(Date.now() - i * 3600000)
      });
    }

    logger.info('✅ Datos de telemetría creados');

    // Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ SEED COMPLETADO CON ÉXITO');
    logger.info('='.repeat(60));

    const licenseCount = await db.License.count();
    const pluginCount = await db.Plugin.count();
    const installationCount = await db.Installation.count();

    logger.info(`📊 Licencias creadas: ${licenseCount}`);
    logger.info(`🧩 Plugins creados: ${pluginCount}`);
    logger.info(`💻 Instalaciones creadas: ${installationCount}`);
    logger.info('\n🔑 Licencia Maestra:');
    logger.info(`   Clave: ${masterLicense.licenseKey}`);
    logger.info(`   Installation Key: ${installation.installationKey}`);
    logger.info('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
seed();
