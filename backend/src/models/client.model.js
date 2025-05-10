const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    whatsapp: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.FLOAT
    },
    longitude: {
      type: DataTypes.FLOAT
    },
    birthDate: {
      type: DataTypes.DATEONLY
    },
    startDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT
    }
  });

  return Client;
};