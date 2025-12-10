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