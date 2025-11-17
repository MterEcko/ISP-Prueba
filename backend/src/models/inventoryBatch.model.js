// backend/src/models/inventoryBatch.model.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryBatch = sequelize.define('InventoryBatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batchNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Número único del lote (auto-generado)'
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de compra'
    },
    supplier: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre del proveedor'
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de factura'
    },
    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de items en el lote'
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Costo total del lote'
    },
    receivedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que recibió el lote'
    },
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryLocations',
        key: 'id'
      },
      comment: 'Ubicación donde se recibió'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Estado del proceso de ingreso'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora de completado'
    }
  }, {
    tableName: 'InventoryBatches',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['batchNumber']
      },
      {
        fields: ['purchaseDate']
      },
      {
        fields: ['status']
      },
      {
        fields: ['supplier']
      }
    ],
hooks: {
  beforeValidate: (batch, options) => {
    if (!batch.batchNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const timestamp = String(date.getTime()).slice(-3);
      
      batch.batchNumber = `BATCH-${year}${month}${day}-${timestamp}`;
    }
  }
}
  });

  return InventoryBatch;
};