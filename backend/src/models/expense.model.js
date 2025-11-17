const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'expense_categories',
      key: 'id'
    },
    comment: 'Categoría del gasto'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Monto del gasto en MXN'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Descripción del gasto'
  },
  expenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha del gasto'
  },
  recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si es un gasto recurrente'
  },
  recurringPeriod: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
    allowNull: true,
    comment: 'Periodo de recurrencia'
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Proveedor del gasto'
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Número de factura'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'transfer', 'card', 'check', 'other'),
    allowNull: true,
    defaultValue: 'cash',
    comment: 'Método de pago'
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Referencia de pago'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario que registró el gasto'
  },
  // Para compras de equipos - depreciación
  isAsset: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si es un activo (equipo)'
  },
  depreciationYears: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Años de depreciación del activo'
  },
  assetSerialNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Número de serie del equipo'
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  indexes: [
    {
      fields: ['categoryId']
    },
    {
      fields: ['expenseDate']
    },
    {
      fields: ['recurring']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['isAsset']
    }
  ]
});

module.exports = Expense;
