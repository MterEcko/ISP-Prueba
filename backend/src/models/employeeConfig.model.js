// backend/src/models/employeeConfig.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeConfig = sequelize.define('EmployeeConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Empleado configurado'
    },
    dailySalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Salario diario del empleado'
    },
    defaultPaymentType: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'quincenal', 'catorcenal', 'monthly', 'cada10dias'),
      defaultValue: 'monthly',
      comment: 'Tipo de pago por defecto (puede ser sobrescrito en cada nómina)'
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Puesto del empleado'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Departamento del empleado'
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha de contratación'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el empleado está activo'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el empleado'
    }
  }, {
    tableName: 'EmployeeConfigs',
    timestamps: true,
    indexes: [
      {
        fields: ['employeeId']
      },
      {
        fields: ['active']
      }
    ]
  });

  return EmployeeConfig;
};
