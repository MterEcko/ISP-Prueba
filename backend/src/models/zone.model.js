// backend/src/models/zone.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Zone = sequelize.define('Zone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Los Ruiseñores, Acacias, La Estación'
    },
    description: {
      type: DataTypes.TEXT
    },
    latitude: {
      type: DataTypes.FLOAT
    },
    longitude: {
      type: DataTypes.FLOAT
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'Zones',
    timestamps: true
  });

  return Zone;
};