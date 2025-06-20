// backend/src/models/clientInstallation.model.js (29/5/25 → ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientInstallation = sequelize.define('ClientInstallation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    photos: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'URLs de fotos antes/después'
    },
    equipmentInstalled: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Equipos instalados'
    },
    materialsUsed: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Materiales utilizados'
    },
    installationDate: {
      type: DataTypes.DATE
    },
    technicianNotes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'ClientInstallations',
    timestamps: true
  });

  return ClientInstallation;
};