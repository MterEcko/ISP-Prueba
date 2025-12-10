// backend/src/models/communicationContact.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationContact = sequelize.define('CommunicationContact', {
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
    contactType: {
      type: DataTypes.ENUM('email', 'phone', 'whatsapp', 'telegram'),
      allowNull: false
    },
    contactValue: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'email, número de teléfono, chat ID'
    },
    isPreferred: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Preferencias de comunicación del cliente'
    },
    optIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Acepta recibir comunicaciones'
    },
    optInDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    optOutDate: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'CommunicationContacts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['clientId', 'contactType', 'contactValue']
      }
    ]
  });

  return CommunicationContact;
};