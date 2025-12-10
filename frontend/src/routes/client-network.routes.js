// Rutas para integración de redes de clientes
const { authJwt } = require("../middleware");
const controller = require("../controllers/client-network.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  
  /**
   * @route    GET /api/client-networks
   * @desc     Obtener todas las redes de clientes
   * @access   Privado (Administrador, Técnico)
   */
  app.get(
    "/api/client-networks",
    //[authJwt.verifyToken, authJwt.checkPermission("view_network_devices")],
    controller.findAll
  );
  
  /**
   * @route    GET /api/client-networks/:id
   * @desc     Obtener una red de cliente por ID
   * @access   Privado (Administrador, Técnico)
   */
  app.get(
    "/api/client-networks/:id",
    [authJwt.verifyToken, authJwt.checkPermission("view_network_devices")],
    controller.findOne
  );
  
  /**
   * @route    POST /api/client-networks
   * @desc     Crear una nueva red de cliente
   * @access   Privado (Administrador)
   */
  app.post(
    "/api/client-networks",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.create
  );
  
  /**
   * @route    PUT /api/client-networks/:id
   * @desc     Actualizar una red de cliente
   * @access   Privado (Administrador)
   */
  app.put(
    "/api/client-networks/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.update
  );
  
  /**
   * @route    DELETE /api/client-networks/:id
   * @desc     Eliminar una red de cliente
   * @access   Privado (Administrador)
   */
  app.delete(
    "/api/client-networks/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.delete
  );
  
  /**
   * @route    PATCH /api/client-networks/:id/status
   * @desc     Cambiar estado de una red de cliente
   * @access   Privado (Administrador)
   */
  app.patch(
    "/api/client-networks/:id/status",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.changeStatus
  );
  
  /**
   * @route    POST /api/client-networks/:id/tplink
   * @desc     Asociar red de cliente con dispositivo TP-Link
   * @access   Privado (Administrador)
   */
  app.post(
    "/api/client-networks/:id/tplink",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.associateWithTpLinkDevice
  );
  
  /**
   * @route    POST /api/client-networks/:id/tplink/apply-speed
   * @desc     Aplicar configuración de velocidad al dispositivo TP-Link
   * @access   Privado (Administrador)
   */
  app.post(
    "/api/client-networks/:id/tplink/apply-speed",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetworkDevices")],
    controller.applyTpLinkSpeedConfig
  );
  
  /**
   * @route    GET /api/client-networks/:id/tplink/status
   * @desc     Actualizar estado de conexión con TP-Link
   * @access   Privado (Administrador, Técnico)
   */
  app.get(
    "/api/client-networks/:id/tplink/status",
    [authJwt.verifyToken, authJwt.checkPermission("view_network_devices")],
    controller.updateTpLinkStatus
  );
};