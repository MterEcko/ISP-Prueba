// backend/src/routes/commandHistory.routes.js
const { authJwt } = require("../middleware");
const commandHistoryController = require("../controllers/commandHistory.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener historial de comandos
  app.get(
    "/api/command-history",
    [authJwt.verifyToken],
    commandHistoryController.findAll
  );

  // Obtener historial de comandos para un dispositivo específico
  app.get(
    "/api/devices/:deviceId/command-history",
    //[authJwt.verifyToken],
    commandHistoryController.findByDevice
  );

  // Obtener un comando específico por ID
  app.get(
    "/api/command-history/:id",
    [authJwt.verifyToken],
    commandHistoryController.findOne
  );

  // Eliminar registro de comando
  app.delete(
    "/api/command-history/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandHistoryController.delete
  );
};