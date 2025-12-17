// backend/src/services/reminders.service.js
const twilio = require('twilio');
const cron = require('node-cron');
const db = require('../models');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

/**
 * Servicio de recordatorios automáticos por WhatsApp y SMS
 * Integración con Twilio para envío de mensajes
 */
class RemindersService {
  constructor() {
    this.twilioClient = null;
    this.twilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886' // Sandbox number
    };

    this.scheduledJobs = new Map();
    this.isInitialized = false;

    // Inicializar cliente de Twilio si las credenciales están disponibles
    if (this.twilioConfig.accountSid && this.twilioConfig.authToken) {
      try {
        this.twilioClient = twilio(this.twilioConfig.accountSid, this.twilioConfig.authToken);
        this.isInitialized = true;
        logger.info(' Twilio client inicializado correctamente');
      } catch (error) {
        logger.error(`L Error inicializando Twilio: ${error.message}`);
      }
    } else {
      logger.warn('   Credenciales de Twilio no configuradas. Recordatorios deshabilitados.');
    }
  }

  /**
   * Verifica si el servicio de Twilio está disponible
   */
  isAvailable() {
    return this.isInitialized && this.twilioClient !== null;
  }

  /**
   * Envía un mensaje SMS
   * @param {string} to - Número de teléfono destino (formato E.164: +523311234567)
   * @param {string} message - Contenido del mensaje
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendSMS(to, message) {
    if (!this.isAvailable()) {
      throw new Error('Servicio de SMS no disponible. Verifica configuración de Twilio.');
    }

    try {
      // Normalizar número de teléfono
      const normalizedPhone = this._normalizePhoneNumber(to);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioConfig.phoneNumber,
        to: normalizedPhone
      });

      logger.info(`=ñ SMS enviado a ${normalizedPhone}: ${result.sid}`);

      // Registrar en base de datos
      await this._logMessage({
        type: 'sms',
        to: normalizedPhone,
        message: message,
        status: 'sent',
        providerId: result.sid,
        provider: 'twilio'
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status
      };

    } catch (error) {
      logger.error(`L Error enviando SMS: ${error.message}`);

      // Registrar error en base de datos
      await this._logMessage({
        type: 'sms',
        to: to,
        message: message,
        status: 'failed',
        error: error.message,
        provider: 'twilio'
      });

      throw error;
    }
  }

  /**
   * Envía un mensaje por WhatsApp
   * @param {string} to - Número de teléfono destino (formato E.164: +523311234567)
   * @param {string} message - Contenido del mensaje
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendWhatsApp(to, message) {
    if (!this.isAvailable()) {
      throw new Error('Servicio de WhatsApp no disponible. Verifica configuración de Twilio.');
    }

    try {
      // Normalizar número de teléfono y agregar prefijo whatsapp:
      const normalizedPhone = this._normalizePhoneNumber(to);
      const whatsappNumber = `whatsapp:${normalizedPhone}`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioConfig.whatsappNumber,
        to: whatsappNumber
      });

      logger.info(`=¬ WhatsApp enviado a ${normalizedPhone}: ${result.sid}`);

      // Registrar en base de datos
      await this._logMessage({
        type: 'whatsapp',
        to: normalizedPhone,
        message: message,
        status: 'sent',
        providerId: result.sid,
        provider: 'twilio'
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status
      };

    } catch (error) {
      logger.error(`L Error enviando WhatsApp: ${error.message}`);

      // Registrar error en base de datos
      await this._logMessage({
        type: 'whatsapp',
        to: to,
        message: message,
        status: 'failed',
        error: error.message,
        provider: 'twilio'
      });

      throw error;
    }
  }

  /**
   * Envía recordatorio de pago próximo a vencer
   * @param {Object} client - Cliente
   * @param {Object} invoice - Factura
   * @param {number} daysUntilDue - Días hasta vencimiento
   */
  async sendPaymentReminder(client, invoice, daysUntilDue) {
    const message = this._generatePaymentReminderMessage(client, invoice, daysUntilDue);

    const results = {
      sms: null,
      whatsapp: null,
      notification: null
    };

    try {
      // Intentar enviar por WhatsApp primero (más económico)
      if (client.telefono || client.whatsapp) {
        const phone = client.whatsapp || client.telefono;

        try {
          results.whatsapp = await this.sendWhatsApp(phone, message);
        } catch (whatsappError) {
          // Si WhatsApp falla, intentar con SMS
          logger.warn(`WhatsApp falló, intentando SMS: ${whatsappError.message}`);
          try {
            results.sms = await this.sendSMS(phone, message);
          } catch (smsError) {
            logger.error(`SMS también falló: ${smsError.message}`);
          }
        }
      }

      // Crear notificación en sistema (siempre)
      results.notification = await notificationService.createAndSend({
        userId: client.userId,
        type: 'payment_reminder',
        priority: daysUntilDue <= 1 ? 'high' : 'medium',
        title: 'Recordatorio de Pago',
        message: `Factura #${invoice.numero_factura} vence ${daysUntilDue === 0 ? 'hoy' : `en ${daysUntilDue} día${daysUntilDue > 1 ? 's' : ''}`}`,
        metadata: {
          invoiceId: invoice.id,
          clientId: client.id,
          dueDate: invoice.fecha_vencimiento,
          amount: invoice.total
        },
        actionUrl: `/invoices/${invoice.id}`,
        actionLabel: 'Ver Factura',
        sendViaWebSocket: true
      });

      logger.info(` Recordatorio de pago enviado a cliente ${client.firstName} (Factura #${invoice.numero_factura})`);

      return results;

    } catch (error) {
      logger.error(`Error enviando recordatorio de pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía recordatorio de factura vencida
   * @param {Object} client - Cliente
   * @param {Object} invoice - Factura
   * @param {number} daysOverdue - Días de atraso
   */
  async sendOverdueInvoiceReminder(client, invoice, daysOverdue) {
    const message = this._generateOverdueReminderMessage(client, invoice, daysOverdue);

    const results = {
      sms: null,
      whatsapp: null,
      notification: null
    };

    try {
      // Enviar por WhatsApp/SMS
      if (client.telefono || client.whatsapp) {
        const phone = client.whatsapp || client.telefono;

        try {
          results.whatsapp = await this.sendWhatsApp(phone, message);
        } catch (whatsappError) {
          try {
            results.sms = await this.sendSMS(phone, message);
          } catch (smsError) {
            logger.error(`Error enviando mensaje: ${smsError.message}`);
          }
        }
      }

      // Crear notificación en sistema
      results.notification = await notificationService.createAndSend({
        userId: client.userId,
        type: 'invoice_overdue',
        priority: 'urgent',
        title: 'Factura Vencida',
        message: `Factura #${invoice.numero_factura} lleva ${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de atraso`,
        metadata: {
          invoiceId: invoice.id,
          clientId: client.id,
          dueDate: invoice.fecha_vencimiento,
          amount: invoice.total,
          daysOverdue: daysOverdue
        },
        actionUrl: `/invoices/${invoice.id}`,
        actionLabel: 'Pagar Ahora',
        sendViaWebSocket: true
      });

      logger.info(` Recordatorio de factura vencida enviado a cliente ${client.firstName}`);

      return results;

    } catch (error) {
      logger.error(`Error enviando recordatorio de factura vencida: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía recordatorio de renovación de servicio
   * @param {Object} client - Cliente
   * @param {Object} subscription - Suscripción
   * @param {number} daysUntilRenewal - Días hasta renovación
   */
  async sendRenewalReminder(client, subscription, daysUntilRenewal) {
    const message = this._generateRenewalReminderMessage(client, subscription, daysUntilRenewal);

    try {
      if (client.telefono || client.whatsapp) {
        const phone = client.whatsapp || client.telefono;
        await this.sendWhatsApp(phone, message);
      }

      await notificationService.createAndSend({
        userId: client.userId,
        type: 'service_renewal',
        priority: 'medium',
        title: 'Renovación de Servicio',
        message: `Tu servicio ${subscription.ServicePackage?.nombre || 'Internet'} se renueva ${daysUntilRenewal === 0 ? 'hoy' : `en ${daysUntilRenewal} días`}`,
        metadata: {
          subscriptionId: subscription.id,
          clientId: client.id,
          renewalDate: subscription.fecha_renovacion
        },
        sendViaWebSocket: true
      });

      logger.info(` Recordatorio de renovación enviado a cliente ${client.firstName}`);

    } catch (error) {
      logger.error(`Error enviando recordatorio de renovación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Programa recordatorios automáticos
   * Se ejecuta diariamente a las 9:00 AM
   */
  scheduleAutomaticReminders() {
    // Ejecutar todos los días a las 9:00 AM
    const job = cron.schedule('0 9 * * *', async () => {
      logger.info('ð Ejecutando tarea de recordatorios automáticos...');

      try {
        await this._processPaymentReminders();
        await this._processOverdueReminders();
        await this._processRenewalReminders();

        logger.info(' Recordatorios automáticos procesados exitosamente');

      } catch (error) {
        logger.error(`L Error procesando recordatorios automáticos: ${error.message}`);
      }
    });

    this.scheduledJobs.set('daily-reminders', job);
    logger.info(' Recordatorios automáticos programados (diario a las 9:00 AM)');

    return job;
  }

  /**
   * Procesa recordatorios de pagos próximos a vencer
   * @private
   */
  async _processPaymentReminders() {
    const { Op } = db.Sequelize;
    const today = new Date();
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    // Buscar facturas que vencen en 7, 3, o 1 días
    const upcomingInvoices = await db.Invoice.findAll({
      where: {
        estado: ['pendiente', 'parcial'],
        fecha_vencimiento: {
          [Op.between]: [today, in7Days]
        }
      },
      include: [{
        model: db.Client,
        attributes: ['id', 'nombre', 'telefono', 'whatsapp', 'userId']
      }]
    });

    for (const invoice of upcomingInvoices) {
      const daysUntilDue = Math.ceil((new Date(invoice.fecha_vencimiento) - today) / (1000 * 60 * 60 * 24));

      // Enviar recordatorio solo en días específicos (7, 3, 1, 0)
      if ([7, 3, 1, 0].includes(daysUntilDue)) {
        try {
          await this.sendPaymentReminder(invoice.Client, invoice, daysUntilDue);
        } catch (error) {
          logger.error(`Error enviando recordatorio para factura ${invoice.id}: ${error.message}`);
        }
      }
    }

    logger.info(`=ç Procesadas ${upcomingInvoices.length} facturas próximas a vencer`);
  }

  /**
   * Procesa recordatorios de facturas vencidas
   * @private
   */
  async _processOverdueReminders() {
    const { Op } = db.Sequelize;
    const today = new Date();

    // Buscar facturas vencidas
    const overdueInvoices = await db.Invoice.findAll({
      where: {
        estado: ['pendiente', 'parcial'],
        fecha_vencimiento: {
          [Op.lt]: today
        }
      },
      include: [{
        model: db.Client,
        attributes: ['id', 'nombre', 'telefono', 'whatsapp', 'userId']
      }]
    });

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.ceil((today - new Date(invoice.fecha_vencimiento)) / (1000 * 60 * 60 * 24));

      // Enviar recordatorio cada 3 días
      if (daysOverdue % 3 === 0) {
        try {
          await this.sendOverdueInvoiceReminder(invoice.Client, invoice, daysOverdue);
        } catch (error) {
          logger.error(`Error enviando recordatorio de vencimiento para factura ${invoice.id}: ${error.message}`);
        }
      }
    }

    logger.info(`=ç Procesadas ${overdueInvoices.length} facturas vencidas`);
  }

  /**
   * Procesa recordatorios de renovación de servicio
   * @private
   */
  async _processRenewalReminders() {
    const { Op } = db.Sequelize;
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    // Buscar suscripciones próximas a renovar
    const upcomingRenewals = await db.Subscription.findAll({
      where: {
        estado: 'activo',
        fecha_renovacion: {
          [Op.between]: [today, in7Days]
        }
      },
      include: [
        {
          model: db.Client,
          attributes: ['id', 'nombre', 'telefono', 'whatsapp', 'userId']
        },
        {
          model: db.ServicePackage,
          attributes: ['id', 'nombre', 'precio']
        }
      ]
    });

    for (const subscription of upcomingRenewals) {
      const daysUntilRenewal = Math.ceil((new Date(subscription.fecha_renovacion) - today) / (1000 * 60 * 60 * 24));

      // Enviar recordatorio solo en días específicos (7, 3, 1, 0)
      if ([7, 3, 1, 0].includes(daysUntilRenewal)) {
        try {
          await this.sendRenewalReminder(subscription.Client, subscription, daysUntilRenewal);
        } catch (error) {
          logger.error(`Error enviando recordatorio de renovación para suscripción ${subscription.id}: ${error.message}`);
        }
      }
    }

    logger.info(`=ç Procesadas ${upcomingRenewals.length} renovaciones próximas`);
  }

  /**
   * Genera mensaje de recordatorio de pago
   * @private
   */
  _generatePaymentReminderMessage(client, invoice, daysUntilDue) {
    const dueText = daysUntilDue === 0
      ? 'vence HOY'
      : daysUntilDue === 1
        ? 'vence MAÑANA'
        : `vence en ${daysUntilDue} días`;

    return `
Hola ${client.firstName} =K

Te recordamos que tu factura #${invoice.numero_factura} ${dueText}.

=° Monto: $${invoice.total}
=Å Fecha de vencimiento: ${new Date(invoice.fecha_vencimiento).toLocaleDateString('es-MX')}

Para evitar suspensión del servicio, te pedimos realizar el pago lo antes posible.

¡Gracias por tu preferencia! =L
    `.trim();
  }

  /**
   * Genera mensaje de recordatorio de factura vencida
   * @private
   */
  _generateOverdueReminderMessage(client, invoice, daysOverdue) {
    return `
Hola ${client.firstName} =K

Tu factura #${invoice.numero_factura} lleva ${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de atraso.

=° Monto: $${invoice.total}
=Å Fecha de vencimiento: ${new Date(invoice.fecha_vencimiento).toLocaleDateString('es-MX')}

  Tu servicio puede ser suspendido si no realizas el pago pronto.

Por favor, ponte al corriente lo antes posible.

¡Gracias! =L
    `.trim();
  }

  /**
   * Genera mensaje de recordatorio de renovación
   * @private
   */
  _generateRenewalReminderMessage(client, subscription, daysUntilRenewal) {
    const renewalText = daysUntilRenewal === 0
      ? 'se renueva HOY'
      : daysUntilRenewal === 1
        ? 'se renueva MAÑANA'
        : `se renueva en ${daysUntilRenewal} días`;

    return `
Hola ${client.firstName} =K

Tu servicio de ${subscription.ServicePackage?.nombre || 'Internet'} ${renewalText}.

=Å Fecha de renovación: ${new Date(subscription.fecha_renovacion).toLocaleDateString('es-MX')}
=° Costo: $${subscription.ServicePackage?.precio || subscription.precio}

Recuerda tener saldo disponible para continuar disfrutando del servicio sin interrupciones.

¡Gracias por confiar en nosotros! =L
    `.trim();
  }

  /**
   * Normaliza número de teléfono al formato E.164
   * @private
   */
  _normalizePhoneNumber(phone) {
    // Eliminar espacios, guiones, paréntesis
    let normalized = phone.replace(/[\s\-\(\)]/g, '');

    // Si no empieza con +, agregar código de país (México por defecto)
    if (!normalized.startsWith('+')) {
      // Si tiene 10 dígitos, agregar +52 (México)
      if (normalized.length === 10) {
        normalized = `+52${normalized}`;
      } else if (normalized.length === 12 && normalized.startsWith('52')) {
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Registra mensaje enviado en la base de datos
   * @private
   */
  async _logMessage(data) {
    try {
      // Verificar si existe la tabla MessageLog
      if (db.MessageLog) {
        await db.MessageLog.create({
          type: data.type,
          to: data.to,
          message: data.message,
          status: data.status,
          providerId: data.providerId || null,
          provider: data.provider,
          error: data.error || null,
          sentAt: new Date()
        });
      } else {
        // Si no existe la tabla, solo registrar en logs
        logger.info(`Mensaje ${data.type} enviado a ${data.to}: ${data.status}`);
      }
    } catch (error) {
      logger.error(`Error registrando mensaje en BD: ${error.message}`);
    }
  }

  /**
   * Detiene todos los trabajos programados
   */
  stopAllScheduledJobs() {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      logger.info(`ù  Trabajo programado detenido: ${name}`);
    });

    this.scheduledJobs.clear();
  }

  /**
   * Obtiene estadísticas de mensajes enviados
   */
  async getMessagingStats(days = 30) {
    try {
      if (!db.MessageLog) {
        return {
          total: 0,
          sms: 0,
          whatsapp: 0,
          sent: 0,
          failed: 0
        };
      }

      const { Op } = db.Sequelize;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await db.MessageLog.findAll({
        where: {
          sentAt: {
            [Op.gte]: startDate
          }
        },
        attributes: [
          'type',
          'status',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['type', 'status'],
        raw: true
      });

      const result = {
        total: 0,
        sms: 0,
        whatsapp: 0,
        sent: 0,
        failed: 0
      };

      stats.forEach(stat => {
        result.total += parseInt(stat.count);

        if (stat.type === 'sms') {
          result.sms += parseInt(stat.count);
        } else if (stat.type === 'whatsapp') {
          result.whatsapp += parseInt(stat.count);
        }

        if (stat.status === 'sent') {
          result.sent += parseInt(stat.count);
        } else if (stat.status === 'failed') {
          result.failed += parseInt(stat.count);
        }
      });

      return result;

    } catch (error) {
      logger.error(`Error obteniendo estadísticas de mensajería: ${error.message}`);
      return {
        total: 0,
        sms: 0,
        whatsapp: 0,
        sent: 0,
        failed: 0
      };
    }
  }
}

// Exportar instancia singleton
module.exports = new RemindersService();
