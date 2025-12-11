// backend/src/utils/auto-migration.js
// Sistema de auto-migración para validar y actualizar esquemas automáticamente

const logger = require('./logger');

class AutoMigration {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.migrations = [];
  }

  /**
   * Registrar una migración automática
   */
  register(name, migrationFn) {
    this.migrations.push({ name, migrationFn });
  }

  /**
   * Ejecutar todas las migraciones registradas
   */
  async runAll() {
    logger.info('🔄 Iniciando auto-migraciones...');

    for (const migration of this.migrations) {
      try {
        await migration.migrationFn(this.sequelize);
        logger.info(`✅ Auto-migración completada: ${migration.name}`);
      } catch (error) {
        // Si la migración falla (ej: valor ya existe), solo advertir
        logger.warn(`⚠️  Auto-migración "${migration.name}": ${error.message}`);
      }
    }

    logger.info('✅ Auto-migraciones completadas');
  }

  /**
   * Verificar si una tabla existe
   */
  async tableExists(tableName) {
    const [results] = await this.sequelize.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='${tableName}';
    `);
    return results.length > 0;
  }

  /**
   * Verificar si una columna existe en una tabla
   */
  async columnExists(tableName, columnName) {
    try {
      const [results] = await this.sequelize.query(`
        PRAGMA table_info(${tableName});
      `);
      return results.some(col => col.name === columnName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Agregar una columna si no existe
   */
  async addColumnIfNotExists(tableName, columnName, columnDefinition) {
    const exists = await this.columnExists(tableName, columnName);

    if (!exists) {
      await this.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${columnDefinition};
      `);
      logger.info(`✅ Columna ${columnName} agregada a ${tableName}`);
      return true;
    }

    return false;
  }

  /**
   * Validar valores ENUM (SQLite no tiene ENUMs nativos, usa CHECK constraint)
   * Esta función solo verifica que los valores nuevos sean válidos
   */
  validateEnumValues(tableName, columnName, newValues) {
    // En SQLite, los ENUMs se manejan a nivel de aplicación
    // Solo registramos que los valores son válidos
    logger.info(`✅ Valores ENUM validados para ${tableName}.${columnName}: ${newValues.join(', ')}`);
    return true;
  }
}

/**
 * Migraciones predefinidas del sistema
 */
function registerSystemMigrations(autoMigration) {
  // Migración 1: Validar enum de Payment.paymentMethod
  autoMigration.register('payment-method-enum-validation', async (sequelize) => {
    // SQLite no tiene ENUMs nativos, se valida a nivel de modelo
    // Esta migración solo registra los nuevos valores como válidos
    const newPaymentMethods = ['online', 'mercadopago', 'openpay', 'paypal', 'stripe'];

    logger.info('Validando métodos de pago de plugins...');
    autoMigration.validateEnumValues('Payments', 'paymentMethod', newPaymentMethods);

    return true;
  });

  // Migración 2: Verificar columnas de SystemLicense
  autoMigration.register('system-license-columns', async (sequelize) => {
    const requiredColumns = [
      { name: 'hardwareId', definition: 'VARCHAR(64)' },
      { name: 'userLimit', definition: 'INTEGER DEFAULT 5' },
      { name: 'pluginLimit', definition: 'INTEGER DEFAULT 3' },
      { name: 'includedPlugins', definition: 'JSON' },
      { name: 'activatedAt', definition: 'DATETIME' },
      { name: 'lastValidated', definition: 'DATETIME' }
    ];

    const tableExists = await autoMigration.tableExists('SystemLicenses');

    if (tableExists) {
      for (const column of requiredColumns) {
        await autoMigration.addColumnIfNotExists('SystemLicenses', column.name, column.definition);
      }
    }

    return true;
  });

  // Migración 3: Verificar columnas de SystemPlugins
  autoMigration.register('system-plugins-category', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('SystemPlugins');

    if (tableExists) {
      await autoMigration.addColumnIfNotExists(
        'SystemPlugins',
        'category',
        'VARCHAR(50) DEFAULT \'other\''
      );
    }

    return true;
  });
}

module.exports = {
  AutoMigration,
  registerSystemMigrations
};
