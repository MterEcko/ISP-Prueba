const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemAlert = sequelize.define('SystemAlert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    installationId: {
      type: DataTypes.UUID,
      references: { model: 'Installations', key: 'id' }
    },
    alertType: {
      type: DataTypes.ENUM('license_expiring', 'license_expired', 'offline', 'suspicious_activity', 'high_resource_usage', 'error'),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    title: DataTypes.STRING,
    message: DataTypes.TEXT,
    data: DataTypes.JSONB,
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolvedAt: DataTypes.DATE
  }, {
    tableName: 'SystemAlerts',
    timestamps: true
  });

  SystemAlert.associate = (models) => {
    SystemAlert.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return SystemAlert;
};
