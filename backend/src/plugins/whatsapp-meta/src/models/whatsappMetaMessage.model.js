const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WhatsappMetaMessage = sequelize.define('WhatsappMetaMessage', {
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
    whatsappMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del mensaje en WhatsApp"
    },
    whatsappPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Número de WhatsApp"
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false,
      comment: "Dirección del mensaje"
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'video', 'document', 'audio', 'location', 'template'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Contenido del mensaje"
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Nombre de la plantilla (si aplica)"
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent'
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
    tableName: 'Plugin_WhatsappMetaMessages',
    timestamps: true
  });

  return WhatsappMetaMessage;
};
