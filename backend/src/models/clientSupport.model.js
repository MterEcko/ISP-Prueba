// backend/src/models/clientSupport.model.js (29/5/25 → ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientSupport = sequelize.define('ClientSupport', {
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
    issueType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'inProgress', 'resolved'),
      defaultValue: 'pending'
    },
    photos: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'URLs de fotos del problema'
    },
    comments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Comentarios del técnico'
    },
    resolutionNotes: {
      type: DataTypes.TEXT
    },
    resolvedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'ClientSupports',
    timestamps: true
  });

  return ClientSupport;
};