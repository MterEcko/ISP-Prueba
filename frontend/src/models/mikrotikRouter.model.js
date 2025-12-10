// backend/src/models/mikrotikRouter.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MikrotikRouter = sequelize.define('MikrotikRouter', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Devices',
        key: 'id'
      }
    },
    nodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Nodes',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Router Torre Principal, Router Norte'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordEncrypted: {
      type: DataTypes.STRING,
      allowNull: false
    },
    apiPort: {
      type: DataTypes.INTEGER,
      defaultValue: 8728
    },
    systemIdentity: {
      type: DataTypes.STRING
    },
    routerModel: {
      type: DataTypes.STRING
    },
    routerosVersion: {
      type: DataTypes.STRING
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastSync: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'MikrotikRouters',
    timestamps: true
  });

  return MikrotikRouter;
};