// backend/src/routes/settings.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/settings.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para configuraciones generales
  app.get(
    "/api/settings/general",
    [authJwt.verifyToken],
    controller.getGeneralSettings
  );

  app.post(
    "/api/settings/general",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.saveGeneralSettings
  );

  // Rutas para configuraciones de red
  app.get(
    "/api/settings/network",
    [authJwt.verifyToken],
    controller.getNetworkSettings
  );

  // Añadir aquí más rutas para las otras configuraciones
};