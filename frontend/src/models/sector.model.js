// backend/src/models/sector.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sector = sequelize.define('Sector', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    frequency: {
      type: DataTypes.STRING
    },
    azimuth: {
      type: DataTypes.INTEGER
    },
    polarization: {
      type: DataTypes.STRING
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }, 
    nodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Nodes',
        key: 'id'
      }
    },
    // Un sector ES un device
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Devices',
        key: 'id'
      }
    }
  }, {
    tableName: 'Sectors',
    timestamps: true
  });

  return Sector;
};