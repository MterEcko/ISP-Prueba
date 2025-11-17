const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InstallationLocation = sequelize.define('InstallationLocation', {
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
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    accuracy: DataTypes.DECIMAL(10, 2),
    altitude: DataTypes.DECIMAL(10, 2),
    country: DataTypes.STRING,
    city: DataTypes.STRING,
    region: DataTypes.STRING,
    ipAddress: DataTypes.INET,
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'InstallationLocations',
    timestamps: false,
    indexes: [
      { fields: ['installationId'] },
      { fields: ['timestamp'] },
      { fields: ['latitude', 'longitude'] }
    ]
  });

  InstallationLocation.associate = (models) => {
    InstallationLocation.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return InstallationLocation;
};
