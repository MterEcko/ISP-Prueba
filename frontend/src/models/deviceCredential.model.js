// backend/src/models/deviceCredential.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DeviceCredential = sequelize.define('DeviceCredential', {
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
    connectionType: {
      type: Sequelize.ENUM('ssh', 'snmp', 'api', 'telnet', 'other'),
      allowNull: false
    },
    username: {
      type: Sequelize.STRING,
      allowNull: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: true
    },
    port: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    apiKey: {
      type: Sequelize.STRING,
      allowNull: true
    },
    sshKeyPath: {
      type: Sequelize.STRING,
      allowNull: true
    },
    snmpVersion: {
      type: Sequelize.ENUM('v1', 'v2c', 'v3'),
      defaultValue: 'v2c'
    },
    snmpCommunity: {
      type: Sequelize.STRING,
      allowNull: true
    },
    // Campos adicionales para SNMP v3
    snmpSecurityLevel: {
      type: Sequelize.ENUM('noAuthNoPriv', 'authNoPriv', 'authPriv'),
      defaultValue: 'noAuthNoPriv'
    },
    snmpAuthProtocol: {
      type: Sequelize.ENUM('MD5', 'SHA', 'none'),
      allowNull: true
    },
    snmpAuthKey: {
      type: Sequelize.STRING,
      allowNull: true
    },
    snmpPrivProtocol: {
      type: Sequelize.ENUM('DES', 'AES', 'none'),
      allowNull: true
    },
    snmpPrivKey: {
      type: Sequelize.STRING,
      allowNull: true
    },
    // Campos de seguridad y auditoría
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    lastUsed: {
      type: Sequelize.DATE,
      allowNull: true
    },
    rotationDate: {
      type: Sequelize.DATE,
      allowNull: true
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    // Metadatos adicionales
    additionalConfig: {
      type: Sequelize.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'DeviceCredentials',
    timestamps: true,
    // ✅ AGREGAR: Índice único compuesto
    indexes: [
      {
        unique: true,
        fields: ['deviceId', 'connectionType']
      }
    ]
  });

  return DeviceCredential;
};
