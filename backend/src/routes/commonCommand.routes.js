// backend/src/routes/commonCommand.routes.js
const { authJwt } = require("../middleware");
const commonCommandController = require("../controllers/commonCommand.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers", 
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todos los comandos comunes
  app.get(
    "/api/common-commands",
    //[authJwt.verifyToken],
    commonCommandController.findAll
  );

  // Obtener comandos comunes por categoría
  app.get(
    "/api/common-commands/category/:category",
    [authJwt.verifyToken],
    commonCommandController.findByCategory
  );

  // Obtener un comando común específico por ID
  app.get(
    "/api/common-commands/:id",
    [authJwt.verifyToken],
    commonCommandController.findOne
  );

  // Crear nuevo comando común (solo admin)
  app.post(
    "/api/common-commands",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commonCommandController.create
  );

  // Actualizar comando común
  app.put(
    "/api/common-commands/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commonCommandController.update
  );

  // Eliminar comando común
  app.delete(
    "/api/common-commands/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commonCommandController.delete
  );

  // Obtener todas las implementaciones de un comando común
  app.get(
    "/api/common-commands/:id/implementations",
    [authJwt.verifyToken],
    commonCommandController.getImplementations
  );

  // Obtener implementaciones por marca específica
  app.get(
    "/api/common-commands/:id/implementations/brand/:brandId",
    [authJwt.verifyToken],
    commonCommandController.getImplementationsByBrand
  );

  // Verificar si un comando tiene implementación para una marca/familia
  app.get(
    "/api/common-commands/:id/check-implementation",
    [authJwt.verifyToken],
    commonCommandController.checkImplementation
  );
};