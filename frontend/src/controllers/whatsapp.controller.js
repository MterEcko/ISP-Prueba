const whatsappService = require('../services/whatsapp.service');
const logger = require('../config/logger');

/**
 * Webhook de verificacion de WhatsApp (Meta API)
 * GET /api/whatsapp/webhook
 */
exports.verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Token de verificacion (debe configurarse en Meta Business)
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'ISP_WEBHOOK_TOKEN_2024';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('Webhook de WhatsApp verificado correctamente');
      return res.status(200).send(challenge);
    } else {
      logger.warn('Verificacion de webhook fallida');
      return res.sendStatus(403);
    }
  } catch (error) {
    logger.error('Error en verificacion de webhook:', error);
    return res.sendStatus(500);
  }
};

/**
 * Recibir mensajes de WhatsApp
 * POST /api/whatsapp/webhook
 */
exports.receiveMessage = async (req, res) => {
  try {
    const webhookData = req.body;

    logger.info('Webhook de WhatsApp recibido');

    // Procesar webhook
    const result = await whatsappService.processWebhook(webhookData);

    if (result) {
      logger.info(`Mensaje de WhatsApp procesado: ${result.client?.email}`);
    }

    // Responder inmediatamente a WhatsApp (200 OK)
    return res.sendStatus(200);
  } catch (error) {
    logger.error('Error procesando webhook de WhatsApp:', error);
    // Aun asi responder 200 para evitar reintentos
    return res.sendStatus(200);
  }
};

/**
 * Enviar mensaje de WhatsApp
 * POST /api/whatsapp/send
 */
exports.sendMessage = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefono y mensaje son requeridos'
      });
    }

    const result = await whatsappService.sendMessage(phoneNumber, message);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Mensaje enviado correctamente'
    });
  } catch (error) {
    logger.error('Error enviando mensaje de WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando mensaje',
      error: error.message
    });
  }
};

/**
 * Enviar mensaje masivo
 * POST /api/whatsapp/send-bulk
 */
exports.sendBulkMessages = async (req, res) => {
  try {
    const { phoneNumbers, message, delayMs } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Numeros de telefono (array) y mensaje son requeridos'
      });
    }

    const result = await whatsappService.sendBulkMessages(phoneNumbers, message, { delayMs });

    return res.status(200).json({
      success: true,
      data: result,
      message: `Enviados: ${result.sent}/${result.total}`
    });
  } catch (error) {
    logger.error('Error en envio masivo de WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en envio masivo',
      error: error.message
    });
  }
};

/**
 * Enviar template
 * POST /api/whatsapp/send-template
 */
exports.sendTemplate = async (req, res) => {
  try {
    const { phoneNumber, templateName, languageCode, components } = req.body;

    if (!phoneNumber || !templateName) {
      return res.status(400).json({
        success: false,
        message: 'Numero de telefono y nombre de template son requeridos'
      });
    }

    const result = await whatsappService.sendTemplate(
      phoneNumber,
      templateName,
      languageCode || 'es',
      components || []
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Template enviado correctamente'
    });
  } catch (error) {
    logger.error('Error enviando template de WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando template',
      error: error.message
    });
  }
};

/**
 * Obtener estado del servicio
 * GET /api/whatsapp/status
 */
exports.getStatus = async (req, res) => {
  try {
    const status = await whatsappService.getStatus();

    return res.status(200).json(status);
  } catch (error) {
    logger.error('Error obteniendo estado de WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estado',
      error: error.message
    });
  }
};
