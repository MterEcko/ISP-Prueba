// Script para sembrar/resetear plugins en la base de datos
const db = require('../src/models');
const logger = require('../src/config/logger');
const pluginsData = require('../../frontend/src/config/plugin-marketplace.json');

async function seedPlugins(force = false) {
  try {
    logger.info('🌱 Iniciando seed de plugins...');

    // Conectar a DB
    await db.sequelize.authenticate();
    logger.info('✅ Conectado a base de datos');

    if (force) {
      logger.warn('⚠️  MODO FORCE: Eliminando todos los plugins existentes...');
      await db.Plugin.destroy({ where: {}, truncate: true });
      logger.info('🗑️  Plugins eliminados');
    }

    // Contar plugins existentes
    const existingCount = await db.Plugin.count();
    logger.info(`📊 Plugins existentes: ${existingCount}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const pluginData of pluginsData.plugins) {
      try {
        // Buscar si ya existe por slug
        const [plugin, wasCreated] = await db.Plugin.findOrCreate({
          where: { slug: pluginData.id },
          defaults: {
            name: pluginData.name,
            slug: pluginData.id,
            version: pluginData.version,
            description: pluginData.description,
            longDescription: pluginData.longDescription || pluginData.description,
            author: pluginData.author,
            category: pluginData.category,
            price: pluginData.price || 0,
            isFree: pluginData.isFree !== undefined ? pluginData.isFree : (pluginData.price === 0),
            downloadCount: pluginData.downloads || 0,
            rating: pluginData.rating || 0,
            features: pluginData.features || [],
            requirements: pluginData.requirements || {},
            changelog: pluginData.changelog || [],
            tags: pluginData.tags || [],
            status: 'published'
          }
        });

        if (wasCreated) {
          created++;
          logger.info(`  ✓ Creado: ${pluginData.name} (v${pluginData.version})`);
        } else {
          // Actualizar si la versión es diferente
          if (plugin.version !== pluginData.version) {
            await plugin.update({
              version: pluginData.version,
              description: pluginData.description,
              longDescription: pluginData.longDescription || pluginData.description,
              price: pluginData.price || 0,
              isFree: pluginData.isFree !== undefined ? pluginData.isFree : (pluginData.price === 0),
              features: pluginData.features || [],
              requirements: pluginData.requirements || {},
              changelog: pluginData.changelog || [],
              tags: pluginData.tags || []
            });
            updated++;
            logger.info(`  ↻ Actualizado: ${pluginData.name} (${plugin.version} → ${pluginData.version})`);
          } else {
            skipped++;
            logger.info(`  ⊘ Ya existe: ${pluginData.name} (v${pluginData.version})`);
          }
        }
      } catch (pluginError) {
        logger.error(`  ✗ Error con plugin ${pluginData.name}:`, pluginError.message);
      }
    }

    // Resumen
    logger.info('\n📊 Resumen del Seed:');
    logger.info(`   ✓ Creados: ${created}`);
    logger.info(`   ↻ Actualizados: ${updated}`);
    logger.info(`   ⊘ Saltados: ${skipped}`);
    logger.info(`   📦 Total en DB: ${await db.Plugin.count()}`);

    logger.info('\n🎉 Seed de plugins completado exitosamente');

  } catch (error) {
    logger.error('❌ Error en seed de plugins:', error);
    throw error;
  } finally {
    await db.sequelize.close();
    logger.info('🔌 Conexión a base de datos cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const force = process.argv.includes('--force');

  seedPlugins(force)
    .then(() => {
      logger.info('✅ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Fallo en seed:', error);
      process.exit(1);
    });
}

module.exports = seedPlugins;
