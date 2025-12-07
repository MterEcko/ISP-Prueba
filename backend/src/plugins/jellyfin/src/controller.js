const JellyfinPlugin = require('./index');
const logger = require('../../../config/logger');

let pluginInstance = null;

exports.setPluginInstance = (instance) => {
  pluginInstance = instance;
};

function getPlugin() {
  if (!pluginInstance) {
    throw new Error('Plugin Jellyfin no esta activado');
  }
  return pluginInstance;
}

exports.createUser = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.createUser(username, password, email);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en createUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.assignLibraries = async (req, res) => {
  try {
    const { userId, libraryIds } = req.body;

    if (!userId || !libraryIds) {
      return res.status(400).json({
        success: false,
        message: 'UserId y libraryIds son requeridos'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.assignLibraries(userId, libraryIds);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en assignLibraries:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId es requerido'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.suspendUser(userId);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en suspendUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId es requerido'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.activateUser(userId);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en activateUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId es requerido'
      });
    }

    const plugin = getPlugin();
    const result = await plugin.deleteUser(userId);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en deleteUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getLibraries = async (req, res) => {
  try {
    const plugin = getPlugin();
    const libraries = await plugin.getLibraries();

    return res.status(200).json({
      success: true,
      libraries
    });
  } catch (error) {
    logger.error('Error en getLibraries:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const plugin = getPlugin();
    const stats = await plugin.getStatistics();

    return res.status(200).json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('Error en getStatistics:', error);
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
    logger.error('Error en getStatus:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const plugin = getPlugin();
    const result = await plugin.testConnection();

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error en testConnection:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
