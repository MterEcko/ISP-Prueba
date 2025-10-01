// backend/src/models/client.model.js - LIMPIO SIN PLUGINS
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    whatsapp: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.FLOAT
    },
    longitude: {
      type: DataTypes.FLOAT
    },
    birthDate: {
      type: DataTypes.DATEONLY
    },
    startDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    
    // Ubicación jerárquica
    zoneId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Zones',
        key: 'id'
      }
    },
    nodeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Nodes',
        key: 'id'
      }
    },
    sectorId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Opcional
      references: {
        model: 'Sectors',
        key: 'id'
      }
    },
    
    // Información del contrato CORE
    contractNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    serviceType: {
      type: DataTypes.ENUM('residential', 'business', 'enterprise'),
      defaultValue: 'residential'
    }
    // ❌ REMOVIDO: jellyfinUserId, jellyfinActive (van a plugin)
  }, {
    tableName: 'Clients',
    timestamps: true
  });

  return Client;
};