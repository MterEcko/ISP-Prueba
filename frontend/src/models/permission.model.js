// backend/src/models/permission.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {

  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  return Permission;
};