// backend/src/services/notification.service.js
const db = require('../models');
const websocketService = require('./websocket.service');
const logger = require('../utils/logger');

/**
 * Servicio de notificaciones en tiempo real
 * Gestiona la creación, envío y seguimiento de notificaciones
 */
class NotificationService {
  /**
   * Crea y envía una notificación
   * @param {Object} notificationData - Datos de la notificación
   * @returns {Promise<Object>} - Notificación creada
   */
  async createAndSend(notificationData) {
    try {
      const {
        userId,
        type,
        priority = 'medium',
        title,
        message,
        metadata = {},
        actionUrl = null,
        actionLabel = null,
        expiresAt = null,
        sendViaWebSocket = true,
        sendViaEmail = false,
        sendViaSMS = false
      } = notificationData;

      // Crear notificación en la base de datos
      const notification = await db.Notification.create({
        userId,
        type,
        priority,
        title,
        message,
        metadata,
        actionUrl,
        actionLabel,
        expiresAt,
        sentVia: {
          websocket: sendViaWebSocket,
          email: sendViaEmail,
          sms: sendViaSMS
        }
      });

      // Enviar por WebSocket si está habilitado
      if (sendViaWebSocket) {
        this.sendViaWebSocket(notification);
      }

      // TODO: Enviar por Email si está habilitado
      // if (sendViaEmail) {
      //   this.sendViaEmail(notification);
      // }

      // TODO: Enviar por SMS si está habilitado
      // if (sendViaSMS) {
      //   this.sendViaSMS(notification);
      // }

      logger.info(\`Notificación creada: \${notification.id} (\${type}) para usuario \${userId || 'todos'}\`);

      return notification;
    } catch (error) {
      logger.error(\`Error creando notificación: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Envía una notificación por WebSocket
   * @param {Object} notification - Notificación a enviar
   */
  sendViaWebSocket(notification) {
    const notificationPayload = {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      createdAt: notification.createdAt
    };

    if (notification.userId) {
      // Enviar a un usuario específico
      websocketService.emitToUser(notification.userId, 'notification:new', notificationPayload);
    } else {
      // Broadcast a todos los usuarios
      websocketService.broadcast('notification:new', notificationPayload);
    }
  }

  /**
   * Notificación de pago recibido
   */
  async notifyPaymentReceived(payment, client) {
    return this.createAndSend({
      userId: null, // Notificar a todos los admin/manager
      type: 'payment_received',
      priority: 'high',
      title: 'Pago Recibido',
      message: \`Se recibió un pago de $\${payment.monto} de \${client.nombre}\`,
      metadata: {
        paymentId: payment.id,
        clientId: client.id,
        amount: payment.monto,
        method: payment.metodo_pago
      },
      actionUrl: \`/payments/\${payment.id}\`,
      actionLabel: 'Ver Pago',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de pago fallido
   */
  async notifyPaymentFailed(payment, client, errorMessage) {
    return this.createAndSend({
      userId: null,
      type: 'payment_failed',
      priority: 'high',
      title: 'Pago Fallido',
      message: \`El pago de $\${payment.monto} de \${client.nombre} falló: \${errorMessage}\`,
      metadata: {
        paymentId: payment.id,
        clientId: client.id,
        amount: payment.monto,
        error: errorMessage
      },
      actionUrl: \`/payments/\${payment.id}\`,
      actionLabel: 'Ver Detalles',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de nuevo cliente
   */
  async notifyNewClient(client, createdByUserId) {
    return this.createAndSend({
      userId: null,
      type: 'client_created',
      priority: 'medium',
      title: 'Nuevo Cliente',
      message: \`Cliente \${client.nombre} registrado exitosamente\`,
      metadata: {
        clientId: client.id,
        clientName: client.nombre,
        createdBy: createdByUserId
      },
      actionUrl: \`/clients/\${client.id}\`,
      actionLabel: 'Ver Cliente',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de cliente suspendido
   */
  async notifyClientSuspended(client, reason) {
    return this.createAndSend({
      userId: null,
      type: 'client_suspended',
      priority: 'medium',
      title: 'Cliente Suspendido',
      message: \`Cliente \${client.nombre} ha sido suspendido: \${reason}\`,
      metadata: {
        clientId: client.id,
        clientName: client.nombre,
        reason: reason
      },
      actionUrl: \`/clients/\${client.id}\`,
      actionLabel: 'Ver Cliente',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de nuevo ticket
   */
  async notifyNewTicket(ticket, client) {
    return this.createAndSend({
      userId: null,
      type: 'ticket_created',
      priority: ticket.priority === 'urgent' ? 'urgent' : 'medium',
      title: 'Nuevo Ticket',
      message: \`Nuevo ticket #\${ticket.id} de \${client.nombre}: \${ticket.subject}\`,
      metadata: {
        ticketId: ticket.id,
        clientId: client.id,
        subject: ticket.subject,
        priority: ticket.priority
      },
      actionUrl: \`/tickets/\${ticket.id}\`,
      actionLabel: 'Ver Ticket',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de ticket asignado
   */
  async notifyTicketAssigned(ticket, assignedToUserId, assignedByUsername) {
    return this.createAndSend({
      userId: assignedToUserId,
      type: 'ticket_assigned',
      priority: 'high',
      title: 'Ticket Asignado',
      message: \`Se te ha asignado el ticket #\${ticket.id}: \${ticket.subject}\`,
      metadata: {
        ticketId: ticket.id,
        subject: ticket.subject,
        assignedBy: assignedByUsername
      },
      actionUrl: \`/tickets/\${ticket.id}\`,
      actionLabel: 'Ver Ticket',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de factura vencida
   */
  async notifyInvoiceOverdue(invoice, client) {
    return this.createAndSend({
      userId: null,
      type: 'invoice_overdue',
      priority: 'high',
      title: 'Factura Vencida',
      message: \`Factura #\${invoice.numero_factura} de \${client.nombre} está vencida ($\${invoice.total})\`,
      metadata: {
        invoiceId: invoice.id,
        clientId: client.id,
        amount: invoice.total,
        dueDate: invoice.fecha_vencimiento
      },
      actionUrl: \`/invoices/\${invoice.id}\`,
      actionLabel: 'Ver Factura',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de alerta del sistema
   */
  async notifySystemAlert(title, message, metadata = {}) {
    return this.createAndSend({
      userId: null,
      type: 'system_alert',
      priority: 'urgent',
      title: title,
      message: message,
      metadata: metadata,
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de error en plugin
   */
  async notifyPluginError(pluginName, errorMessage, metadata = {}) {
    return this.createAndSend({
      userId: null,
      type: 'plugin_error',
      priority: 'high',
      title: \`Error en Plugin: \${pluginName}\`,
      message: errorMessage,
      metadata: {
        plugin: pluginName,
        ...metadata
      },
      actionUrl: '/plugins',
      actionLabel: 'Ver Plugins',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de inventario bajo
   */
  async notifyLowInventory(product, currentStock, minStock) {
    return this.createAndSend({
      userId: null,
      type: 'low_inventory',
      priority: 'medium',
      title: 'Inventario Bajo',
      message: \`El producto "\${product.nombre}" tiene stock bajo: \${currentStock} unidades (mínimo: \${minStock})\`,
      metadata: {
        productId: product.id,
        productName: product.nombre,
        currentStock: currentStock,
        minStock: minStock
      },
      actionUrl: \`/inventory/\${product.id}\`,
      actionLabel: 'Ver Producto',
      sendViaWebSocket: true
    });
  }

  /**
   * Notificación de dispositivo desconectado
   */
  async notifyDeviceOffline(device) {
    return this.createAndSend({
      userId: null,
      type: 'device_offline',
      priority: 'high',
      title: 'Dispositivo Desconectado',
      message: \`El dispositivo \${device.name} (\${device.ip}) está fuera de línea\`,
      metadata: {
        deviceId: device.id,
        deviceName: device.name,
        deviceIp: device.ip
      },
      actionUrl: \`/devices/\${device.id}\`,
      actionLabel: 'Ver Dispositivo',
      sendViaWebSocket: true
    });
  }

  /**
   * Obtiene las notificaciones de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Object>} - Notificaciones y totales
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        types = null,
        priority = null,
        includeArchived = false
      } = options;

      const where = {
        userId: userId
      };

      if (unreadOnly) {
        where.isRead = false;
      }

      if (!includeArchived) {
        where.isArchived = false;
      }

      if (types && Array.isArray(types)) {
        where.type = types;
      }

      if (priority) {
        where.priority = priority;
      }

      // Excluir notificaciones expiradas
      where.expiresAt = {
        [db.Sequelize.Op.or]: [
          null,
          { [db.Sequelize.Op.gt]: new Date() }
        ]
      };

      const { count, rows } = await db.Notification.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ['priority', 'DESC'], // Urgentes primero
          ['createdAt', 'DESC'] // Más recientes primero
        ]
      });

      // Contar no leídas
      const unreadCount = await db.Notification.count({
        where: {
          userId: userId,
          isRead: false,
          isArchived: false,
          expiresAt: {
            [db.Sequelize.Op.or]: [
              null,
              { [db.Sequelize.Op.gt]: new Date() }
            ]
          }
        }
      });

      return {
        notifications: rows,
        total: count,
        unreadCount: unreadCount
      };
    } catch (error) {
      logger.error(\`Error obteniendo notificaciones: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Marca una notificación como leída
   * @param {number} notificationId - ID de la notificación
   * @param {number} userId - ID del usuario (para verificar permisos)
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await db.Notification.findOne({
        where: {
          id: notificationId,
          userId: userId
        }
      });

      if (!notification) {
        throw new Error('Notificación no encontrada');
      }

      if (!notification.isRead) {
        await notification.update({
          isRead: true,
          readAt: new Date()
        });
      }

      return notification;
    } catch (error) {
      logger.error(\`Error marcando notificación como leída: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   * @param {number} userId - ID del usuario
   */
  async markAllAsRead(userId) {
    try {
      const result = await db.Notification.update(
        {
          isRead: true,
          readAt: new Date()
        },
        {
          where: {
            userId: userId,
            isRead: false
          }
        }
      );

      return { updated: result[0] };
    } catch (error) {
      logger.error(\`Error marcando todas las notificaciones como leídas: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Archiva una notificación
   * @param {number} notificationId - ID de la notificación
   * @param {number} userId - ID del usuario
   */
  async archiveNotification(notificationId, userId) {
    try {
      const notification = await db.Notification.findOne({
        where: {
          id: notificationId,
          userId: userId
        }
      });

      if (!notification) {
        throw new Error('Notificación no encontrada');
      }

      await notification.update({
        isArchived: true,
        archivedAt: new Date()
      });

      return notification;
    } catch (error) {
      logger.error(\`Error archivando notificación: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Elimina notificaciones expiradas
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await db.Notification.destroy({
        where: {
          expiresAt: {
            [db.Sequelize.Op.lt]: new Date()
          }
        }
      });

      logger.info(\`Eliminadas \${result} notificaciones expiradas\`);
      return result;
    } catch (error) {
      logger.error(\`Error limpiando notificaciones expiradas: \${error.message}\`);
      throw error;
    }
  }

  /**
   * Elimina notificaciones archivadas antiguas (más de 30 días)
   */
  async cleanupOldArchivedNotifications(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.Notification.destroy({
        where: {
          isArchived: true,
          archivedAt: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      logger.info(\`Eliminadas \${result} notificaciones archivadas antiguas\`);
      return result;
    } catch (error) {
      logger.error(\`Error limpiando notificaciones archivadas: \${error.message}\`);
      throw error;
    }
  }
}

// Exportar instancia singleton
module.exports = new NotificationService();
