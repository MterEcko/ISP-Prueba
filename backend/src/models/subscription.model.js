const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATEONLY
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled'),
      defaultValue: 'active'
    },
    ipAddress: {
      type: DataTypes.STRING
    },
    username: {
      type: DataTypes.STRING
    },
    notes: {
      type: DataTypes.TEXT
    }
  });

  return Subscription;
};