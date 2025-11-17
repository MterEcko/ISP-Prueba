// backend/src/controllers/reminders.controller.js
const remindersService = require('../services/reminders.service');
const db = require('../models');
const logger = require('../utils/logger');

/**
 * Controlador de recordatorios automáticos
 */
class RemindersController {
  /**
   * Envía un SMS manual
   * POST /api/reminders/send-sms
   * Body: { to, message }
   */
  async sendSMS(req, res) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'Número de teléfono y mensaje son requeridos'
        });
      }

      if (!remindersService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de SMS no disponible. Verifica la configuración de Twilio.'
        });
      }

      const result = await remindersService.sendSMS(to, message);

      return res.status(200).json({
        success: true,
        data: result,
        message: 'SMS enviado exitosamente'
      });

    } catch (error) {
      logger.error(`Error enviando SMS: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error enviando SMS',
        error: error.message
      });
    }
  }

  /**
   * Envía un mensaje de WhatsApp manual
   * POST /api/reminders/send-whatsapp
   * Body: { to, message }
   */
  async sendWhatsApp(req, res) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'Número de teléfono y mensaje son requeridos'
        });
      }

      if (!remindersService.isAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de WhatsApp no disponible. Verifica la configuración de Twilio.'
        });
      }

      const result = await remindersService.sendWhatsApp(to, message);

      return res.status(200).json({
        success: true,
        data: result,
        message: 'WhatsApp enviado exitosamente'
      });

    } catch (error) {
      logger.error(`Error enviando WhatsApp: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error enviando WhatsApp',
        error: error.message
      });
    }
  }

  /**
   * Envía recordatorio de pago a un cliente específico
   * POST /api/reminders/payment-reminder/:invoiceId
   */
  async sendPaymentReminder(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await db.Invoice.findOne({
        where: { id: invoiceId },
        include: [{
          model: db.Client,
          attributes: ['id', 'nombre', 'telefono', 'whatsapp', 'userId']
        }]
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      if (!invoice.Client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const today = new Date();
      const daysUntilDue = Math.ceil((new Date(invoice.fecha_vencimiento) - today) / (1000 * 60 * 60 * 24));

      const result = await remindersService.sendPaymentReminder(
        invoice.Client,
        invoice,
        Math.max(0, daysUntilDue)
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Recordatorio de pago enviado'
      });

    } catch (error) {
      logger.error(`Error enviando recordatorio de pago: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error enviando recordatorio de pago',
        error: error.message
      });
    }
  }

  /**
   * Envía recordatorio de factura vencida
   * POST /api/reminders/overdue-reminder/:invoiceId
   */
  async sendOverdueReminder(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await db.Invoice.findOne({
        where: { id: invoiceId },
        include: [{
          model: db.Client,
          attributes: ['id', 'nombre', 'telefono', 'whatsapp', 'userId']
        }]
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      if (!invoice.Client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const today = new Date();
      const daysOverdue = Math.max(0, Math.ceil((today - new Date(invoice.fecha_vencimiento)) / (1000 * 60 * 60 * 24)));

      const result = await remindersService.sendOverdueInvoiceReminder(
        invoice.Client,
        invoice,
        daysOverdue
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Recordatorio de factura vencida enviado'
      });

    } catch (error) {
      logger.error(`Error enviando recordatorio de vencimiento: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error enviando recordatorio de vencimiento',
        error: error.message
      });
    }
  }

  /**
   * Ejecuta proceso de recordatorios automáticos manualmente
   * POST /api/reminders/process-automatic
   */
  async processAutomaticReminders(req, res) {
    try {
      // Esta función es una wrapper para ejecutar los recordatorios manualmente
      // Los métodos internos son privados, así que llamamos al servicio directamente

      logger.info('ð Ejecutando recordatorios automáticos manualmente...');

      // Ejecutar procesos de recordatorios
      await remindersService._processPaymentReminders();
      await remindersService._processOverdueReminders();
      await remindersService._processRenewalReminders();

      return res.status(200).json({
        success: true,
        message: 'Recordatorios automáticos procesados exitosamente'
      });

    } catch (error) {
      logger.error(`Error procesando recordatorios automáticos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error procesando recordatorios automáticos',
        error: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas de mensajería
   * GET /api/reminders/stats?days=30
   */
  async getMessagingStats(req, res) {
    try {
      const { days } = req.query;
      const daysInt = days ? parseInt(days) : 30;

      const stats = await remindersService.getMessagingStats(daysInt);

      return res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas de mensajería obtenidas'
      });

    } catch (error) {
      logger.error(`Error obteniendo estadísticas: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }

  /**
   * Obtiene el historial de mensajes enviados
   * GET /api/reminders/messages?limit=50&offset=0&type=sms&status=sent
   */
  async getMessagesLog(req, res) {
    try {
      const { limit, offset, type, status, clientId } = req.query;

      const where = {};
      if (type) where.type = type;
      if (status) where.status = status;
      if (clientId) where.clientId = parseInt(clientId);

      const { count, rows } = await db.MessageLog.findAndCountAll({
        where,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        order: [['sentAt', 'DESC']],
        include: [
          {
            model: db.Client,
            as: 'client',
            attributes: ['id', 'nombre'],
            required: false
          },
          {
            model: db.Invoice,
            as: 'invoice',
            attributes: ['id', 'numero_factura'],
            required: false
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: {
          messages: rows,
          total: count,
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0
        }
      });

    } catch (error) {
      logger.error(`Error obteniendo historial de mensajes: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo historial de mensajes',
        error: error.message
      });
    }
  }

  /**
   * Verifica el estado del servicio de Twilio
   * GET /api/reminders/service-status
   */
  async getServiceStatus(req, res) {
    try {
      const isAvailable = remindersService.isAvailable();
      const config = {
        accountSid: remindersService.twilioConfig.accountSid ? '***' + remindersService.twilioConfig.accountSid.slice(-4) : 'No configurado',
        phoneNumber: remindersService.twilioConfig.phoneNumber || 'No configurado',
        whatsappNumber: remindersService.twilioConfig.whatsappNumber || 'No configurado'
      };

      return res.status(200).json({
        success: true,
        data: {
          available: isAvailable,
          config: config,
          scheduledJobs: remindersService.scheduledJobs.size
        },
        message: isAvailable
          ? 'Servicio de recordatorios disponible'
          : 'Servicio de recordatorios no disponible. Verifica la configuración.'
      });

    } catch (error) {
      logger.error(`Error verificando estado del servicio: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error verificando estado del servicio',
        error: error.message
      });
    }
  }
}

module.exports = new RemindersController();
