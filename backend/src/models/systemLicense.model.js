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
    planType: {
      type: DataTypes.ENUM('freemium', 'basic', 'premium', 'enterprise'),
      allowNull: false
    },
    clientLimit: {
      type: DataTypes.INTEGER,
      comment: '50 para freemium, null para ilimitado'
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
      defaultValue: {}
    }
  }, {
    tableName: 'SystemLicenses',
    timestamps: true
  });

  return SystemLicense;
};
