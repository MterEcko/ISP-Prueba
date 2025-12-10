const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmailLog = sequelize.define('EmailLog', {
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
      comment: "ID del usuario que envió el email"
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Destinatario"
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Remitente"
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Asunto del email"
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Cuerpo del email"
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed', 'pending', 'bounced'),
      defaultValue: 'pending'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Proveedor usado (smtp, sendgrid, mailgun)"
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del mensaje del proveedor"
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Mensaje de error si falló"
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos adicionales"
    }
  }, {
    tableName: 'Plugin_EmailLogs',
    timestamps: true
  });

  return EmailLog;
};
