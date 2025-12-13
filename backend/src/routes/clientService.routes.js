// backend/src/routes/clientService.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/clientService.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==========================================
  // API DE SERVICIOS UNIFICADOS
  // ==========================================

  /**
   * @route GET /api/client-services/client/:clientId
   * @desc Devuelve ARRAY mezclado: [Internet, Netflix, Cámaras, VoIP]
   * @usage Frontend: Pestaña "Servicios" del Cliente
   */
  app.get(
    "/api/client-services/client/:clientId",
    [authJwt.verifyToken],
    controller.getAllServices
  );

  /**
   * @route GET /api/client-services/:id
   * @desc Obtiene un servicio específico por ID
   * @usage Frontend: Ver detalles de un servicio
   */
  app.get(
    "/api/client-services/:id",
    [authJwt.verifyToken],
    controller.getClientService
  );

  /**
   * @route POST /api/client-services
   * @desc Crea un nuevo servicio para un cliente
   * @usage Frontend: Formulario de agregar servicio
   */
  app.post(
    "/api/client-services",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    controller.createClientService
  );

  /**
   * @route PUT /api/client-services/:id
   * @desc Actualiza un servicio existente
   * @usage Frontend: Formulario de edición de servicio
   */
  app.put(
    "/api/client-services/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    controller.updateClientService
  );

  /**
   * @route PATCH /api/client-services/:id/status
   * @desc Cambia el estado de un servicio (active, suspended, cancelled)
   * @usage Frontend: Botones de activar/suspender servicio
   */
  app.patch(
    "/api/client-services/:id/status",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    controller.updateServiceStatus
  );

  /**
   * @route DELETE /api/client-services/:id
   * @desc Da de baja un servicio externo (Plugin)
   * @usage Frontend: Botón "Eliminar" en la lista de servicios extra
   */
  app.delete(
    "/api/client-services/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    controller.removeService
  );
};