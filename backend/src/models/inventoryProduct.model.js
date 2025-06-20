// backend/src/models/inventoryProduct.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryProduct = sequelize.define('InventoryProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    typeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'InventoryTypes',
        key: 'id'
      }
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Ubiquiti, TP-Link, Mikrotik'
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'LiteBeam AC, RB951, Cable UTP'
    },
    partNumber: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2)
    },
    salePrice: {
      type: DataTypes.DECIMAL(10, 2)
    },
    warrantyMonths: {
      type: DataTypes.INTEGER,
      defaultValue: 12
    },
    specifications: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'InventoryProducts',
    timestamps: true,
    underscored: true
  });

  return InventoryProduct;
};