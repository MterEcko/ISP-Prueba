// backend/src/models/notification.model.js
module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true, // null = notificación para todos los usuarios
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    type: {
      type: Sequelize.ENUM(
        'payment_received',      // Pago recibido
        'payment_failed',        // Pago fallido
        'client_created',        // Nuevo cliente
        'client_suspended',      // Cliente suspendido
        'ticket_created',        // Nuevo ticket
        'ticket_assigned',       // Ticket asignado
        'ticket_resolved',       // Ticket resuelto
        'invoice_generated',     // Factura generada
        'invoice_overdue',       // Factura vencida
        'service_activated',     // Servicio activado
        'service_suspended',     // Servicio suspendido
        'system_alert',          // Alerta del sistema
        'plugin_installed',      // Plugin instalado
        'plugin_error',          // Error en plugin
        'license_expiring',      // Licencia por vencer
        'low_inventory',         // Inventario bajo
        'device_offline',        // Dispositivo desconectado
        'general'                // Notificación general
      ),
      allowNull: false,
      defaultValue: 'general'
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    metadata: {
      type: Sequelize.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('metadata');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('metadata', JSON.stringify(value));
      }
    },
    actionUrl: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'URL o ruta del frontend a la que navegar al hacer clic'
    },
    actionLabel: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Etiqueta del botón de acción (ej: "Ver Detalles", "Ir al Ticket")'
    },
    isRead: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    readAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    isArchived: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    archivedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha de expiración (para notificaciones temporales)'
    },
    sentVia: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Canales por los que se envió (websocket, email, sms, etc.)'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['isRead']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['priority']
      }
    ]
  });

  // Relaciones
  Notification.associate = function(models) {
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Notification;
};
