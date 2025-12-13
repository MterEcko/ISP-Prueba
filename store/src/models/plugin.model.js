const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plugin = sequelize.define('Plugin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING,
      unique: true
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    longDescription: {
      type: DataTypes.TEXT
    },
    author: {
      type: DataTypes.STRING
    },
    category: {
      type: DataTypes.ENUM('payment', 'communication', 'integration', 'reporting', 'security', 'productivity', 'marketing', 'analytics', 'automation', 'other'),
      defaultValue: 'other'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    filePath: {
      type: DataTypes.STRING,
      comment: 'Ruta al archivo .zip del plugin'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      comment: 'Tamaño en bytes'
    },
    fileHash: {
      type: DataTypes.STRING,
      comment: 'SHA256 hash para verificación'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    features: {
      type: DataTypes.JSON, // JSON funciona en SQLite y PostgreSQL
      defaultValue: []
    },
    requirements: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    screenshots: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    changelog: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    tags: {
      type: DataTypes.JSON, // Almacenamos array como JSON para compatibilidad con SQLite
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'deprecated'),
      defaultValue: 'published'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'Plugins',
    timestamps: true
  });

  Plugin.associate = (models) => {
    Plugin.hasMany(models.PluginDownload, {
      foreignKey: 'pluginId',
      as: 'downloads'
    });

    // Relación muchos a muchos con ServicePackages
    Plugin.belongsToMany(models.ServicePackage, {
      through: 'PluginPackages',
      foreignKey: 'pluginId',
      otherKey: 'servicePackageId',
      as: 'packages'
    });

    // Relación directa con PluginPackage para acceso a configuración
    Plugin.hasMany(models.PluginPackage, {
      foreignKey: 'pluginId',
      as: 'packageConfigs'
    });
  };

  return Plugin;
};
