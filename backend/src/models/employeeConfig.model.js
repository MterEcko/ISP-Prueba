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
      }
    },
    dailySalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    defaultPaymentType: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'quincenal', 'catorcenal', 'monthly', 'cada10dias'),
      defaultValue: 'monthly'
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
