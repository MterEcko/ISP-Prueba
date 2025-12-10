// routes/client.mikrotik.routes.js - Rutas actualizadas para la integración de clientes con Mikrotik
const ClientMikrotikController = require('../controllers/client.mikrotik.controller');
const { authJwt } = require('../middleware');

module.exports = function(app) {
  // Middleware para verificar token de acceso
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  
  // ==================== GESTIÓN DE USUARIOS PPPOE ====================
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/devices/:deviceId/pppoe
   * @desc     Crear un usuario PPPoE para un cliente en un dispositivo específico
   * @access   Privado (Admin)
   * @body     { password, profileId?, profileName?, poolId?, poolName?, staticIp?, username?, comment? }
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/devices/:deviceId/pppoe",
    [authJwt.verifyToken, authJwt.checkPermission('manage_clients')],
    ClientMikrotikController.createClientPPPoE
  );
  
  /**
   * @route    PUT /api/client-mikrotik/clients/:clientId/pppoe
   * @desc     Actualizar un usuario PPPoE de un cliente
   * @access   Privado (Admin)
   * @body     { profileId?, profileName?, poolId?, poolName?, password?, staticIp?, disabled? }
   */
  app.put(
    "/api/client-mikrotik/clients/:clientId/pppoe",
    [authJwt.verifyToken, authJwt.checkPermission('manage_clients')],
    ClientMikrotikController.updateClientPPPoE
  );
  
  /**
   * @route    DELETE /api/client-mikrotik/clients/:clientId/pppoe
   * @desc     Eliminar un usuario PPPoE de un cliente
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/client-mikrotik/clients/:clientId/pppoe",
    [authJwt.verifyToken, authJwt.checkPermission('manage_clients')],
    ClientMikrotikController.deleteClientPPPoE
  );
  
  // ==================== GESTIÓN DE ANCHO DE BANDA ====================
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/bandwidth
   * @desc     Configurar límites de ancho de banda para un cliente
   * @access   Privado (Admin)
   * @body     { downloadSpeed, uploadSpeed, useExistingProfile?, burstLimit?, burstThreshold?, burstTime?, priority? }
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/bandwidth",
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ClientMikrotikController.setClientBandwidth
  );
  
  // ==================== ESTADÍSTICAS Y MONITOREO ====================
  
  /**
   * @route    GET /api/client-mikrotik/clients/:clientId/traffic
   * @desc     Obtener estadísticas de tráfico para un cliente
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/clients/:clientId/traffic",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ClientMikrotikController.getClientTrafficStats
  );
  
  /**
   * @route    GET /api/client-mikrotik/clients/:clientId/info
   * @desc     Obtener información completa del cliente en Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/clients/:clientId/info",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ClientMikrotikController.getClientMikrotikInfo
  );
  
  // ==================== ACCIONES DE SESIÓN ====================
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/restart-pppoe
   * @desc     Reiniciar la sesión PPPoE de un cliente
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/restart-pppoe",
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ClientMikrotikController.restartClientPPPoESession
  );
  
  // ==================== GESTIÓN DE PLANES Y POOLS ====================
  
  /**
   * @route    PUT /api/client-mikrotik/clients/:clientId/service-plan
   * @desc     Cambiar plan de servicio de un cliente (actualiza perfil automáticamente)
   * @access   Privado (Admin)
   * @body     { newServicePackageId }
   */
  app.put(
    "/api/client-mikrotik/clients/:clientId/service-plan",
    [authJwt.verifyToken, authJwt.checkPermission('manage_clients')],
    ClientMikrotikController.changeClientServicePlan
  );
  
  /**
   * @route    PUT /api/client-mikrotik/clients/:clientId/pool
   * @desc     Mover cliente entre pools (para cortes/suspensiones)
   * @access   Privado (Admin)
   * @body     { targetPoolType } // 'active', 'suspended', 'cutService'
   */
  app.put(
    "/api/client-mikrotik/clients/:clientId/pool",
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ClientMikrotikController.moveClientToPool
  );
  
  // ==================== SINCRONIZACIÓN ====================
  
  /**
   * @route    POST /api/client-mikrotik/sync-all
   * @desc     Sincronizar todos los clientes con Mikrotik (actualiza nombres basándose en IDs)
   * @access   Privado (Admin)
   */
  app.post(
    "/api/client-mikrotik/sync-all",
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ClientMikrotikController.syncAllClientsWithMikrotik
  );
  
  // ==================== CONSULTAS DE RECURSOS MIKROTIK ====================
  
  /**
   * @route    GET /api/client-mikrotik/routers/:routerId/profiles
   * @desc     Obtener perfiles PPPoE disponibles en un router específico
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/routers/:routerId/profiles",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ClientMikrotikController.getAvailableProfiles
  );
  
  /**
   * @route    GET /api/client-mikrotik/routers/:routerId/pools
   * @desc     Obtener pools de IPs disponibles en un router específico
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/routers/:routerId/pools",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ClientMikrotikController.getAvailablePools
  );
  
  /**
   * @route    GET /api/client-mikrotik/routers/:routerId/pools/:poolName/available-ips
   * @desc     Obtener IPs disponibles de un pool específico
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/routers/:routerId/pools/:poolName/available-ips",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ClientMikrotikController.getPoolAvailableIPs
  );
};