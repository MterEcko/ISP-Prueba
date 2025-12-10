// backend/src/models/role.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
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
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general'
    }
  }, {
    tableName: 'Roles',
    timestamps: true
  });

  return Role;
};
