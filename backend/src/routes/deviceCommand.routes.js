// backend/src/routes/deviceCommand.routes.js
const { authJwt } = require("../middleware");
const deviceCommandController = require("../controllers/deviceCommand.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener comandos por dispositivo
  app.get(
    "/api/device-commands",
    //[authJwt.verifyToken],
    deviceCommandController.getCommandsByDevice
  );

  // Crear nuevo comando (solo admin)
  app.post(
    "/api/device-commands",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCommandController.create
  );

  // Actualizar comando
  app.put(
    "/api/device-commands/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCommandController.update
  );

  // Desactivar comando
  app.patch(
    "/api/device-commands/:id/deactivate",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCommandController.deactivate
  );
};