// backend/src/controllers/pluginService.controller.js
const pluginServiceDiscovery = require('../services/pluginService.discovery');
const logger = require('../utils/logger');

/**
 * Obtiene todos los plugins de servicio disponibles
 * GET /api/plugin-services/available
 */
exports.getAvailableServices = async (req, res) => {
  try {
    const services = await pluginServiceDiscovery.discoverServicePlugins();

    return res.status(200).json({
      success: true,
      data: services,
      message: `${services.length} plugin(s) de servicio encontrados`
    });
  } catch (error) {
    logger.error(`Error obteniendo servicios disponibles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo servicios disponibles'
    });
  }
};

/**
 * Obtiene la configuración de un plugin de servicio específico
 * GET /api/plugin-services/:pluginName
 */
exports.getServiceConfig = async (req, res) => {
  try {
    const { pluginName } = req.params;

    const serviceConfig = pluginServiceDiscovery.getServicePlugin(pluginName);

    if (!serviceConfig) {
      return res.status(404).json({
        success: false,
        message: `Plugin de servicio '${pluginName}' no encontrado`
      });
    }

    return res.status(200).json({
      success: true,
      data: serviceConfig
    });
  } catch (error) {
    logger.error(`Error obteniendo configuración del servicio: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración del servicio'
    });
  }
};

/**
 * Valida la configuración de un servicio
 * POST /api/plugin-services/validate
 */
exports.validateServiceConfig = async (req, res) => {
  try {
    const { pluginName, config } = req.body;

    if (!pluginName || !config) {
      return res.status(400).json({
        success: false,
        message: 'Plugin name y config son requeridos'
      });
    }

    const validation = pluginServiceDiscovery.validateServiceConfig(pluginName, config);

    return res.status(200).json({
      success: validation.valid,
      data: validation,
      message: validation.valid ? 'Configuración válida' : 'Configuración inválida'
    });
  } catch (error) {
    logger.error(`Error validando configuración: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error validando configuración'
    });
  }
};
