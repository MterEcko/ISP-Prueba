// backend/src/models/servicePackage.model.js - CORE WISP PURO
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServicePackage  = sequelize.define('ServicePackage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Básico 10MB, Premium 20MB'
    },
    description: {
      type: DataTypes.TEXT
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    downloadSpeedMbps: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploadSpeedMbps: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dataLimitGb: {
      type: DataTypes.INTEGER,
      comment: 'NULL para ilimitado'
    },
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'weekly'),
      defaultValue: 'monthly'
    },
    zoneId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Zones',
        key: 'id'
      },
      comment: 'Paquetes específicos por zona'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // ✅ Soporte para plugins de servicio adicionales
    includedPlugins: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Configuración de plugins incluidos: { jellyfin: { maxDevices: 2, quality: "HD" }, ... }'
    }
    // ❌ REMOVIDO: hasJellyfin, jellyfinProfileId (van a plugin)
  }, {
    tableName: 'ServicePackages',
    timestamps: true
  });

  return ServicePackage;
};