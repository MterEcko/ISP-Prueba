'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_networks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Clients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deviceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      pppoeUserId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pppoeUsername: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pppoeProfile: {
        type: Sequelize.STRING,
        allowNull: true
      },
      qosRuleId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      downloadSpeed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      uploadSpeed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      burstEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      staticIp: {
        type: Sequelize.STRING,
        allowNull: true
      },
      macAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      protocol: {
        type: Sequelize.ENUM('pppoe', 'static', 'dhcp'),
        defaultValue: 'pppoe'
      },
      lastCheck: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('online', 'offline', 'warning', 'unknown'),
        defaultValue: 'unknown'
      },
      lastTrafficIn: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      lastTrafficOut: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    
    // Opcional: Índices para mejorar el rendimiento
    await queryInterface.addIndex('client_networks', ['clientId']);
    await queryInterface.addIndex('client_networks', ['deviceId']);
    await queryInterface.addIndex('client_networks', ['pppoeUsername']);
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_networks');
  }
};