// backend/src/models/inventoryLocation.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const InventoryLocation = sequelize.define('InventoryLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    type: {
      type: DataTypes.ENUM(
        'warehouse',     // Almacén
        'vehicle',       // Vehículo técnico
        'clientSite',    // Sitio cliente
        'repairShop',    // Taller reparación
        'other'          // Otro
      ),
      defaultValue: 'warehouse'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    parentId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'InventoryLocations',
        key: 'id'
      }
    }
  }, {
    tableName: 'InventoryLocations',
    timestamps: true
  });

  return InventoryLocation;
};
