// backend/src/models/mikrotikProfile.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MikrotikProfile = sequelize.define('MikrotikProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mikrotikRouterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MikrotikRouters',
        key: 'id'
      },
      comment: 'ID del router registrado en nuestra base de datos'
    },
    servicePackageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ServicePackages',
        key: 'id'
      }
    },
    profileId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID interno del perfil en RouterOS (ej: *1, *2, *3) - INMUTABLE'
    },
    profileName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre actual del perfil en RouterOS (puede cambiar) - SINCRONIZABLE'
    },
    rateLimit: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '10M/2M'
    },
    burstLimit: {
      type: DataTypes.STRING
    },
    burstThreshold: {
      type: DataTypes.STRING
    },
    burstTime: {
      type: DataTypes.STRING
    },
    priority: {
      type: DataTypes.STRING
    },
    additionalSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastSync: {
      type: DataTypes.DATE,
      comment: 'Última sincronización con RouterOS para actualizar nombre/configuración'
    }
  }, {
    tableName: 'MikrotikProfiles',
    timestamps: true,
    indexes: [
      {
        // Índice único: un router no puede tener el mismo profileId duplicado
        unique: true,
        fields: ['mikrotikRouterId', 'profileId'],
        name: 'unique_router_profile_id'
      },
      {
        // Índice para búsquedas por servicePackage
        fields: ['servicePackageId']
      },
      {
        // Índice para sincronización
        fields: ['lastSync']
      }
    ]
  });

  return MikrotikProfile;
};