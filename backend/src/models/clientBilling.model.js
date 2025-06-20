// backend/src/models/clientBilling.model.js (29/5/25 → ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientBilling = sequelize.define('ClientBilling', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    servicePackageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'servicePackages',
        key: 'id'
      }
    },
    currentIpPoolId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'IpPools',
        key: 'id'
      },
      comment: 'Pool actual del cliente'
    },
    clientStatus: {
      type: DataTypes.ENUM('active', 'suspended', 'cutService', 'pending'),
      defaultValue: 'pending'
    },
    billingDay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 31
      },
      comment: '1-31'
    },
    lastPaymentDate: {
      type: DataTypes.DATEONLY
    },
    nextDueDate: {
      type: DataTypes.DATEONLY
    },
    monthlyFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'transfer', 'card'),
      defaultValue: 'cash'
    },
    graceDays: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      comment: 'Días de gracia antes del corte'
    },
    penaltyFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Multa por pago tardío'
    }
  }, {
    tableName: 'ClientBilling',
    timestamps: true
  });

  return ClientBilling;
};