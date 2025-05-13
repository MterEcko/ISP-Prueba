// Rutas para la integración de clientes con Mikrotik
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
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/devices/:deviceId/pppoe
   * @desc     Crear un usuario PPPoE para un cliente en un dispositivo específico
   * @access   Privado (Admin)
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/devices/:deviceId/pppoe",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    ClientMikrotikController.createClientPPPoE
  );
  
  /**
   * @route    PUT /api/client-mikrotik/clients/:clientId/pppoe
   * @desc     Actualizar un usuario PPPoE de un cliente
   * @access   Privado (Admin)
   */
  app.put(
    "/api/client-mikrotik/clients/:clientId/pppoe",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    ClientMikrotikController.updateClientPPPoE
  );
  
  /**
   * @route    DELETE /api/client-mikrotik/clients/:clientId/pppoe
   * @desc     Eliminar un usuario PPPoE de un cliente
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/client-mikrotik/clients/:clientId/pppoe",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    ClientMikrotikController.deleteClientPPPoE
  );
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/bandwidth
   * @desc     Configurar límites de ancho de banda para un cliente
   * @access   Privado (Admin)
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/bandwidth",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    ClientMikrotikController.setClientBandwidth
  );
  
  /**
   * @route    GET /api/client-mikrotik/clients/:clientId/traffic
   * @desc     Obtener estadísticas de tráfico para un cliente
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/client-mikrotik/clients/:clientId/traffic",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    ClientMikrotikController.getClientTrafficStats
  );
  
  /**
   * @route    POST /api/client-mikrotik/clients/:clientId/restart-pppoe
   * @desc     Reiniciar la sesión PPPoE de un cliente
   * @access   Privado (Admin, Técnico)
   */
  app.post(
    "/api/client-mikrotik/clients/:clientId/restart-pppoe",
    [authJwt.verifyToken, authJwt.checkRole('technician')],
    ClientMikrotikController.restartClientPPPoESession
  );
  
  /**
   * @route    POST /api/client-mikrotik/sync-all
   * @desc     Sincronizar todos los clientes con Mikrotik
   * @access   Privado (Admin)
   */
  app.post(
    "/api/client-mikrotik/sync-all",
    [authJwt.verifyToken, authJwt.checkRole('admin')],
    ClientMikrotikController.syncAllClientsWithMikrotik
  );
};