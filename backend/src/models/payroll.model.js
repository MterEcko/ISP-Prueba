const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payroll = sequelize.define('Payroll', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Empleado al que se le paga'
    },
    period: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Periodo de pago (ej: 2025-11, 2025-11-Q1)'
    },
    paymentType: {
      type: DataTypes.ENUM('monthly', 'biweekly', 'weekly', 'bonus'),
      allowNull: false,
      defaultValue: 'monthly',
      comment: 'Tipo de pago'
    },
    baseSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Salario base'
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Horas extras'
    },
    overtimeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto de horas extras'
    },
    bonus: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Bonos adicionales'
    },
    // Deducciones
    taxDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Deducción de impuestos (ISR)'
    },
    socialSecurityDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Deducción de seguro social (IMSS)'
    },
    otherDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Otras deducciones'
    },
    deductionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre deducciones'
    },
    // Total
    totalDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total de deducciones'
    },
    netSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Salario neto a pagar'
    },
    // Estado de pago
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Estado de la nómina'
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha de pago'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'transfer', 'check'),
      allowNull: true,
      comment: 'Método de pago'
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Referencia de pago (número de transferencia, etc.)'
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
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que creó la nómina'
    },
    paidBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que registró el pago'
    }
  }, {
    tableName: 'payrolls',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['period']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentDate']
      },
      {
        unique: true,
        fields: ['userId', 'period', 'paymentType']
      }
    ]
  });

  return Payroll;
};
