const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Node = sequelize.define('Node', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.FLOAT
    },
    longitude: {
      type: DataTypes.FLOAT
    },
    description: {
      type: DataTypes.TEXT
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  return Node;
};