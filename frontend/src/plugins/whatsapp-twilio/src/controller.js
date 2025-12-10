// backend/src/plugins/whatsapp-twilio/src/controller.js
const WhatsAppTwilioPlugin = require('./index');
const logger = require('../../../config/logger');

// Instancia del plugin (será inicializada por el sistema de plugins)
let pluginInstance = null;

/**
 * Establecer instancia del plugin
 */
exports.setPluginInstance = (instance) => {
  pluginInstance = instance;
};

/**
 * Obtener instancia del plugin
 */
function getPlugin() {
  if (!pluginInstance) {
    throw new Error('Plugin WhatsApp Twilio no está activado');
  }
  return pluginInstance;
}

/**
 * Enviar mensaje
 */
exports.sendMessage = async (req, res) => {
  try {
    const { to, message, mediaUrl } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono y mensaje son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendMessage(to, message, { mediaUrl });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Envío masivo de mensajes
 */
exports.sendBulkMessages = async (req, res) => {
  try {
    const { recipients, message, mediaUrl, delayMs } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de destinatarios es requerida'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Mensaje es requerido'
      });
    }

    const plugin = getPlugin();
    const results = await plugin.sendBulkMessages(
      recipients,
      message,
      { mediaUrl, delayMs }
    );

    return res.status(200).json({
      success: true,
      ...results
    });
  } catch (error) {
    logger.error('Error en sendBulkMessages:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Manejar webhook de Twilio
 */
exports.handleWebhook = async (req, res) => {
  try {
    logger.info('📨 Webhook recibido de Twilio');

    const plugin = getPlugin();
    const result = await plugin.processWebhook(req.body);

    // Twilio espera una respuesta TwiML o 200 OK
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('Error procesando webhook:', error);

    // Aún así devolver 200 para no que Twilio no reintente
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
};

/**
 * Probar conexión
 */
exports.testConnection = async (req, res) => {
  try {
    const { testPhoneNumber } = req.body;

    if (!testPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número de prueba es requerido'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.testConnection(testPhoneNumber);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en test:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener estado del plugin
 */
exports.getStatus = async (req, res) => {
  try {
    const plugin = getPlugin();
    const status = plugin.getStatus();

    return res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Error obteniendo estado:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener estadísticas
 */
exports.getStatistics = async (req, res) => {
  try {
    const { days } = req.query;

    const plugin = getPlugin();
    const stats = await plugin.getStatistics(parseInt(days) || 30);

    return res.status(200).json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener estado de un mensaje
 */
exports.getMessageStatus = async (req, res) => {
  try {
    const { messageSid } = req.params;

    if (!messageSid) {
      return res.status(400).json({
        success: false,
        message: 'Message SID es requerido'
      });
    }

    const plugin = getPlugin();
    const status = await plugin.getMessageStatus(messageSid);

    return res.status(200).json({
      success: true,
      messageStatus: status
    });
  } catch (error) {
    logger.error('Error obteniendo estado de mensaje:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
