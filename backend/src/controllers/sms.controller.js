const smsService = require('../services/sms.service');
const logger = require('../config/logger');

/**
 * Enviar SMS simple
 * POST /api/sms/send
 */
exports.sendSMS = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefono y mensaje son requeridos'
      });
    }

    const result = await smsService.sendSMS(phoneNumber, message);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'SMS enviado correctamente'
    });
  } catch (error) {
    logger.error('Error enviando SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando SMS',
      error: error.message
    });
  }
};

/**
 * Enviar SMS usando template
 * POST /api/sms/send-template
 */
exports.sendSMSWithTemplate = async (req, res) => {
  try {
    const { phoneNumber, templateId, variables, clientId } = req.body;

    if (!phoneNumber || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefono y ID de template son requeridos'
      });
    }

    const result = await smsService.sendSMSWithTemplate(
      phoneNumber,
      templateId,
      variables || {},
      clientId
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'SMS enviado correctamente'
    });
  } catch (error) {
    logger.error('Error enviando SMS con template:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando SMS con template',
      error: error.message
    });
  }
};

/**
 * Enviar recordatorio de pago via SMS
 * POST /api/sms/payment-reminder
 */
exports.sendPaymentReminder = async (req, res) => {
  try {
    const { clientId, invoiceData } = req.body;

    if (!clientId || !invoiceData) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente y datos de factura son requeridos'
      });
    }

    const result = await smsService.sendPaymentReminder(clientId, invoiceData);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Recordatorio de pago enviado'
    });
  } catch (error) {
    logger.error('Error enviando recordatorio de pago:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando recordatorio de pago',
      error: error.message
    });
  }
};

/**
 * Enviar notificacion de mantenimiento de red
 * POST /api/sms/network-maintenance
 */
exports.sendNetworkMaintenance = async (req, res) => {
  try {
    const { phoneNumbers, maintenanceInfo } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !maintenanceInfo) {
      return res.status(400).json({
        success: false,
        message: 'Numeros de telefono (array) e informacion de mantenimiento son requeridos'
      });
    }

    const result = await smsService.sendNetworkMaintenanceNotification(
      phoneNumbers,
      maintenanceInfo
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: `Notificaciones enviadas: ${result.sent}/${result.total}`
    });
  } catch (error) {
    logger.error('Error enviando notificacion de mantenimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando notificaciones',
      error: error.message
    });
  }
};

/**
 * Enviar SMS masivo
 * POST /api/sms/send-bulk
 */
exports.sendBulkSMS = async (req, res) => {
  try {
    const { phoneNumbers, message, delayMs } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Numeros de telefono (array) y mensaje son requeridos'
      });
    }

    const result = await smsService.sendBulkSMS(phoneNumbers, message, { delayMs });

    return res.status(200).json({
      success: true,
      data: result,
      message: `SMS enviados: ${result.sent}/${result.total}`
    });
  } catch (error) {
    logger.error('Error en envio masivo de SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en envio masivo',
      error: error.message
    });
  }
};

/**
 * Obtener estado del gateway SMS
 * GET /api/sms/status
 */
exports.getStatus = async (req, res) => {
  try {
    const status = await smsService.getGatewayStatus();

    return res.status(200).json(status);
  } catch (error) {
    logger.error('Error obteniendo estado del gateway SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estado',
      error: error.message
    });
  }
};
