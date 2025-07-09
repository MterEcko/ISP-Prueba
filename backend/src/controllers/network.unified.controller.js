// controllers/network.unified.controller.js
const NetworkService = require('../apis/services/network.service');
const logger = require('../utils/logger');

/**
 * Controlador unificado para operaciones de red
 * Proporciona una interfaz para gestionar dispositivos de diferentes fabricantes
 */
const NetworkUnifiedController = {
  /**
   * Obtiene información detallada de un dispositivo
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getDeviceInfo: async (req, res) => {
    try {
      const deviceId = req.params.id;
      
      const result = await NetworkService.getDeviceInfo(deviceId);
      
      return res.status(200).json({
        success: true,
        device: result.device,
        status: result.status,
        info: result.info
      });
    } catch (error) {
      logger.error(`Error en getDeviceInfo: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del dispositivo',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene recursos del sistema de un dispositivo
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getDeviceSystemResources: async (req, res) => {
    try {
      const deviceId = req.params.id;
      
      const result = await NetworkService.getDeviceSystemResources(deviceId);
      
      return res.status(200).json({
        success: true,
        device: result.device,
        status: result.status,
        resources: result.resources
      });
    } catch (error) {
      logger.error(`Error en getDeviceSystemResources: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener recursos del sistema',
        error: error.message
      });
    }
  },
  
  /**
   * Configura una conexión para un cliente en un dispositivo
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  configureClientConnection: async (req, res) => {
    try {
      const { clientId, deviceId } = req.params;
      const config = req.body;
      
      // Validar datos mínimos requeridos
      if (!config.username || !config.password) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren username y password para configurar la conexión'
        });
      }
      
      const result = await NetworkService.configureClientConnection(
        clientId,
        deviceId,
        config
      );
      
      return res.status(201).json({
        success: true,
        message: 'Conexión configurada exitosamente',
        clientNetwork: result.clientNetwork,
        connectionDetails: result.connectionResult
      });
    } catch (error) {
      logger.error(`Error en configureClientConnection: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar conexión del cliente',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una conexión de cliente existente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  updateClientConnection: async (req, res) => {
    try {
      const { clientNetworkId } = req.params;
      const config = req.body;
      
      const result = await NetworkService.updateClientConnection(
        clientNetworkId,
        config
      );
      
      return res.status(200).json({
        success: true,
        message: 'Conexión actualizada exitosamente',
        clientNetwork: result.clientNetwork,
        updateDetails: result.updateResult
      });
    } catch (error) {
      logger.error(`Error en updateClientConnection: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar conexión del cliente',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina una conexión de cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  removeClientConnection: async (req, res) => {
    try {
      const { clientNetworkId } = req.params;
      
      const result = await NetworkService.removeClientConnection(clientNetworkId);
      
      return res.status(200).json({
        success: true,
        message: 'Conexión eliminada exitosamente',
        details: result.deleteResult
      });
    } catch (error) {
      logger.error(`Error en removeClientConnection: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar conexión del cliente',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene estadísticas de tráfico para una conexión de cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getClientTrafficStats: async (req, res) => {
    try {
      const { clientNetworkId } = req.params;
      
      const result = await NetworkService.getClientTrafficStats(clientNetworkId);
      
      return res.status(200).json({
        success: true,
        clientNetwork: result.clientNetwork,
        statistics: result.stats
      });
    } catch (error) {
      logger.error(`Error en getClientTrafficStats: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tráfico',
        error: error.message
      });
    }
  },
  
  /**
   * Ejecuta una acción en un dispositivo
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  executeDeviceAction: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { action, params } = req.body;
      
      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere especificar la acción a ejecutar'
        });
      }
      
      const result = await NetworkService.executeDeviceAction(
        deviceId,
        action,
        params
      );
      
      return res.status(200).json({
        success: true,
        action: result.action,
        result: result.result
      });
    } catch (error) {
      logger.error(`Error en executeDeviceAction: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al ejecutar acción en el dispositivo',
        error: error.message
      });
    }
  }
};

module.exports = NetworkUnifiedController;