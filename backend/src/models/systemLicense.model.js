// backend/src/models/systemLicense.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemLicense = sequelize.define('SystemLicense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    licenseKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    hardwareId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'ID único del hardware donde está instalada la licencia'
    },
    planType: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    clientLimit: {
      type: DataTypes.INTEGER,
      comment: 'Límite de clientes (-1 para ilimitado)'
    },
    userLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: 'Límite de usuarios del sistema'
    },
    pluginLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Límite de plugins activos (-1 para ilimitado)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    expiresAt: {
      type: DataTypes.DATEONLY
    },
    featuresEnabled: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Características habilitadas: { billing: true, inventory: true, ... }'
    },
    includedPlugins: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de plugins incluidos en el plan'
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de activación de la licencia'
    },
    lastValidated: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última validación con el servidor'
    }
  }, {
    tableName: 'SystemLicenses',
    timestamps: true,
    underscored: false  // Usar camelCase en la base de datos
  });

  return SystemLicense;
};
