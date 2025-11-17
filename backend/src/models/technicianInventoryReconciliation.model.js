// backend/src/models/technicianInventoryReconciliation.model.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TechnicianInventoryReconciliation = sequelize.define('TechnicianInventoryReconciliation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    technicianId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Técnico reconciliado'
    },
    period: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        is: /^\d{4}-\d{2}$/i,
        notEmpty: true
      },
      comment: 'Período en formato YYYY-MM'
    },
    totalAssigned: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Valor total asignado en el período'
    },
    totalInstalled: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Valor total instalado en clientes'
    },
    totalReturned: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Valor total devuelto al almacén'
    },
    totalMissing: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Valor total perdido/no registrado'
    },
    accountabilityRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      comment: 'Porcentaje de material bien registrado'
    },
    reconciliationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de reconciliación'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'discrepancy', 'approved'),
      defaultValue: 'pending',
      comment: 'Estado de la reconciliación'
    },
    discrepancyDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detalles de discrepancias encontradas'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales'
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que creó la reconciliación'
    },
    approvedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que aprobó la reconciliación'
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de aprobación'
    }
  }, {
    tableName: 'TechnicianInventoryReconciliations',
    timestamps: true,
    indexes: [
      {
        fields: ['technicianId']
      },
      {
        fields: ['period']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['technicianId', 'period'],
        name: 'technician_period_unique'
      }
    ],
    hooks: {
      beforeSave: async (reconciliation, options) => {
        // Calcular accountabilityRate automáticamente
        const total = parseFloat(reconciliation.totalAssigned);
        if (total > 0) {
          const accounted = parseFloat(reconciliation.totalInstalled) + parseFloat(reconciliation.totalReturned);
          reconciliation.accountabilityRate = ((accounted / total) * 100).toFixed(2);
        } else {
          reconciliation.accountabilityRate = 100.00;
        }

        // Si hay discrepancias significativas, marcar status
        if (parseFloat(reconciliation.totalMissing) > (total * 0.1)) { // Más del 10% perdido
          reconciliation.status = 'discrepancy';
        }
      }
    }
  });

  return TechnicianInventoryReconciliation;
};