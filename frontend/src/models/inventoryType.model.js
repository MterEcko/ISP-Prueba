// backend/src/models/inventoryType.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryType = sequelize.define('InventoryType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'InventoryCategories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Antenas, Cables, Conectores, Modems'
    },
    description: {
      type: DataTypes.TEXT
    },
    unitType: {
      type: DataTypes.ENUM('piece', 'meters', 'grams', 'box'),
      defaultValue: 'piece'
    },
    hasSerial: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'true para equipos, false para consumibles'
    },
    hasMac: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'true para equipos de red'
    },
    trackableIndividually: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'false para consumibles como grapas'
    },
    defaultScrapPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      comment: '5.0 para cables, 0.0 para equipos'
    }
  }, {
    tableName: 'InventoryTypes',
    timestamps: true,
    underscored: true
  });

  return InventoryType;
};