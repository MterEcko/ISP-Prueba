// Script para inicializar la base de datos de la Store
const db = require('../src/models');
const logger = require('../src/config/logger');
const pluginsData = require('../../frontend/src/config/plugin-marketplace.json');

async function initDatabase() {
  try {
    logger.info('🔄 Iniciando sincronización de base de datos...');

    // Sincronizar modelos (crear tablas si no existen)
    await db.sequelize.sync({ force: false });

    logger.info('✅ Base de datos sincronizada correctamente');

    // Verificar si ya existen plugins
    const existingPlugins = await db.Plugin.count();

    if (existingPlugins > 0) {
      logger.info(`📦 Ya existen ${existingPlugins} plugins en la base de datos`);
      logger.info('💡 Usa "npm run seed:force" para resetear y resembrar');
      return;
    }

    // Sembrar plugins del marketplace
    logger.info('🌱 Sembrando plugins del marketplace...');

    for (const plugin of pluginsData.plugins) {
      await db.Plugin.create({
        name: plugin.name,
        slug: plugin.id,
        version: plugin.version,
        description: plugin.description,
        longDescription: plugin.longDescription,
        author: plugin.author,
        category: plugin.category,
        price: plugin.price,
        isFree: plugin.isFree,
        downloadCount: plugin.downloads || 0,
        rating: plugin.rating || 0,
        features: plugin.features || [],
        requirements: plugin.requirements || {},
        changelog: plugin.changelog || [],
        tags: plugin.tags || [],
        status: 'published'
      });

      logger.info(`  ✓ Plugin creado: ${plugin.name}`);
    }

    logger.info(`🎉 ${pluginsData.plugins.length} plugins sembrados exitosamente`);

  } catch (error) {
    logger.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    await db.sequelize.close();
    logger.info('🔌 Conexión a base de datos cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase()
    .then(() => {
      logger.info('✅ Inicialización completada');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Fallo en inicialización:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;
