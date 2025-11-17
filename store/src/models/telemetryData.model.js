const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TelemetryData = sequelize.define('TelemetryData', {
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
    eventType: {
      type: DataTypes.STRING,
      comment: 'heartbeat, error, action, etc'
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'TelemetryData',
    timestamps: false,
    indexes: [
      { fields: ['installationId'] },
      { fields: ['eventType'] },
      { fields: ['timestamp'] }
    ]
  });

  TelemetryData.associate = (models) => {
    TelemetryData.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return TelemetryData;
};
