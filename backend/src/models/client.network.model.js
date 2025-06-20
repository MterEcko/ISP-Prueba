// backend/src/models/client.network.model.js (11/5/25 → ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientNetwork = sequelize.define('ClientNetwork', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Devices',
        key: 'id'
      }
    },
    // Información de PPPoE
    pppoeUserId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pppoeUsername: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pppoeProfile: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Información de QoS
    qosRuleId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    downloadSpeed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    uploadSpeed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    burstEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Información de configuración de red
    staticIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    macAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    protocol: {
      type: DataTypes.ENUM('pppoe', 'static', 'dhcp'),
      defaultValue: 'pppoe'
    },
    // Información de monitoreo
    lastCheck: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'warning', 'unknown'),
      defaultValue: 'unknown'
    },
    lastTrafficIn: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    lastTrafficOut: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'ClientNetworks'
  });

  return ClientNetwork;
};