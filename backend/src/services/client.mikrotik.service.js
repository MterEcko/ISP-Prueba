// Controlador para la integración de clientes con Mikrotik
const ClientMikrotikService = require('../services/client.mikrotik.service');
const logger = require('../utils/logger');

const ClientMikrotikController = {
  /**
   * Crear un usuario PPPoE para un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  createClientPPPoE: async (req, res) => {
    try {
      const { clientId, deviceId } = req.params;
      const pppoeData = req.body;
      
      // Validar datos requeridos
      if (!pppoeData.password || !pppoeData.profile) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren password y profile para crear un usuario PPPoE'
        });
      }
      
      const result = await ClientMikrotikService.createClientPPPoE(clientId, deviceId, pppoeData);
      
      return res.status(201).json(result);
    } catch (error) {
      logger.error(`Error al crear usuario PPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al crear usuario PPPoE',
        error: error.message
      });
    }
  },
  
  /**
   * Actualizar un usuario PPPoE de un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  updateClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;
      const pppoeData = req.body;
      
      const result = await ClientMikrotikService.updateClientPPPoE(clientId, pppoeData);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al actualizar usuario PPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario PPPoE',
        error: error.message
      });
    }
  },
  
  /**
   * Eliminar un usuario PPPoE de un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  deleteClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const result = await ClientMikrotikService.deleteClientPPPoE(clientId);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al eliminar usuario PPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario PPPoE',
        error: error.message
      });
    }
  },
  
  /**
   * Configurar límites de ancho de banda para un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  setClientBandwidth: async (req, res) => {
    try {
      const { clientId } = req.params;
      const qosData = req.body;
      
      // Validar datos requeridos
      if (!qosData.downloadSpeed || !qosData.uploadSpeed) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren downloadSpeed y uploadSpeed para configurar ancho de banda'
        });
      }
      
      const result = await ClientMikrotikService.setClientBandwidthLimits(clientId, qosData);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al configurar ancho de banda: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar límites de ancho de banda',
        error: error.message
      });
    }
  },
  
  /**
   * Obtener estadísticas de tráfico para un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  getClientTrafficStats: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const result = await ClientMikrotikService.getClientTrafficStats(clientId);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al obtener estadísticas de tráfico: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tráfico',
        error: error.message
      });
    }
  },
  
  /**
   * Reiniciar la sesión PPPoE de un cliente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  restartClientPPPoESession: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const result = await ClientMikrotikService.restartClientPPPoESession(clientId);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al reiniciar sesión PPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al reiniciar sesión PPPoE',
        error: error.message
      });
    }
  },
  
  /**
   * Sincronizar todos los clientes con Mikrotik
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  syncAllClientsWithMikrotik: async (req, res) => {
    try {
      const result = await ClientMikrotikService.syncAllClientsWithMikrotik();
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error al sincronizar clientes: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al sincronizar clientes con Mikrotik',
        error: error.message
      });
    }
  }
};

module.exports = ClientMikrotikController;