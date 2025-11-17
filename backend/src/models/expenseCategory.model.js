const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExpenseCategory = sequelize.define('ExpenseCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Nombre de la categoría (ej: Nómina, Servicios, Renta)'
  },
  type: {
    type: DataTypes.ENUM('fixed', 'variable'),
    allowNull: false,
    defaultValue: 'variable',
    comment: 'Tipo de gasto: fijo o variable'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Emoji o icono para la categoría'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descripción de la categoría'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si la categoría está activa'
  }
}, {
  tableName: 'expense_categories',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = ExpenseCategory;
