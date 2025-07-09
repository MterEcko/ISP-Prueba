// controllers/client.mikrotik.controller.js - Controlador actualizado para usar el nuevo servicio
const ClientMikrotikService = require('../services/client.mikrotik.service');
const logger = require('../utils/logger');

const ClientMikrotikController = {
  /**
   * Crear un usuario PPPoE para un cliente en un dispositivo específico
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  createClientPPPoE: async (req, res) => {
    try {
      const { clientId, deviceId } = req.params;
      const pppoeData = req.body;

      logger.info(`Controlador: Creando usuario PPPoE para cliente ${clientId} en dispositivo ${deviceId}`);

      // Validar datos requeridos
      if (!pppoeData.password) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere password para crear un usuario PPPoE'
        });
      }

      // Validar que se proporcione profileId O profileName
      if (!pppoeData.profileId && !pppoeData.profileName && !pppoeData.useServicePackageProfile) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere profileId, profileName o useServicePackageProfile=true'
        });
      }

      const result = await ClientMikrotikService.createClientPPPoE(clientId, deviceId, pppoeData);

      return res.status(201).json(result);
    } catch (error) {
      logger.error(`Error en createClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al crear usuario PPPoE para el cliente',
        error: error.message
      });
    }
  },

  /**
   * Actualizar un usuario PPPoE de un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  updateClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;
      const pppoeData = req.body;

      logger.info(`Controlador: Actualizando usuario PPPoE para cliente ${clientId}`);

      const result = await ClientMikrotikService.updateClientPPPoE(clientId, pppoeData);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en updateClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario PPPoE del cliente',
        error: error.message
      });
    }
  },

  /**
   * Eliminar un usuario PPPoE de un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  deleteClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;

      logger.info(`Controlador: Eliminando usuario PPPoE para cliente ${clientId}`);

      const result = await ClientMikrotikService.deleteClientPPPoE(clientId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en deleteClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario PPPoE del cliente',
        error: error.message
      });
    }
  },

  /**
   * Configurar límites de ancho de banda para un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  setClientBandwidth: async (req, res) => {
    try {
      const { clientId } = req.params;
      const qosData = req.body;

      logger.info(`Controlador: Configurando límites de ancho de banda para cliente ${clientId}`);

      // Validar datos requeridos
      if (!qosData.downloadSpeed || !qosData.uploadSpeed) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren downloadSpeed y uploadSpeed'
        });
      }

      const result = await ClientMikrotikService.setClientBandwidthLimits(clientId, qosData);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en setClientBandwidth: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar límites de ancho de banda',
        error: error.message
      });
    }
  },

  /**
   * Obtener estadísticas de tráfico para un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  getClientTrafficStats: async (req, res) => {
    try {
      const { clientId } = req.params;

      logger.info(`Controlador: Obteniendo estadísticas de tráfico para cliente ${clientId}`);

      const result = await ClientMikrotikService.getClientTrafficStats(clientId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en getClientTrafficStats: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tráfico del cliente',
        error: error.message
      });
    }
  },

  /**
   * Reiniciar la sesión PPPoE de un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  restartClientPPPoESession: async (req, res) => {
    try {
      const { clientId } = req.params;

      logger.info(`Controlador: Reiniciando sesión PPPoE para cliente ${clientId}`);

      const result = await ClientMikrotikService.restartClientPPPoESession(clientId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en restartClientPPPoESession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al reiniciar sesión PPPoE del cliente',
        error: error.message
      });
    }
  },

  /**
   * Sincronizar todos los clientes con Mikrotik
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  syncAllClientsWithMikrotik: async (req, res) => {
    try {
      logger.info('Controlador: Iniciando sincronización de todos los clientes con Mikrotik');

      const result = await ClientMikrotikService.syncAllClientsWithMikrotik();

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en syncAllClientsWithMikrotik: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al sincronizar clientes con Mikrotik',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Cambiar plan de servicio de un cliente
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  changeClientServicePlan: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { newServicePackageId } = req.body;

      logger.info(`Controlador: Cambiando plan de servicio para cliente ${clientId} a paquete ${newServicePackageId}`);

      if (!newServicePackageId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere newServicePackageId'
        });
      }

      const result = await ClientMikrotikService.changeClientServicePlan(clientId, newServicePackageId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en changeClientServicePlan: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar plan de servicio del cliente',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Mover cliente entre pools (para cortes/suspensiones)
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  moveClientToPool: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { targetPoolType } = req.body;

      logger.info(`Controlador: Moviendo cliente ${clientId} a pool tipo ${targetPoolType}`);

      if (!targetPoolType || !['active', 'suspended', 'cutService'].includes(targetPoolType)) {
        return res.status(400).json({
          success: false,
          message: 'targetPoolType debe ser: active, suspended o cutService'
        });
      }

      const result = await ClientMikrotikService.moveClientToPool(clientId, targetPoolType);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en moveClientToPool: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al mover cliente entre pools',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Obtener información completa del cliente en Mikrotik
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  getClientMikrotikInfo: async (req, res) => {
    try {
      const { clientId } = req.params;

      logger.info(`Controlador: Obteniendo información completa de Mikrotik para cliente ${clientId}`);

      const result = await ClientMikrotikService.getClientMikrotikInfo(clientId);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error en getClientMikrotikInfo: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información de Mikrotik del cliente',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Obtener perfiles disponibles para un router específico
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  getAvailableProfiles: async (req, res) => {
    try {
      const { routerId } = req.params;

      logger.info(`Controlador: Obteniendo perfiles disponibles para router ${routerId}`);

      // Importar mikrotikService directamente para esta consulta
      const MikrotikService = require('../services/mikrotik.service');
      const db = require('../models');
      const MikrotikRouter = db.MikrotikRouter;

      const router = await MikrotikRouter.findByPk(routerId);
      if (!router) {
        return res.status(404).json({
          success: false,
          message: `Router ${routerId} no encontrado`
        });
      }

      const profiles = await MikrotikService.getPPPoEProfiles(
        router.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted // Asumir que está desencriptado en el servicio
      );

      return res.status(200).json({
        success: true,
        data: {
          routerId,
          routerName: router.name,
          profiles: profiles.map(profile => ({
            id: profile.id,
            name: profile.name,
            rateLimit: profile.rateLimit,
            localAddress: profile.localAddress,
            remoteAddress: profile.remoteAddress,
            bridge: profile.bridge,
			queue: profile.queue,
			dnsServer: profile.dnsServer
          }))
        }
      });
    } catch (error) {
      logger.error(`Error en getAvailableProfiles: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfiles disponibles',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Obtener pools disponibles para un router específico
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  getAvailablePools: async (req, res) => {
    try {
      const { routerId } = req.params;

      logger.info(`Controlador: Obteniendo pools disponibles para router ${routerId}`);

      const MikrotikService = require('../services/mikrotik.service');
      const db = require('../models');
      const MikrotikRouter = db.MikrotikRouter;

      const router = await MikrotikRouter.findByPk(routerId);
      if (!router) {
        return res.status(404).json({
          success: false,
          message: `Router ${routerId} no encontrado`
        });
      }

      const pools = await MikrotikService.getIPPools(
        router.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted
      );

      return res.status(200).json({
        success: true,
        data: {
          routerId,
          routerName: router.name,
          pools: pools.map(pool => ({
            id: pool.id,
            name: pool.name,
            ranges: pool.ranges,
            comment: pool.comment,
            usedIPs: pool.usedIPs,
            totalIPs: pool.totalIPs
          }))
        }
      });
    } catch (error) {
      logger.error(`Error en getAvailablePools: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener pools disponibles',
        error: error.message
      });
    }
  },

  /**
   * ✅ NUEVO: Obtener IPs disponibles de un pool específico
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  getPoolAvailableIPs: async (req, res) => {
    try {
      const { routerId, poolName } = req.params;

      logger.info(`Controlador: Obteniendo IPs disponibles del pool ${poolName} en router ${routerId}`);

      const MikrotikService = require('../services/mikrotik.service');
      const db = require('../models');
      const MikrotikRouter = db.MikrotikRouter;

      const router = await MikrotikRouter.findByPk(routerId);
      if (!router) {
        return res.status(404).json({
          success: false,
          message: `Router ${routerId} no encontrado`
        });
      }

      const availableIPs = await MikrotikService.getPoolAvailableIPs(
        router.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted,
        poolName
      );

      return res.status(200).json({
        success: true,
        data: availableIPs
      });
    } catch (error) {
      logger.error(`Error en getPoolAvailableIPs: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener IPs disponibles del pool',
        error: error.message
      });
    }
  }
};

module.exports = ClientMikrotikController