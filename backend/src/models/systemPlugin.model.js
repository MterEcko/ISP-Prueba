// backend/src/models/systemPlugin.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemPlugin = sequelize.define('SystemPlugin', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      //allowNull: false
      //comment: 'jellyfin, fiber, googlePay, voip'
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    installedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    pluginTables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de tablas que crea este plugin'
    },
    pluginRoutes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de rutas que agrega este plugin'
    }
  }, {
    tableName: 'SystemPlugins',
    timestamps: true
  });

  return SystemPlugin;
};
