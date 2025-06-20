// backend/src/models/communicationEvent.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationEvent = sequelize.define('CommunicationEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'payment_overdue, service_suspended, ticket_created, etc.'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'client, invoice, ticket, etc.'
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la entidad que disparó el evento'
    },
    clientId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    eventData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos específicos del evento'
    },
    processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    processedAt: {
      type: DataTypes.DATE
    },
    notificationsTriggered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    }
  }, {
    tableName: 'CommunicationEvents',
    timestamps: true,
    indexes: [
      {
        fields: ['eventType', 'processed']
      },
      {
        fields: ['clientId', 'eventType']
      }
    ]
  });

  return CommunicationEvent;
};