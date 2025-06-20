// ===================================
// 4. INVENTARIO MEJORADO CON SCRAP
// ===================================

// backend/src/models/inventoryCategory.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryCategory = sequelize.define('InventoryCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Equipos, Consumibles, Herramientas'
    },
    description: {
      type: DataTypes.TEXT
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'InventoryCategories',
    timestamps: true,
    underscored: true
  });

  return InventoryCategory;
};