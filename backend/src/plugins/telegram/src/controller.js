const TelegramPlugin = require('./index');
const logger = require('../../../config/logger');

let pluginInstance = null;

exports.setPluginInstance = (instance) => {
  pluginInstance = instance;
};

function getPlugin() {
  if (!pluginInstance) {
    throw new Error('Plugin Telegram no esta activado');
  }
  return pluginInstance;
}

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, message, options } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: 'ChatId y mensaje son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendMessage(chatId, message, options || {});

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendPhoto = async (req, res) => {
  try {
    const { chatId, photoUrl, caption } = req.body;

    if (!chatId || !photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'ChatId y photoUrl son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendPhoto(chatId, photoUrl, caption || '');

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendPhoto:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.sendFile = async (req, res) => {
  try {
    const { chatId, fileUrl, caption } = req.body;

    if (!chatId || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'ChatId y fileUrl son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.sendFile(chatId, fileUrl, caption || '');

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en sendFile:', error);
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
    logger.error('Error obteniendo estadisticas:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFileLink = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'FileId es requerido'
      });
    }

    const plugin = getPlugin();
    const fileLink = await plugin.getFileLink(fileId);

    return res.status(200).json({
      success: true,
      fileLink
    });
  } catch (error) {
    logger.error('Error obteniendo enlace de archivo:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
