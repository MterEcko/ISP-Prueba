// backend/src/models/commandHistory.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const CommandHistory = sequelize.define('CommandHistory', {
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
      }
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    command: {
      type: Sequelize.STRING,
      allowNull: false
    },
    parameters: {
      type: Sequelize.JSON,
      defaultValue: {}
    },
    result: {
      type: Sequelize.JSON,
      allowNull: true
    },
    error: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    success: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    executionTime: {
      type: Sequelize.FLOAT, // Tiempo de ejecución en milisegundos
      allowNull: true
    },
    connectionType: {
      type: Sequelize.ENUM('ssh', 'snmp', 'api', 'telnet', 'other'),
      allowNull: true
    },
    ipAddress: {
      type: Sequelize.STRING,
      allowNull: true
    },
    severity: {
      type: Sequelize.ENUM('info', 'warning', 'error', 'critical'),
      defaultValue: 'info'
    },
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'CommandHistories',
    timestamps: true
  });

  return CommandHistory;
};
