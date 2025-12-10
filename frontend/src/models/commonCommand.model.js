// backend/src/models/commonCommand.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const CommonCommand = sequelize.define('CommonCommand', {
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
    category: {
      type: Sequelize.STRING,
      allowNull: false
    },
    requiresConfirmation: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    affectsService: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    permissionLevel: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'CommonCommands',
    timestamps: true
  });

  return CommonCommand;
};
