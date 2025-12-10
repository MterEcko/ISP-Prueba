// backend/src/models/deviceMetric.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DeviceMetric = sequelize.define('DeviceMetric', {
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
    // Métricas de sistema
    cpuUsage: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    memoryUsage: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    diskUsage: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    uptime: {
      type: Sequelize.BIGINT, // Uptime en segundos
      allowNull: true
    },

    // Métricas de red
    interfaceTraffic: {
      type: Sequelize.JSON,
      defaultValue: {}
    },
    connectionQuality: {
      type: Sequelize.JSON,
      defaultValue: {}
    },

    // Métricas específicas de tecnología
    technologySpecificMetrics: {
      type: Sequelize.JSON,
      defaultValue: {}
    },

    // Para dispositivos de fibra
    opticalMetrics: {
      type: Sequelize.JSON,
      defaultValue: {}
    },

    // Métricas de rendimiento
    latency: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    packetLoss: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    bandwidth: {
      type: Sequelize.JSON,
      defaultValue: {}
    },

    // Información de recolección
    collectionMethod: {
      type: Sequelize.ENUM('snmp', 'ssh', 'api', 'other'),
      allowNull: false
    },
    recordedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    status: {
      type: Sequelize.ENUM('online', 'offline', 'degraded', 'unknown'),
      defaultValue: 'unknown'
    },
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'DeviceMetrics',
    timestamps: true
  });

  return DeviceMetric;
};
