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
      type: DataTypes.JSONB,
      defaultValue: []
    },
    requirements: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    screenshots: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    changelog: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'deprecated'),
      defaultValue: 'published'
    },
    metadata: {
      type: DataTypes.JSONB,
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
  };

  return Plugin;
};
