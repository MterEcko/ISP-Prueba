// ===================================
// MIGRACIÓN: Crear configuraciones SNMP y SSH
// ===================================

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Configuraciones SNMP por dispositivo
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
    });

    // Configuraciones SSH por dispositivo
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
    });

    // Actualizar tabla Devices con referencias a marcas/familias
    await queryInterface.addColumn('Devices', 'brandId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'DeviceBrands',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Devices', 'familyId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'DeviceFamilies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Devices', 'systemType', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'RouterOS, UniFi, Pharos, etc.'
    });

    await queryInterface.addColumn('Devices', 'firmwareVersion', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Devices', 'capabilities', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON con capacidades del dispositivo'
    });

    await queryInterface.addColumn('Devices', 'lastSync', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Última sincronización de datos'
    });

    // Mejorar DeviceMetrics
    await queryInterface.addColumn('DeviceMetrics', 'collectionMethod', {
      type: Sequelize.ENUM('snmp', 'ssh', 'api'),
      allowNull: false,
      defaultValue: 'snmp'
    });

    await queryInterface.addColumn('DeviceMetrics', 'interfaces', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON con datos de interfaces'
    });

    await queryInterface.addColumn('DeviceMetrics', 'wireless', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON con datos wireless'
    });

    await queryInterface.addColumn('DeviceMetrics', 'storage', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON con datos de almacenamiento'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DeviceMetrics', 'storage');
    await queryInterface.removeColumn('DeviceMetrics', 'wireless');
    await queryInterface.removeColumn('DeviceMetrics', 'interfaces');
    await queryInterface.removeColumn('DeviceMetrics', 'collectionMethod');
    
    await queryInterface.removeColumn('Devices', 'lastSync');
    await queryInterface.removeColumn('Devices', 'capabilities');
    await queryInterface.removeColumn('Devices', 'firmwareVersion');
    await queryInterface.removeColumn('Devices', 'systemType');
    await queryInterface.removeColumn('Devices', 'familyId');
    await queryInterface.removeColumn('Devices', 'brandId');
    
    await queryInterface.dropTable('SshConfigs');
    await queryInterface.dropTable('SnmpConfigs');
  }
};