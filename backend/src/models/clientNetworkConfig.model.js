// backend/src/models/clientNetworkConfig.model.js (29/5/25 → ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientNetworkConfig = sequelize.define('ClientNetworkConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    mikrotikRouterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MikrotikRouters',
        key: 'id'
      }
    },
    pppoeUsername: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pppoePasswordEncrypted: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'VALIDACIÓN: Solo usuarios con permisos pueden ver'
    },
    staticIp: {
      type: DataTypes.STRING
    },
    macAddress: {
      type: DataTypes.STRING
    },
    gateway: {
      type: DataTypes.STRING
    },
    dnsPrimary: {
      type: DataTypes.STRING
    },
    dnsSecondary: {
      type: DataTypes.STRING
    },
    protocol: {
      type: DataTypes.ENUM('pppoe', 'static', 'dhcp'),
      defaultValue: 'pppoe'
    },
    additionalConfig: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    lastSync: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'ClientNetworkConfigs',
    timestamps: true
  });

  return ClientNetworkConfig;
};