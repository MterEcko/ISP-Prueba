// backend/src/models/device.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Device = sequelize.define("Device", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('router', 'switch', 'antenna', 'cpe', 'sector', 'fiberOnt', 'fiberOlt', 'other'),
      allowNull: false
    },
    brand: {
      type: Sequelize.ENUM('mikrotik', 'ubiquiti', 'cambium', 'tplink', 'mimosa', 'huawei', 'zte', 'other'),
      allowNull: false
    },
    familyId: {
  	  type: Sequelize.INTEGER,
        references: {
        model: 'DeviceFamilies',
        key: 'id'
        }
    },
    model: {
      type: Sequelize.STRING
    },
    ipAddress: {
      type: Sequelize.STRING
    },
    macAddress: {
      type: Sequelize.STRING
    },
    serialNumber: {
      type: Sequelize.STRING
    },
    
    // Ubicación física/lógica
    nodeId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'Nodes',
        key: 'id'
      }
    },
    clientId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    
    // Configuración técnica
    firmwareVersion: {
      type: Sequelize.STRING
    },
    isFiberDevice: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    
    // Estado y monitoreo
    status: {
      type: Sequelize.ENUM('online', 'offline', 'maintenance', 'unknown'),
      defaultValue: 'unknown'
    },
    lastSeen: {
      type: Sequelize.DATE
    },
    location: {
      type: Sequelize.STRING
    },
    latitude: {
      type: Sequelize.FLOAT
    },
    longitude: {
      type: Sequelize.FLOAT
    },
    notes: {
      type: Sequelize.TEXT
    },
    
    // Datos técnicos adicionales
    connectionParams: {
      type: Sequelize.JSON,
      defaultValue: {}
    },
    monitoringData: {
      type: Sequelize.JSON,
      defaultValue: {}
    },
    specificConfig: {
      type: Sequelize.JSON,
      defaultValue: {}
    },
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'Devices',
    timestamps: true
  });

  return Device;
};