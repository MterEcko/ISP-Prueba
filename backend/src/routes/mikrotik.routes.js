// Rutas para operaciones con Mikrotik
const MikrotikController = require('../controllers/mikrotik.controller');
const MikrotikRouterController = require('../controllers/mikrotikRouter.controller');
const MikrotikSyncController = require('../controllers/mikrotik.sync.controller');
const { authJwt } = require('../middleware');

// Debugging: Verificar que el controlador se importó correctamente
// Debugging: Verificar que el controlador se importó correctamente
console.log('MikrotikSyncController:', MikrotikSyncController);
console.log('syncIpPools method:', MikrotikSyncController.syncIpPools);
console.log('Is syncIpPools a function?', typeof MikrotikSyncController.syncIpPools === 'function');

console.log('MikrotikController:', MikrotikController);
console.log('testConnection method:', MikrotikController.testConnection);
console.log('Is testConnection a function?', typeof MikrotikController.testConnection === 'function');

// Después de las importaciones y antes de module.exports
console.log('authJwt:', authJwt);
console.log('verifyToken:', authJwt.verifyToken);
console.log('isAdminOrTechnician:', authJwt.isAdminOrTechnician);
console.log('Is verifyToken a function?', typeof authJwt.verifyToken === 'function');
console.log('Is isAdminOrTechnician a function?', typeof authJwt.isAdminOrTechnician === 'function');

module.exports = function(app) {
  // Middleware para verificar token de acceso
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ======================================
  // CRUD BÁSICO PARA MIKROTIK ROUTERS
  // ======================================

  /**
   * @route    GET /api/mikrotik/routers
   * @desc     Obtener todos los routers Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/routers",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikRouterController.findAll
  );

  /**
   * @route    GET /api/mikrotik/routers/:id
   * @desc     Obtener un router Mikrotik por ID
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/routers/:id",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikRouterController.findOne
  );

  /**
   * @route    POST /api/mikrotik/routers
   * @desc     Crear un nuevo router Mikrotik
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/routers",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikRouterController.create
  );

  /**
   * @route    PUT /api/mikrotik/routers/:id
   * @desc     Actualizar un router Mikrotik
   * @access   Privado (Admin)
   */
  app.put(
    "/api/mikrotik/routers/:id",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikRouterController.update
  );

  /**
   * @route    DELETE /api/mikrotik/routers/:id
   * @desc     Eliminar un router Mikrotik
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/mikrotik/routers/:id",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikRouterController.delete
  );

  // ======================================
  // OPERACIONES CON DISPOSITIVOS MIKROTIK
  // ======================================

  /**
   * @route    POST /api/mikrotik/test-connection
   * @desc     Probar conexión con un dispositivo Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/test-connection",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.testConnection
  );
  
  /**
   * @route    POST /api/mikrotik/device-info
   * @desc     Obtener información de un dispositivo Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/device-info",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getDeviceInfo
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/metrics
   * @desc     Obtener métricas de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/metrics",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getMetrics
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/pppoe-users
   * @desc     Obtener usuarios PPPoE de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/pppoe-users",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getPPPoEUsers
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/active-sessions
   * @desc     Obtener sesiones PPPoE activas
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/active-sessions",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getActivePPPoESessions
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:id/pppoe-users
   * @desc     Crear un nuevo usuario PPPoE
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:id/pppoe-users",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.createPPPoEUser
  );
  
  /**
   * @route    PUT /api/mikrotik/devices/:deviceId/pppoe-users/:userId
   * @desc     Actualizar un usuario PPPoE
   * @access   Privado (Admin)
   */
  app.put(
    "/api/mikrotik/devices/:deviceId/pppoe-users/:userId",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.updatePPPoEUser
  );
  
  /**
   * @route    DELETE /api/mikrotik/devices/:deviceId/pppoe-users/:userId
   * @desc     Eliminar un usuario PPPoE
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/mikrotik/devices/:deviceId/pppoe-users/:userId",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.deletePPPoEUser
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/pppoe-profiles
   * @desc     Obtener perfiles PPPoE disponibles
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/pppoe-profiles",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getPPPoEProfiles
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/ip-pools
   * @desc     Obtener IP Pools disponibles en un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/ip-pools",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getIPPools
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/qos
   * @desc     Configurar QoS para un cliente
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/qos",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.configureQoS
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:deviceId/traffic
   * @desc     Obtener estadísticas de tráfico para una interfaz
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:deviceId/traffic",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getTrafficStatistics
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/restart-session/:sessionId
   * @desc     Reiniciar una sesión PPPoE
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/restart-session/:sessionId",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.restartPPPoESession
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/execute-action
   * @desc     Ejecutar una acción en el dispositivo
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/execute-action",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.executeAction
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/ip-pools/:poolName/available-ips
   * @desc     Obtener IPs disponibles de un pool específico
  * @access   Privado (Admin, Técnico)
  */
  app.get(
  "/api/mikrotik/devices/:id/ip-pools/:poolName/available-ips",
  //[authJwt.verifyToken, authJwt.checkRole('technician')],
  MikrotikController.getPoolAvailableIPs
  );
  
  // ✅ NUEVA RUTA: Perfiles desde BD
app.get(
  "/api/mikrotik/routers/:id/profiles-db",
//  [authJwt.verifyToken],
  MikrotikController.getProfilesFromDatabase
);
  // ======================================
  // RUTAS DE SINCRONIZACIÓN MIKROTIK
  // ======================================


  /**
   * @route    GET /api/mikrotik/sync/full
   * @desc     Ejecutar sincronización completa
   * @access   Privado (Admin)
   */
  app.get(
    "/api/mikrotik/sync/full",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.runFullSync
  );

  /**
   * @route    POST /api/mikrotik/sync/ip-pools
   * @desc     Sincronizar solo IP Pools
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/ip-pools",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.syncPoolIPs  
  );

  /**
   * @route    POST /api/mikrotik/sync/pool-ips
   * @desc     Sincronizar solo IPs de pools
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/pool-ips",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.syncPoolIPs
  );

  /**
   * @route    POST /api/mikrotik/sync/pppoe-profiles
   * @desc     Sincronizar solo perfiles PPPoE
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/pppoe-profiles",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.syncProfiles
  );

  /**
   * @route    POST /api/mikrotik/sync/pppoe-users
   * @desc     Sincronizar solo usuarios PPPoE
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/pppoe-users",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.syncUsers
  );

  /**
   * @route    POST /api/mikrotik/sync/user/:clientId
   * @desc     Sincronizar usuario específico
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/sync/user/:clientId",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikSyncController.syncSpecificUser
  );

  /**
   * @route    POST /api/mikrotik/sync/pool/:poolId
   * @desc     Sincronizar pool específico
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/pool/:poolId",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.syncSpecificPool
  );

  /**
   * @route    POST /api/mikrotik/sync/clean-orphaned-ips
   * @desc     Limpiar IPs huérfanas
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/clean-orphaned-ips",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.cleanupOrphanedIPs
  );

  /**
   * @route    GET /api/mikrotik/sync/config
   * @desc     Obtener configuración de sincronización
   * @access   Privado (Admin)
   */
  app.get(
    "/api/mikrotik/sync/config",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.getConfig
  );

  /**
   * @route    PUT /api/mikrotik/sync/config
   * @desc     Actualizar configuración de sincronización
   * @access   Privado (Admin)
   */
  app.put(
    "/api/mikrotik/sync/config",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.updateConfig
  );

  /**
   * @route    GET /api/mikrotik/sync/status
   * @desc     Obtener estado de sincronización
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/sync/status",
    //[authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikSyncController.getSyncStatus
  );

  /**
   * @route    POST /api/mikrotik/sync/reset-times
   * @desc     Resetear tiempos de sincronización
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/sync/reset-times",
    //[authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikSyncController.resetSyncTimes
  );
};