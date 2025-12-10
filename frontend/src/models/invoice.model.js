// backend/src/models/invoice.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Subscriptions',
        key: 'id'
      }
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    billingPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    billingPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
      defaultValue: 'pending'
    },
    invoiceData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos del cliente al momento de facturar'
    }
  }, {
    tableName: 'Invoices',
    timestamps: true,
    hooks: {
      // Hook para corte automático por falta de pago
      afterUpdate: async (invoice, options) => {
        if (invoice.changed('status')) {
          const subscription = await invoice.getSubscription();
          
          if (invoice.status === 'overdue' && subscription.status === 'active') {
            // Cambiar a corte por falta de pago
            await subscription.update({ 
              status: 'cutService',
              lastStatusChange: new Date()
            });
            console.log(`Servicio cortado por mora: Cliente ${subscription.clientId}`);
          }
          
          if (invoice.status === 'paid' && subscription.status === 'cutService') {
            // Reactivar servicio
            await subscription.update({ 
              status: 'active',
              lastPaymentDate: new Date(),
              lastStatusChange: new Date()
            });
            console.log(`Servicio reactivado por pago: Cliente ${subscription.clientId}`);
          }
        }
      }
    }
  });

  return Invoice;
};