// Rutas para operaciones con Mikrotik
const MikrotikController = require('../controllers/mikrotik.controller');
const { authJwt } = require('../middleware');

// Debugging: Verificar que el controlador se importó correctamente
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
  
  /**
   * @route    POST /api/mikrotik/test-connection
   * @desc     Probar conexión con un dispositivo Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/test-connection",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.testConnection
  );
  
  /**
   * @route    POST /api/mikrotik/device-info
   * @desc     Obtener información de un dispositivo Mikrotik
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/device-info",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getDeviceInfo
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/metrics
   * @desc     Obtener métricas de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/metrics",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getMetrics
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/pppoe-users
   * @desc     Obtener usuarios PPPoE de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/pppoe-users",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getPPPoEUsers
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/active-sessions
   * @desc     Obtener sesiones PPPoE activas
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/active-sessions",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getActivePPPoESessions
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:id/pppoe-users
   * @desc     Crear un nuevo usuario PPPoE
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:id/pppoe-users",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.createPPPoEUser
  );
  
  /**
   * @route    PUT /api/mikrotik/devices/:deviceId/pppoe-users/:userId
   * @desc     Actualizar un usuario PPPoE
   * @access   Privado (Admin)
   */
  app.put(
    "/api/mikrotik/devices/:deviceId/pppoe-users/:userId",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.updatePPPoEUser
  );
  
  /**
   * @route    DELETE /api/mikrotik/devices/:deviceId/pppoe-users/:userId
   * @desc     Eliminar un usuario PPPoE
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/mikrotik/devices/:deviceId/pppoe-users/:userId",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.deletePPPoEUser
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/pppoe-profiles
   * @desc     Obtener perfiles PPPoE disponibles
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/pppoe-profiles",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getPPPoEProfiles
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/ip-pools
   * @desc     Obtener IP Pools disponibles en un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:id/ip-pools",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getIPPools
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/qos
   * @desc     Configurar QoS para un cliente
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/qos",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.configureQoS
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:deviceId/traffic
   * @desc     Obtener estadísticas de tráfico para una interfaz
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/mikrotik/devices/:deviceId/traffic",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.getTrafficStatistics
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/restart-session/:sessionId
   * @desc     Reiniciar una sesión PPPoE
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/restart-session/:sessionId",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    MikrotikController.restartPPPoESession
  );
  
  /**
   * @route    POST /api/mikrotik/devices/:deviceId/execute-action
   * @desc     Ejecutar una acción en el dispositivo
   * @access   Privado (Admin)
   */
  app.post(
    "/api/mikrotik/devices/:deviceId/execute-action",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    MikrotikController.executeAction
  );
  
  /**
   * @route    GET /api/mikrotik/devices/:id/ip-pools/:poolName/available-ips
   * @desc     Obtener IPs disponibles de un pool específico
  * @access   Privado (Admin, Técnico)
  */
  app.get(
  "/api/mikrotik/devices/:id/ip-pools/:poolName/available-ips",
  [authJwt.verifyToken, authJwt.checkRole('technician')],
  MikrotikController.getPoolAvailableIPs
  );
};