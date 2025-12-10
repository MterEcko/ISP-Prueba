// backend/src/models/inventoryMovement.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const InventoryMovement = sequelize.define('InventoryMovement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    inventoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Inventory',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'in',           // Entrada
        'out',          // Salida
        'transfer',     // Transferencia
        'adjustment',   // Ajuste
        'maintenance'   // Mantenimiento
      ),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    movementDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fromLocationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryLocations',
        key: 'id'
      }
    },
    toLocationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryLocations',
        key: 'id'
      }
    },
    movedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'InventoryMovements',
    timestamps: true
  });

  return InventoryMovement;
};
