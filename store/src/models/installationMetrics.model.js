const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InstallationMetrics = sequelize.define('InstallationMetrics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    installationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Installations', key: 'id' }
    },
    cpuUsage: DataTypes.DECIMAL(5, 2),
    memoryUsage: DataTypes.DECIMAL(5, 2),
    memoryTotal: DataTypes.BIGINT,
    memoryUsed: DataTypes.BIGINT,
    diskUsage: DataTypes.DECIMAL(5, 2),
    diskTotal: DataTypes.BIGINT,
    diskUsed: DataTypes.BIGINT,
    networkUpload: DataTypes.BIGINT,
    networkDownload: DataTypes.BIGINT,
    activeConnections: DataTypes.INTEGER,
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'InstallationMetrics',
    timestamps: false,
    indexes: [
      { fields: ['installationId'] },
      { fields: ['timestamp'] }
    ]
  });

  InstallationMetrics.associate = (models) => {
    InstallationMetrics.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return InstallationMetrics;
};
