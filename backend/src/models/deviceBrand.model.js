// backend/src/models/deviceBrand.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DeviceBrand = sequelize.define('DeviceBrand', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'DeviceBrands',
    timestamps: true
  });

  return DeviceBrand;
};

