'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Función para verificar si una columna existe
      const columnExists = async (tableName, columnName) => {
        try {
          await queryInterface.describeTable(tableName);
          const tableInfo = await queryInterface.sequelize.query(
            `PRAGMA table_info(${tableName})`,
            { transaction, type: Sequelize.QueryTypes.SELECT }
          );
          return tableInfo.some(column => column.name === columnName);
        } catch (error) {
          return false;
        }
      };

      // Función para verificar si una tabla existe
      const tableExists = async (tableName) => {
        try {
          await queryInterface.describeTable(tableName);
          return true;
        } catch (error) {
          return false;
        }
      };

      // ===================================
      // CREAR TABLAS FALTANTES
      // ===================================

      // Crear SnmpConfigs si no existe
      if (!(await tableExists('SnmpConfigs'))) {
        await queryInterface.createTable('SnmpConfigs', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          deviceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Devices',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          version: {
            type: Sequelize.ENUM('v1', 'v2c', 'v3'),
            defaultValue: 'v2c'
          },
          communityString: {
            type: Sequelize.STRING,
            allowNull: true
          },
          securityLevel: {
            type: Sequelize.ENUM('noAuthNoPriv', 'authNoPriv', 'authPriv'),
            allowNull: true
          },
          authProtocol: {
            type: Sequelize.ENUM('MD5', 'SHA'),
            allowNull: true
          },
          authPasswordEncrypted: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          privProtocol: {
            type: Sequelize.ENUM('DES', 'AES'),
            allowNull: true
          },
          privPasswordEncrypted: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          port: {
            type: Sequelize.INTEGER,
            defaultValue: 161
          },
          engineId: {
            type: Sequelize.STRING,
            allowNull: true
          },
          contextName: {
            type: Sequelize.STRING,
            allowNull: true
          },
          active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
          },
          lastSync: {
            type: Sequelize.DATE,
            allowNull: true
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        }, { transaction });
        console.log('✅ Tabla SnmpConfigs creada');
      } else {
        console.log('⚠️ Tabla SnmpConfigs ya existe');
      }

      // Crear SshConfigs si no existe
      if (!(await tableExists('SshConfigs'))) {
        await queryInterface.createTable('SshConfigs', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          deviceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Devices',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          username: {
            type: Sequelize.STRING,
            allowNull: false
          },
          passwordEncrypted: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          keyPath: {
            type: Sequelize.STRING,
            allowNull: true
          },
          passphraseEncrypted: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          port: {
            type: Sequelize.INTEGER,
            defaultValue: 22
          },
          useKeyAuth: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
          },
          active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
          },
          lastAccess: {
            type: Sequelize.DATE,
            allowNull: true
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        }, { transaction });
        console.log('✅ Tabla SshConfigs creada');
      } else {
        console.log('⚠️ Tabla SshConfigs ya existe');
      }

      // ===================================
      // AGREGAR COLUMNAS FALTANTES A DEVICES
      // ===================================

      // Verificar y agregar brandId
      if (!(await columnExists('Devices', 'brandId'))) {
        await queryInterface.addColumn('Devices', 'brandId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'DeviceBrands',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
        console.log('✅ Columna brandId agregada a Devices');
      } else {
        console.log('⚠️ Columna brandId ya existe en Devices');
      }

      // Verificar y agregar familyId
      if (!(await columnExists('Devices', 'familyId'))) {
        await queryInterface.addColumn('Devices', 'familyId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'DeviceFamilies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
        console.log('✅ Columna familyId agregada a Devices');
      } else {
        console.log('⚠️ Columna familyId ya existe en Devices');
      }

      // Verificar y agregar systemType
      if (!(await columnExists('Devices', 'systemType'))) {
        await queryInterface.addColumn('Devices', 'systemType', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'RouterOS, UniFi, Pharos, etc.'
        }, { transaction });
        console.log('✅ Columna systemType agregada a Devices');
      } else {
        console.log('⚠️ Columna systemType ya existe en Devices');
      }

      // Verificar y agregar capabilities
      if (!(await columnExists('Devices', 'capabilities'))) {
        await queryInterface.addColumn('Devices', 'capabilities', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'JSON con capacidades del dispositivo'
        }, { transaction });
        console.log('✅ Columna capabilities agregada a Devices');
      } else {
        console.log('⚠️ Columna capabilities ya existe en Devices');
      }

      // Verificar y agregar lastSync
      if (!(await columnExists('Devices', 'lastSync'))) {
        await queryInterface.addColumn('Devices', 'lastSync', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Última sincronización de datos'
        }, { transaction });
        console.log('✅ Columna lastSync agregada a Devices');
      } else {
        console.log('⚠️ Columna lastSync ya existe en Devices');
      }

      // ===================================
      // MEJORAR DEVICEMETRICS
      // ===================================

      // Verificar y agregar collectionMethod
      if (!(await columnExists('DeviceMetrics', 'collectionMethod'))) {
        await queryInterface.addColumn('DeviceMetrics', 'collectionMethod', {
          type: Sequelize.ENUM('snmp', 'ssh', 'api'),
          allowNull: false,
          defaultValue: 'snmp'
        }, { transaction });
        console.log('✅ Columna collectionMethod agregada a DeviceMetrics');
      } else {
        console.log('⚠️ Columna collectionMethod ya existe en DeviceMetrics');
      }

      // Verificar y agregar interfaces
      if (!(await columnExists('DeviceMetrics', 'interfaces'))) {
        await queryInterface.addColumn('DeviceMetrics', 'interfaces', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'JSON con datos de interfaces'
        }, { transaction });
        console.log('✅ Columna interfaces agregada a DeviceMetrics');
      } else {
        console.log('⚠️ Columna interfaces ya existe en DeviceMetrics');
      }

      // Verificar y agregar wireless
      if (!(await columnExists('DeviceMetrics', 'wireless'))) {
        await queryInterface.addColumn('DeviceMetrics', 'wireless', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'JSON con datos wireless'
        }, { transaction });
        console.log('✅ Columna wireless agregada a DeviceMetrics');
      } else {
        console.log('⚠️ Columna wireless ya existe en DeviceMetrics');
      }

      // Verificar y agregar storage
      if (!(await columnExists('DeviceMetrics', 'storage'))) {
        await queryInterface.addColumn('DeviceMetrics', 'storage', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'JSON con datos de almacenamiento'
        }, { transaction });
        console.log('✅ Columna storage agregada a DeviceMetrics');
      } else {
        console.log('⚠️ Columna storage ya existe en DeviceMetrics');
      }

      await transaction.commit();
      console.log('🎉 Migración completada exitosamente');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en la migración:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remover tablas creadas
      await queryInterface.dropTable('SshConfigs', { transaction });
      await queryInterface.dropTable('SnmpConfigs', { transaction });
      
      // Remover columnas agregadas (solo si existen)
      const columnsToRemove = [
        { table: 'DeviceMetrics', column: 'storage' },
        { table: 'DeviceMetrics', column: 'wireless' },
        { table: 'DeviceMetrics', column: 'interfaces' },
        { table: 'DeviceMetrics', column: 'collectionMethod' },
        { table: 'Devices', column: 'lastSync' },
        { table: 'Devices', column: 'capabilities' },
        { table: 'Devices', column: 'systemType' },
        { table: 'Devices', column: 'familyId' },
        { table: 'Devices', column: 'brandId' }
      ];

      for (const { table, column } of columnsToRemove) {
        try {
          await queryInterface.removeColumn(table, column, { transaction });
        } catch (error) {
          console.log(`Columna ${column} no existe en ${table} o no se pudo remover`);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};