// backend/src/models/inventory.model.js - VERSIÓN ACTUALIZADA CON SCRAP
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
            throw new Error('Formato de dirección MAC inválido. Use XX:XX:XX:XX:XX:XX');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM(
        'available',    // Disponible
        'inUse',        // En uso
        'defective',    // Defectuoso
        'inRepair',     // En reparación
        'retired'       // Retirado
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
    
    // Relaciones
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
    }
  }, {
    tableName: 'Inventory',
    timestamps: true
  });

  return Inventory;
};
