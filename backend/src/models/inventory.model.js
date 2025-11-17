// backend/src/models/inventory.model.js - VERSIÓN ACTUALIZADA

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // ==========================================
    // CAMPOS EXISTENTES (mantener todos)
    // ==========================================
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    serialNumber: {
      type: DataTypes.STRING(255),
      unique: false,
      allowNull: true
    },
    macAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isMacAddress(value) {
          if (value && !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/i.test(value)) {
            throw new Error('Formato de dirección MAC inválido');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM(
        'available',
        'inUse',
        'defective',
        'inRepair',
        'retired',
        'installed',      // ← NUEVO
        'missing',        // ← NUEVO
        'pending_register', // ← NUEVO
        'returned'        // ← NUEVO
      ),
      defaultValue: 'available'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Cantidad para items no serializados'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    warrantyUntil: {
      type: DataTypes.DATEONLY,
      comment: 'Fecha de vencimiento de garantía'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    locationId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'InventoryLocations',
        key: 'id'
      }
    },
    clientId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },

    // ==========================================
    // CAMPOS NUEVOS - Tracking y Catálogo
    // ==========================================
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryBatches',
        key: 'id'
      },
      comment: 'Lote de compra al que pertenece'
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'InventoryProducts',
        key: 'id'
      },
      comment: 'Producto del catálogo'
    },
    inventoryCategory: {
      type: DataTypes.ENUM('equipment', 'bulk', 'assigned_bulk', 'consumed'),
      defaultValue: 'equipment',
      comment: 'equipment=equipos con serial, bulk=stock almacén, assigned_bulk=dado a técnico, consumed=usado'
    },
    assignedToTechnicianId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Técnico al que está asignado el material'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de asignación a técnico'
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de instalación en cliente'
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de devolución al almacén'
    },
    missingReportedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de reporte como perdido'
    },
    reconciliationStatus: {
      type: DataTypes.ENUM('pending', 'reconciled', 'discrepancy'),
      defaultValue: 'pending',
      comment: 'Estado de reconciliación del item'
    },

    // ==========================================
    // CAMPOS NUEVOS - Consumibles Empaquetados
    // ==========================================
    packages: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Número de paquetes/bolsas (ej: 30 bolsas de grapas)'
    },
    unitsPerPackage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Unidades por paquete (ej: 100 grapas por bolsa)'
    },
    unitType: {
      type: DataTypes.ENUM('piece', 'meters', 'grams', 'box', 'liters', 'kilograms'),
      defaultValue: 'piece',
      comment: 'Tipo de unidad de medida'
    },
    parentInventoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Inventory',
        key: 'id'
      },
      comment: 'Item padre del que se originó (para splits de bobinas/cables)'
    }
  }, {
    tableName: 'Inventory',
    timestamps: true,
    hooks: {
      beforeUpdate: async (item, options) => {
        // Si se marca como instalado, registrar fecha
        if (item.changed('status') && item.status === 'installed' && !item.installedAt) {
          item.installedAt = new Date();
        }
        
        // Si se marca como perdido, registrar fecha
        if (item.changed('status') && item.status === 'missing' && !item.missingReportedAt) {
          item.missingReportedAt = new Date();
        }
        
        // Si se devuelve, registrar fecha
        if (item.changed('status') && item.status === 'returned' && !item.returnedAt) {
          item.returnedAt = new Date();
        }
      }
    }
  });

  return Inventory;
};