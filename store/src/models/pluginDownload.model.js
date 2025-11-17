const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PluginDownload = sequelize.define('PluginDownload', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    pluginId: {
      type: DataTypes.UUID,
      references: { model: 'Plugins', key: 'id' }
    },
    installationId: {
      type: DataTypes.UUID,
      references: { model: 'Installations', key: 'id' }
    },
    version: DataTypes.STRING,
    downloadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'PluginDownloads',
    timestamps: false
  });

  PluginDownload.associate = (models) => {
    PluginDownload.belongsTo(models.Plugin, { foreignKey: 'pluginId' });
    PluginDownload.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return PluginDownload;
};
