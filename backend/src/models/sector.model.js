const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sector = sequelize.define('Sector', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    frequency: {
      type: DataTypes.STRING
    },
    azimuth: {
      type: DataTypes.INTEGER
    },
    polarization: {
      type: DataTypes.STRING
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  return Sector;
};