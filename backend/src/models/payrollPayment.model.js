const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PayrollPayment = sequelize.define('PayrollPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payrollId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'payrolls',
      key: 'id'
    },
    comment: 'Nómina asociada'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Monto pagado'
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha del pago'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'transfer', 'check'),
    allowNull: false,
    comment: 'Método de pago'
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Referencia del pago'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas del pago'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario que registró el pago'
  }
}, {
  tableName: 'payroll_payments',
  timestamps: true,
  indexes: [
    {
      fields: ['payrollId']
    },
    {
      fields: ['paymentDate']
    },
    {
      fields: ['paymentMethod']
    }
  ]
});

module.exports = PayrollPayment;
