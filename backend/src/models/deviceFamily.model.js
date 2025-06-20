// backend/src/models/deviceFamily.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DeviceFamily = sequelize.define('DeviceFamily', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    brandId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'DeviceBrands',
        key: 'id'
      }
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'DeviceFamilies',
    timestamps: true
  });

  return DeviceFamily;
};
