// backend/src/routes/commandImplementation.routes.js
const { authJwt } = require("../middleware");
const commandImplementationController = require("../controllers/commandImplementation.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers", 
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todas las implementaciones de comandos
  app.get(
    "/api/command-implementations",
    [authJwt.verifyToken],
    commandImplementationController.findAll
  );

  // Obtener implementaciones por marca
  app.get(
    "/api/command-implementations/brand/:brandId",
    [authJwt.verifyToken],
    commandImplementationController.findByBrand
  );

  // Obtener implementaciones por familia
  app.get(
    "/api/command-implementations/family/:familyId",
    [authJwt.verifyToken],
    commandImplementationController.findByFamily
  );

  // Obtener implementaciones por comando común
  app.get(
    "/api/command-implementations/command/:commonCommandId",
    [authJwt.verifyToken],  
    commandImplementationController.findByCommand
  );

  // Obtener una implementación específica por ID
  app.get(
    "/api/command-implementations/:id",
    [authJwt.verifyToken],
    commandImplementationController.findOne
  );

  // Crear nueva implementación de comando
  app.post(
    "/api/command-implementations",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandImplementationController.create
  );

  // Actualizar implementación de comando
  app.put(
    "/api/command-implementations/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandImplementationController.update
  );

  // Activar/desactivar implementación
  app.patch(
    "/api/command-implementations/:id/toggle",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandImplementationController.toggleActive
  );

  // Eliminar implementación
  app.delete(
    "/api/command-implementations/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandImplementationController.delete
  );

  // Obtener parámetros de una implementación
  app.get(
    "/api/command-implementations/:id/parameters",
    [authJwt.verifyToken],
    commandImplementationController.getParameters
  );

  // Probar una implementación específica en un dispositivo
  app.post(
    "/api/command-implementations/:id/test",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandImplementationController.testImplementation
  );

  // Obtener estadísticas de éxito de una implementación
  app.get(
    "/api/command-implementations/:id/stats",
    [authJwt.verifyToken],
    commandImplementationController.getStats
  );

  // Buscar implementaciones disponibles para un dispositivo específico
  app.get(
    "/api/devices/:deviceId/available-implementations",
    [authJwt.verifyToken],
    commandImplementationController.getAvailableForDevice
  );
};