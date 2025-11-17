const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fromCurrencyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'currencies',
      key: 'id'
    },
    comment: 'Moneda origen (generalmente USD como base)'
  },
  toCurrencyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'currencies',
      key: 'id'
    },
    comment: 'Moneda destino'
  },
  rate: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false,
    comment: 'Tasa de cambio (cuántas unidades de toCurrency por 1 unidad de fromCurrency)'
  },
  rateDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha de la tasa de cambio'
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Fuente de la tasa de cambio (API, manual, banco, etc.)'
  },
  isManual: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si la tasa fue ingresada manualmente o automáticamente'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas sobre esta tasa de cambio'
  }
}, {
  tableName: 'exchange_rates',
  timestamps: true,
  indexes: [
    {
      fields: ['fromCurrencyId', 'toCurrencyId', 'rateDate']
    },
    {
      fields: ['rateDate']
    },
    {
      unique: true,
      fields: ['fromCurrencyId', 'toCurrencyId', 'rateDate']
    }
  ]
});

module.exports = ExchangeRate;
