// backend/src/models/commandParameter.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const CommandParameter = sequelize.define('CommandParameter', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    implementationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'CommandImplementations',
        key: 'id'
      }
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('string', 'int', 'bool', 'float', 'json'),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    defaultValue: {
      type: Sequelize.STRING,
      allowNull: true
    },
    required: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    validation: {
      type: Sequelize.STRING,
      allowNull: true // Formato/reglas validación
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'CommandParameters',
    timestamps: true
  });

  return CommandParameter;
};
