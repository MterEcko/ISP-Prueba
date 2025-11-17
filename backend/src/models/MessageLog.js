// backend/src/models/MessageLog.js
module.exports = (sequelize, Sequelize) => {
  const MessageLog = sequelize.define('MessageLog', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: Sequelize.ENUM('sms', 'whatsapp', 'email'),
      allowNull: false,
      comment: 'Tipo de mensaje enviado'
    },
    to: {
      type: Sequelize.STRING(50),
      allowNull: false,
      comment: 'Número de teléfono o email destino'
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Contenido del mensaje'
    },
    status: {
      type: Sequelize.ENUM('sent', 'failed', 'pending', 'delivered', 'read'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Estado del mensaje'
    },
    providerId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'ID del proveedor (Twilio SID, etc.)'
    },
    provider: {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'twilio',
      comment: 'Proveedor de mensajería (twilio, etc.)'
    },
    error: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Mensaje de error si falló'
    },
    clientId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID del cliente relacionado',
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    invoiceId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID de factura relacionada',
      references: {
        model: 'Invoices',
        key: 'id'
      }
    },
    sentAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Fecha y hora de envío'
    },
    deliveredAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha y hora de entrega'
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Datos adicionales del mensaje'
    }
  }, {
    tableName: 'MessageLogs',
    timestamps: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['clientId']
      },
      {
        fields: ['sentAt']
      },
      {
        fields: ['provider']
      }
    ]
  });

  MessageLog.associate = function(models) {
    // Asociación con Cliente (opcional)
    MessageLog.belongsTo(models.Client, {
      foreignKey: 'clientId',
      as: 'client'
    });

    // Asociación con Factura (opcional)
    MessageLog.belongsTo(models.Invoice, {
      foreignKey: 'invoiceId',
      as: 'invoice'
    });
  };

  return MessageLog;
};
