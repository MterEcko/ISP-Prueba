const WhatsAppMetaPlugin = require('./index');
const logger = require('../../../config/logger');

let pluginInstance = null;

exports.setPluginInstance = (instance) => {
  pluginInstance = instance;
};

function getPlugin() {
  if (!pluginInstance) {
    throw new Error('Plugin WhatsApp Meta no está activado');
  }
  return pluginInstance;
}

exports.sendMessage = async (req, res) => {
  try {
    const { to, message, mediaUrl, mediaType } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono y mensaje son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendMessage(to, message, { mediaUrl, mediaType });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendTemplate = async (req, res) => {
  try {
    const { to, templateName, languageCode, components } = req.body;

    if (!to || !templateName || !languageCode) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono, nombre de template y código de idioma son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendTemplate(to, templateName, languageCode, components || []);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendTemplate:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendInteractiveMessage = async (req, res) => {
  try {
    const { to, type, data } = req.body;

    if (!to || !type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono, tipo y datos son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendInteractiveMessage(to, type, data);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendInteractiveMessage:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

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
    const results = await plugin.sendBulkMessages(recipients, message, { mediaUrl, delayMs });

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

exports.verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const plugin = getPlugin();
    const result = await plugin.verifyWebhook(mode, token, challenge);

    if (result) {
      return res.status(200).send(result);
    }

    return res.status(403).send('Forbidden');
  } catch (error) {
    logger.error('Error en verifyWebhook:', error);
    return res.status(500).send('Error');
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    logger.info('Webhook recibido de Meta');

    const plugin = getPlugin();
    await plugin.processWebhook(req.body);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error procesando webhook:', error);
    return res.status(200).json({ success: false });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const plugin = getPlugin();
    const result = await plugin.testConnection();

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error en test:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

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
