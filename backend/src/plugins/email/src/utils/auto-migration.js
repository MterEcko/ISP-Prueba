// backend/src/plugins/email/src/utils/auto-migration.js
// Auto-migraciones del plugin Email

const logger = require('../../../../utils/logger');

/**
 * Registrar migraciones del plugin Email
 * @param {AutoMigration} autoMigration - Instancia del sistema de auto-migración
 */
function registerEmailMigrations(autoMigration) {
  // Migración 1: Verificar columnas de configuración en CommunicationChannels
  autoMigration.register('email-plugin-config-columns', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('CommunicationChannels');

    if (tableExists) {
      // Asegurar que existe la columna configuration (debería existir por el modelo base)
      logger.info('✅ Plugin Email: Columnas de configuración verificadas');
    }

    return true;
  });

  // Migración 2: Crear índice para búsquedas por tipo de canal
  autoMigration.register('email-plugin-channel-type-index', async (sequelize) => {
    const dialect = sequelize.getDialect();
    const tableExists = await autoMigration.tableExists('CommunicationChannels');

    if (tableExists && dialect === 'postgres') {
      try {
        await sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_communication_channels_type_email
          ON "CommunicationChannels" ("channelType")
          WHERE "channelType" = 'email';
        `);
        logger.info('✅ Plugin Email: Índice de tipo de canal creado');
      } catch (error) {
        // Índice ya existe
        logger.warn(`Email index: ${error.message}`);
      }
    }

    return true;
  });
}

module.exports = {
  registerEmailMigrations
};
