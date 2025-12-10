// backend/src/models/installationMaterial.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InstallationMaterial = sequelize.define('InstallationMaterial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id'
      }
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Inventory',
        key: 'id'
      }
    },
    quantityUsed: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    scrapGenerated: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0.000,
      comment: 'Scrap generado en instalación'
    },
    usageType: {
      type: DataTypes.ENUM('installation', 'repair', 'maintenance'),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    },
    usedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'installation_materials',
    timestamps: true,
    underscored: true
  });

  return InstallationMaterial;
};