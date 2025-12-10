// backend/src/models/ticketType.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketType = sequelize.define('TicketType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Instalación, Reparación, Soporte'
    },
    description: {
      type: DataTypes.TEXT
    },
    category: {
      type: DataTypes.ENUM('installation', 'support', 'maintenance'),
      allowNull: false
    },
    estimatedDurationHours: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    requiresMaterials: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'TicketTypes',
    timestamps: true
  });

  return TicketType;
};
