// routes/network.unified.routes.js
const { authJwt } = require("../middleware");
const networkUnifiedController = require("../controllers/network.unified.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  /**
   * @route    GET /api/network/devices/:id/info
   * @desc     Obtener información detallada de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/network/devices/:id/info",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    networkUnifiedController.getDeviceInfo
  );

  /**
   * @route    GET /api/network/devices/:id/resources
   * @desc     Obtener recursos del sistema de un dispositivo
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/network/devices/:id/resources",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    networkUnifiedController.getDeviceSystemResources
  );

  /**
   * @route    POST /api/network/clients/:clientId/devices/:deviceId/configure
   * @desc     Configurar una conexión para un cliente en un dispositivo
   * @access   Privado (Admin)
   */
  app.post(
    "/api/network/clients/:clientId/devices/:deviceId/configure",
    [authJwt.verifyToken, authJwt.checkPermission('manageNetwork')],
    networkUnifiedController.configureClientConnection
  );

  /**
   * @route    PUT /api/network/client-networks/:clientNetworkId
   * @desc     Actualizar una conexión de cliente existente
   * @access   Privado (Admin)
   */
  app.put(
    "/api/network/client-networks/:clientNetworkId",
    [authJwt.verifyToken, authJwt.checkPermission('manageNetwork')],
    networkUnifiedController.updateClientConnection
  );

  /**
   * @route    DELETE /api/network/client-networks/:clientNetworkId
   * @desc     Eliminar una conexión de cliente
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/network/client-networks/:clientNetworkId",
    [authJwt.verifyToken, authJwt.checkPermission('manageNetwork')],
    networkUnifiedController.removeClientConnection
  );

  /**
   * @route    GET /api/network/client-networks/:clientNetworkId/stats
   * @desc     Obtener estadísticas de tráfico para una conexión de cliente
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/network/client-networks/:clientNetworkId/stats",
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    networkUnifiedController.getClientTrafficStats
  );

  /**
   * @route    POST /api/network/devices/:deviceId/actions
   * @desc     Ejecutar una acción en un dispositivo
   * @access   Privado (Admin)
   */
  app.post(
    "/api/network/devices/:deviceId/actions",
    [authJwt.verifyToken, authJwt.checkPermission('manageNetwork')],
    networkUnifiedController.executeDeviceAction
  );
};