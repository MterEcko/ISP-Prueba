// backend/src/utils/auto-migration.js
// Sistema de auto-migración para validar y actualizar esquemas automáticamente

const logger = require('./logger');

class AutoMigration {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.migrations = [];
    this.dialect = sequelize.getDialect(); // postgres, mysql, sqlite, etc.
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
    logger.info(`🔄 Iniciando auto-migraciones (${this.dialect})...`);

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
   * Verificar si una tabla existe (compatible con PostgreSQL y SQLite)
   */
  async tableExists(tableName) {
    if (this.dialect === 'sqlite') {
      const [results] = await this.sequelize.query(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='${tableName}';
      `);
      return results.length > 0;
    } else if (this.dialect === 'postgres') {
      const [results] = await this.sequelize.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${tableName}';
      `);
      return results.length > 0;
    }
    return false;
  }

  /**
   * Verificar si una columna existe en una tabla
   */
  async columnExists(tableName, columnName) {
    try {
      if (this.dialect === 'sqlite') {
        const [results] = await this.sequelize.query(`
          PRAGMA table_info(${tableName});
        `);
        return results.some(col => col.name === columnName);
      } else if (this.dialect === 'postgres') {
        const [results] = await this.sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${tableName}'
            AND column_name = '${columnName}';
        `);
        return results.length > 0;
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  /**
   * Agregar una columna si no existe
   */
  async addColumnIfNotExists(tableName, columnName, columnDefinition) {
    const exists = await this.columnExists(tableName, columnName);

    if (!exists) {
      await this.sequelize.query(`
        ALTER TABLE "${tableName}"
        ADD COLUMN "${columnName}" ${columnDefinition};
      `);
      logger.info(`✅ Columna ${columnName} agregada a ${tableName}`);
      return true;
    }

    return false;
  }

  /**
   * Validar y agregar valores ENUM (solo PostgreSQL)
   */
  async addEnumValue(enumName, newValue) {
    if (this.dialect === 'postgres') {
      try {
        // Verificar si el valor ya existe
        const [results] = await this.sequelize.query(`
          SELECT enumlabel FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumName}')
          AND enumlabel = '${newValue}';
        `);

        if (results.length === 0) {
          await this.sequelize.query(`
            ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${newValue}';
          `);
          logger.info(`✅ Valor '${newValue}' agregado al enum ${enumName}`);
        }
      } catch (error) {
        // Ignorar si el valor ya existe
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    } else {
      // SQLite no tiene ENUMs nativos, se valida a nivel de aplicación
      logger.info(`✅ Valor ENUM '${newValue}' validado para ${enumName} (SQLite)`);
    }
    return true;
  }
}

/**
 * Migraciones predefinidas del sistema
 */
function registerSystemMigrations(autoMigration) {
  // Migración 1: Validar enum de Payment.paymentMethod
  autoMigration.register('payment-method-enum-validation', async (sequelize) => {
    const dialect = sequelize.getDialect();
    const newPaymentMethods = ['online', 'mercadopago', 'openpay', 'paypal', 'stripe'];

    logger.info('Validando métodos de pago de plugins...');

    if (dialect === 'postgres') {
      for (const method of newPaymentMethods) {
        await autoMigration.addEnumValue('enum_Payments_paymentMethod', method);
      }
    } else {
      // SQLite: los ENUMs se validan a nivel de modelo
      logger.info(`✅ Métodos de pago validados (SQLite): ${newPaymentMethods.join(', ')}`);
    }

    return true;
  });

  // Migración 2: Verificar columnas de SystemLicense
  autoMigration.register('system-license-columns', async (sequelize) => {
    const requiredColumns = [
      { name: 'hardwareId', definition: 'VARCHAR(64)' },
      { name: 'userLimit', definition: 'INTEGER DEFAULT 5' },
      { name: 'pluginLimit', definition: 'INTEGER DEFAULT 3' },
      { name: 'includedPlugins', definition: 'JSON' },
      { name: 'activatedAt', definition: 'TIMESTAMP' },
      { name: 'lastValidated', definition: 'TIMESTAMP' }
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

  // Migración 4: Permitir NULL en Payments.gatewayId y paymentReference
  autoMigration.register('payments-nullable-gateway', async (sequelize) => {
    const dialect = sequelize.getDialect();
    const tableExists = await autoMigration.tableExists('Payments');

    if (tableExists && dialect === 'postgres') {
      try {
        // Hacer gatewayId nullable
        await sequelize.query(`
          ALTER TABLE "Payments"
          ALTER COLUMN "gatewayId" DROP NOT NULL;
        `);
        logger.info('✅ Columna gatewayId ahora permite NULL');
      } catch (error) {
        // Ya es nullable o no existe
        logger.warn(`gatewayId: ${error.message}`);
      }

      try {
        // Hacer paymentReference nullable
        await sequelize.query(`
          ALTER TABLE "Payments"
          ALTER COLUMN "paymentReference" DROP NOT NULL;
        `);
        logger.info('✅ Columna paymentReference ahora permite NULL');
      } catch (error) {
        // Ya es nullable o no existe
        logger.warn(`paymentReference: ${error.message}`);
      }
    }

    return true;
  });

  // Migración 5: Agregar configuración de suspensión a ServicePackages
  autoMigration.register('service-package-suspension-config', async (sequelize) => {
    const dialect = sequelize.getDialect();
    const tableExists = await autoMigration.tableExists('ServicePackages');

    if (tableExists) {
      // Crear enum para suspensionAction si no existe
      if (dialect === 'postgres') {
        try {
          await sequelize.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ServicePackages_suspensionAction') THEN
                CREATE TYPE "enum_ServicePackages_suspensionAction" AS ENUM('disable', 'move_pool');
              END IF;
            END$$;
          `);
          logger.info('✅ Enum suspensionAction creado o ya existe');
        } catch (error) {
          logger.warn(`Enum suspensionAction: ${error.message}`);
        }
      }

      // Agregar columnas
      await autoMigration.addColumnIfNotExists(
        'ServicePackages',
        'suspensionAction',
        dialect === 'postgres'
          ? '"enum_ServicePackages_suspensionAction" DEFAULT \'disable\''
          : 'VARCHAR(20) DEFAULT \'disable\''
      );

      // Eliminar suspendedPoolName si existe (migración antigua)
      try {
        const poolNameExists = await autoMigration.columnExists('ServicePackages', 'suspendedPoolName');
        if (poolNameExists) {
          await sequelize.query('ALTER TABLE "ServicePackages" DROP COLUMN "suspendedPoolName";');
          logger.info('✅ Columna suspendedPoolName eliminada');
        }
      } catch (error) {
        logger.warn(`suspendedPoolName: ${error.message}`);
      }

      // Agregar suspendedPoolId (ID inmutable del pool)
      await autoMigration.addColumnIfNotExists(
        'ServicePackages',
        'suspendedPoolId',
        'VARCHAR(255)'
      );
    }

    return true;
  });

  // Migración 6: Agregar originalPoolName a ClientBilling para restaurar pool al reactivar
  autoMigration.register('client-billing-original-pool', async (sequelize) => {
    const tableExists = await autoMigration.tableExists('ClientBilling');

    if (tableExists) {
      await autoMigration.addColumnIfNotExists(
        'ClientBilling',
        'originalPoolName',
        'VARCHAR(255)'
      );
    }

    return true;
  });

  // Migración 7: Crear tabla EmployeeConfigs para configuración de empleados (salario diario)
  autoMigration.register('employee-config-table', async (sequelize) => {
    const dialect = sequelize.getDialect();
    const tableExists = await autoMigration.tableExists('EmployeeConfigs');

    if (!tableExists) {
      // Crear enum para defaultPaymentType si no existe
      if (dialect === 'postgres') {
        try {
          await sequelize.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_EmployeeConfigs_defaultPaymentType') THEN
                CREATE TYPE "enum_EmployeeConfigs_defaultPaymentType" AS ENUM('weekly', 'biweekly', 'quincenal', 'catorcenal', 'monthly', 'cada10dias');
              END IF;
            END$$;
          `);
          logger.info('✅ Enum defaultPaymentType creado');
        } catch (error) {
          logger.warn(`Enum defaultPaymentType: ${error.message}`);
        }
      }

      // Crear tabla
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "EmployeeConfigs" (
          "id" SERIAL PRIMARY KEY,
          "employeeId" INTEGER NOT NULL UNIQUE REFERENCES "Users"("id") ON DELETE CASCADE,
          "dailySalary" DECIMAL(10, 2) NOT NULL,
          "defaultPaymentType" ${dialect === 'postgres' ? '"enum_EmployeeConfigs_defaultPaymentType"' : 'VARCHAR(20)'} DEFAULT 'monthly',
          "position" VARCHAR(100),
          "department" VARCHAR(100),
          "hireDate" DATE,
          "active" BOOLEAN DEFAULT true,
          "notes" TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info('✅ Tabla EmployeeConfigs creada');
    }

    return true;
  });

  // Migración 8: Agregar 'router' al enum de planType en SystemLicenses
  autoMigration.register('system-license-router-plan', async (sequelize) => {
    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      try {
        // Verificar si el valor 'router' ya existe en el enum
        const [results] = await sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_SystemLicenses_planType'
            )
            AND enumlabel = 'router'
          ) as exists;
        `);

        if (!results[0].exists) {
          // Agregar 'router' al enum existente
          await sequelize.query(`
            ALTER TYPE "enum_SystemLicenses_planType" ADD VALUE IF NOT EXISTS 'router';
          `);
          logger.info('✅ Valor "router" agregado al enum planType');
        } else {
          logger.info('ℹ️  Valor "router" ya existe en enum planType');
        }
      } catch (error) {
        logger.warn(`Enum planType router: ${error.message}`);
      }
    }

    return true;
  });
}

module.exports = {
  AutoMigration,
  registerSystemMigrations
};
