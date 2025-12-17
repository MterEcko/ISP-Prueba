const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WhatsappTwilioMessage = sequelize.define('WhatsappTwilioMessage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID del cliente (si aplica)"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID del usuario del sistema"
    },
    twilioMessageSid: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "SID del mensaje en Twilio"
    },
    fromPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Número de origen"
    },
    toPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Número de destino"
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false,
      comment: "Dirección del mensaje"
    },
    messageType: {
      type: DataTypes.ENUM('text', 'media'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Contenido del mensaje"
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL del medio (si aplica)"
    },
    status: {
      type: DataTypes.ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'undelivered'),
      defaultValue: 'queued'
    },
    errorCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos adicionales del mensaje"
    }
  }, {
    tableName: 'Plugin_WhatsappTwilioMessages',
    timestamps: true
  });

  return WhatsappTwilioMessage;
};
