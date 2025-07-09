const db = require('../models');
const logger = require('../utils/logger');
const communicationService = require('./communication.service');
const moment = require('moment');

class NotificationService {
  constructor() {
    this.notificationQueue = [];
    this.isProcessing = false;
  }

  /**
   * Envía notificación de bienvenida a nuevo cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendWelcomeNotification(clientId) {
    try {
      const client = await db.Client.findByPk(clientId, {
        include: [
          { model: db.servicePackage, as: 'servicePackage' },
          { model: db.ClientBilling, as: 'billing' }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      const variables = {
        clientName: `${client.firstName} ${client.lastName}`,
        packageName: client.servicePackage?.name || 'Plan Básico',
        downloadSpeed: client.servicePackage?.downloadSpeedMbps || 10,
        supportPhone: '+52 33 1234 5678',
        installationDate: moment().add(2, 'days').format('DD/MM/YYYY')
      };

      // Enviar por múltiples canales
      const results = await Promise.allSettled([
        this.sendNotificationByChannel('email', client, 'welcome', variables),
        this.sendNotificationByChannel('whatsapp', client, 'welcome', variables)
      ]);

      await this.logNotification(clientId, 'welcome', 'multi-channel', results);

      logger.info(`Notificación de bienvenida enviada al cliente ${clientId}`);

      return {
        success: true,
        message: 'Notificación de bienvenida enviada',
        results: results
      };
    } catch (error) {
      logger.error(`Error enviando bienvenida a cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía recordatorio de pago vencido
   * @param {number} clientId - ID del cliente
   * @param {number} daysOverdue - Días de retraso
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendPaymentDueReminder(clientId, daysOverdue = 0) {
    try {
      const client = await db.Client.findByPk(clientId, {
        include: [
          { 
            model: db.ClientBilling, 
            as: 'billing',
            include: [{ model: db.servicePackage, as: 'servicePackage' }]
          },
          { model: db.Invoice, where: { status: 'pending' }, required: false }
        ]
      });

      if (!client || !client.billing) {
        throw new Error(`Cliente ${clientId} o facturación no encontrados`);
      }

      const billing = client.billing;
      const overdueAmount = billing.monthlyFee;
      const nextDueDate = moment(billing.nextDueDate).format('DD/MM/YYYY');

      const variables = {
        clientName: `${client.firstName} ${client.lastName}`,
        overdueAmount: `$${overdueAmount.toFixed(2)}`,
        daysOverdue: daysOverdue,
        nextDueDate: nextDueDate,
        penaltyFee: billing.penaltyFee ? `$${billing.penaltyFee.toFixed(2)}` : '$0.00',
        paymentMethods: 'Transferencia, Efectivo, Tarjeta',
        graceDaysRemaining: Math.max(0, billing.graceDays - daysOverdue)
      };

      // Determinar urgencia del mensaje
      let templateType = 'paymentReminder';
      if (daysOverdue > billing.graceDays) {
        templateType = 'serviceSuspensionWarning';
      } else if (daysOverdue > (billing.graceDays + 7)) {
        templateType = 'serviceCutWarning';
      }

      // Enviar según la urgencia
      const channels = ['email'];
      if (daysOverdue > 3) channels.push('whatsapp');
      if (daysOverdue > billing.graceDays) channels.push('sms');

      const results = await Promise.allSettled(
        channels.map(channel => 
          this.sendNotificationByChannel(channel, client, templateType, variables)
        )
      );

      // Crear registro de recordatorio
      await db.PaymentReminder.create({
        clientId: clientId,
        invoiceId: client.Invoices?.[0]?.id || null,
        reminderType: channels.join(','),
        status: results.every(r => r.status === 'fulfilled') ? 'sent' : 'failed',
        daysOverdue: daysOverdue,
        messageSent: JSON.stringify(variables)
      });

      logger.info(`Recordatorio de pago enviado al cliente ${clientId}, ${daysOverdue} días vencido`);

      return {
        success: true,
        message: 'Recordatorio de pago enviado',
        daysOverdue: daysOverdue,
        channels: channels,
        results: results
      };
    } catch (error) {
      logger.error(`Error enviando recordatorio de pago a cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notifica instalación programada
   * @param {number} clientId - ID del cliente
   * @param {number} ticketId - ID del ticket de instalación
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendInstallationScheduled(clientId, ticketId) {
    try {
      const client = await db.Client.findByPk(clientId);
      const ticket = await db.Ticket.findByPk(ticketId, {
        include: [
          { model: db.User, as: 'assignedTo' },
          { model: db.TicketType, as: 'ticketType' }
        ]
      });

      if (!client || !ticket) {
        throw new Error(`Cliente ${clientId} o ticket ${ticketId} no encontrados`);
      }

      const instalationDate = moment(ticket.scheduledDate).format('DD/MM/YYYY');
      const instalationTime = ticket.scheduledTime || '09:00';
      const technicianName = ticket.assignedTo ? 
        ticket.assignedTo.fullName : 'Técnico por asignar';

      const variables = {
        clientName: `${client.firstName} ${client.lastName}`,
        instalationDate: instalationDate,
        instalationTime: instalationTime,
        technicianName: technicianName,
        technicianPhone: '+52 33 1234 5678',
        ticketNumber: `#${ticket.id}`,
        address: client.address || 'Dirección por confirmar',
        estimatedDuration: ticket.ticketType?.estimatedDurationHours || 2
      };

      const results = await Promise.allSettled([
        this.sendNotificationByChannel('email', client, 'installationScheduled', variables),
        this.sendNotificationByChannel('whatsapp', client, 'installationScheduled', variables)
      ]);

      logger.info(`Notificación de instalación enviada: Cliente ${clientId}, Ticket ${ticketId}`);

      return {
        success: true,
        message: 'Notificación de instalación enviada',
        scheduledDate: instalationDate,
        results: results
      };
    } catch (error) {
      logger.error(`Error enviando notificación de instalación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía alerta de mantenimiento de dispositivo
   * @param {number} deviceId - ID del dispositivo
   * @param {string} issue - Descripción del problema
   * @param {string} priority - Prioridad (low, medium, high, critical)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMaintenanceAlert(deviceId, issue, priority = 'medium') {
    try {
      const device = await db.Device.findByPk(deviceId, {
        include: [
          { model: db.Node, as: 'node' },
          { model: db.Sector, as: 'sector' }
        ]
      });

      if (!device) {
        throw new Error(`Dispositivo ${deviceId} no encontrado`);
      }

      // Obtener técnicos con permisos de red
      const technicians = await db.User.findAll({
        include: [{
          model: db.Role,
          include: [{
            model: db.Permission,
            where: { name: 'manageNetwork' }
          }]
        }],
        where: { active: true }
      });

      const variables = {
        deviceName: device.name,
        deviceType: device.type,
        deviceModel: device.model,
        deviceIp: device.ipAddress,
        nodeName: device.node?.name || 'Nodo no asignado',
        sectorName: device.sector?.name || 'Sector no asignado',
        issue: issue,
        priority: priority.toUpperCase(),
        timestamp: moment().format('DD/MM/YYYY HH:mm'),
        deviceLocation: device.location || 'Ubicación no especificada'
      };

      // Enviar a técnicos según prioridad
      const results = [];
      for (const technician of technicians) {
        if (priority === 'critical') {
          // Crítico: Telegram + WhatsApp + Email
          results.push(
            await this.sendTechnicianAlert(technician, 'maintenanceCritical', variables)
          );
        } else if (priority === 'high') {
          // Alto: Telegram + Email
          results.push(
            await this.sendTechnicianAlert(technician, 'maintenanceHigh', variables)
          );
        } else {
          // Medium/Low: Solo Telegram
          results.push(
            await this.sendTechnicianAlert(technician, 'maintenanceNormal', variables)
          );
        }
      }

      logger.warn(`Alerta de mantenimiento enviada para dispositivo ${deviceId}: ${issue}`);

      return {
        success: true,
        message: 'Alerta de mantenimiento enviada',
        deviceId: deviceId,
        priority: priority,
        techniciansNotified: technicians.length,
        results: results
      };
    } catch (error) {
      logger.error(`Error enviando alerta de mantenimiento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía alerta del sistema
   * @param {string} message - Mensaje de la alerta
   * @param {string} priority - Prioridad (info, warning, error, critical)
   * @param {Array} recipients - Array de tipos de destinatarios ['admins', 'technicians']
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendSystemAlert(message, priority = 'info', recipients = ['admins']) {
    try {
      const variables = {
        message: message,
        priority: priority.toUpperCase(),
        timestamp: moment().format('DD/MM/YYYY HH:mm:ss'),
        systemName: 'Sistema ISP'
      };

      const users = await this.getUsersByRecipientTypes(recipients);
      
      const results = [];
      for (const user of users) {
        if (priority === 'critical') {
          results.push(
            await this.sendSystemAlertToUser(user, 'systemCritical', variables)
          );
        } else if (priority === 'error') {
          results.push(
            await this.sendSystemAlertToUser(user, 'systemError', variables)
          );
        } else {
          results.push(
            await this.sendSystemAlertToUser(user, 'systemInfo', variables)
          );
        }
      }

      logger.info(`Alerta del sistema enviada: ${message} (${priority})`);

      return {
        success: true,
        message: 'Alerta del sistema enviada',
        priority: priority,
        recipientsNotified: users.length,
        results: results
      };
    } catch (error) {
      logger.error(`Error enviando alerta del sistema: ${error.message}`);
      throw error;
    }
  }

  /**
   * Programa recordatorios recurrentes
   * @returns {Promise<Object>} Resultado de la programación
   */
  async scheduleRecurringReminders() {
    try {
      // Obtener clientes con pagos vencidos
      const overdueClients = await db.Client.findAll({
        include: [{
          model: db.ClientBilling,
          as: 'billing',
          where: {
            nextDueDate: {
              [db.Sequelize.Op.lt]: moment().toDate()
            },
            clientStatus: ['active', 'suspended']
          }
        }]
      });

      const results = [];
      for (const client of overdueClients) {
        const daysOverdue = moment().diff(moment(client.billing.nextDueDate), 'days');
        
        // Solo enviar recordatorios cada 3 días
        if (daysOverdue % 3 === 0) {
          try {
            const result = await this.sendPaymentDueReminder(client.id, daysOverdue);
            results.push({ clientId: client.id, success: true, daysOverdue });
          } catch (error) {
            results.push({ clientId: client.id, success: false, error: error.message });
          }
        }
      }

      logger.info(`Recordatorios recurrentes procesados: ${results.length} clientes`);

      return {
        success: true,
        message: 'Recordatorios recurrentes programados',
        clientsProcessed: results.length,
        results: results
      };
    } catch (error) {
      logger.error(`Error programando recordatorios recurrentes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene historial de notificaciones de un cliente
   * @param {number} clientId - ID del cliente
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Object>} Historial de notificaciones
   */
  async getNotificationHistory(clientId, limit = 50) {
    try {
      const notifications = await db.CommunicationLog.findAll({
        where: { clientId: clientId },
        include: [
          { model: db.CommunicationChannel, as: 'channel' },
          { model: db.MessageTemplate, as: 'template' }
        ],
        order: [['createdAt', 'DESC']],
        limit: limit
      });

      const paymentReminders = await db.PaymentReminder.findAll({
        where: { clientId: clientId },
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      return {
        success: true,
        data: {
          communications: notifications,
          paymentReminders: paymentReminders,
          totalCount: notifications.length + paymentReminders.length
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo historial de notificaciones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marca notificación como leída
   * @param {number} notificationId - ID de la notificación
   * @returns {Promise<Object>} Resultado de la operación
   */
  async markNotificationAsRead(notificationId) {
    try {
      await db.CommunicationLog.update(
        { status: 'read', deliveredAt: new Date() },
        { where: { id: notificationId } }
      );

      return {
        success: true,
        message: 'Notificación marcada como leída'
      };
    } catch (error) {
      logger.error(`Error marcando notificación como leída: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Envía notificación por canal específico
   * @private
   */
  async sendNotificationByChannel(channelType, client, templateType, variables) {
    const recipient = this.getRecipientForChannel(channelType, client);
    
    if (!recipient) {
      throw new Error(`No se encontró ${channelType} para el cliente ${client.id}`);
    }

    return await communicationService.sendMessage(
      channelType,
      recipient,
      templateType,
      variables
    );
  }

  /**
   * Obtiene el destinatario según el canal
   * @private
   */
  getRecipientForChannel(channelType, client) {
    switch (channelType) {
      case 'email':
        return client.email;
      case 'whatsapp':
      case 'sms':
        return client.whatsapp || client.phone;
      case 'telegram':
        return client.telegramChatId; // Si lo tienes implementado
      default:
        return null;
    }
  }

  /**
   * Envía alerta a técnico por múltiples canales
   * @private
   */
  async sendTechnicianAlert(technician, templateType, variables) {
    const results = [];
    
    // Siempre Telegram para técnicos
    if (technician.telegramChatId) {
      results.push(
        await communicationService.sendMessage('telegram', technician.telegramChatId, templateType, variables)
      );
    }

    // WhatsApp si es crítico
    if (templateType.includes('critical') && technician.phone) {
      results.push(
        await communicationService.sendMessage('whatsapp', technician.phone, templateType, variables)
      );
    }

    // Email siempre
    if (technician.email) {
      results.push(
        await communicationService.sendMessage('email', technician.email, templateType, variables)
      );
    }

    return results;
  }

  /**
   * Envía alerta del sistema a usuario
   * @private
   */
  async sendSystemAlertToUser(user, templateType, variables) {
    const results = [];

    if (templateType.includes('critical')) {
      // Crítico: Todos los canales
      if (user.telegramChatId) {
        results.push(await communicationService.sendMessage('telegram', user.telegramChatId, templateType, variables));
      }
      if (user.phone) {
        results.push(await communicationService.sendMessage('whatsapp', user.phone, templateType, variables));
      }
    }

    // Siempre email
    if (user.email) {
      results.push(await communicationService.sendMessage('email', user.email, templateType, variables));
    }

    return results;
  }

  /**
   * Obtiene usuarios por tipos de destinatarios
   * @private
   */
  async getUsersByRecipientTypes(recipientTypes) {
    const roleNames = [];
    
    if (recipientTypes.includes('admins')) roleNames.push('admin');
    if (recipientTypes.includes('technicians')) roleNames.push('tecnico');

    return await db.User.findAll({
      include: [{
        model: db.Role,
        where: { name: roleNames }
      }],
      where: { active: true }
    });
  }

  /**
   * Registra notificación en el log
   * @private
   */
  async logNotification(clientId, type, channel, results) {
    const logData = {
      clientId: clientId,
      channelId: null, // Se podría mapear según el canal
      templateId: null, // Se podría mapear según el tipo
      recipient: 'multiple',
      subject: type,
      messageSent: JSON.stringify({ type, channel, timestamp: new Date() }),
      status: results.every(r => r.status === 'fulfilled') ? 'sent' : 'failed',
      sentAt: new Date()
    };

    await db.CommunicationLog.create(logData);
  }
}

module.exports = new NotificationService();