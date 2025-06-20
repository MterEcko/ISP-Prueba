// backend/src/models/mikrotikIp.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MikrotikIp = sequelize.define('MikrotikIp', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ipPoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'IpPools',
        key: 'id'
      }
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Clients',
        key: 'id'
      },
      comment: 'Cliente al que está asignada la IP (NULL si está disponible)'
    },
    mikrotikPPPOEId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'MikrotikPPPOEs',
        key: 'id'
      },
      comment: 'Usuario PPPoE al que está asignada la IP'
    },
    status: {
      type: DataTypes.ENUM('available', 'assigned', 'reserved', 'blocked'),
      defaultValue: 'available'
    },
    mikrotikId: {
      type: DataTypes.STRING,
      comment: 'ID de la entrada en la tabla de IPs del router Mikrotik'
    },
    macAddress: {
      type: DataTypes.STRING,
      comment: 'MAC address del dispositivo que usa la IP'
    },
    hostname: {
      type: DataTypes.STRING
    },
    lastSeen: {
      type: DataTypes.DATE
    },
    comment: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'MikrotikIps',
    timestamps: true
  });

  return MikrotikIp;
};
