const { authJwt } = require("../middleware");
const deviceController = require("../controllers/device.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para dispositivos
  app.post(
    "/api/devices",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    deviceController.create
  );

  app.get(
    "/api/devices",
    [authJwt.verifyToken],
    deviceController.findAll
  );

  app.get(
    "/api/devices/:id",
    [authJwt.verifyToken],
    deviceController.findOne
  );

  app.put(
    "/api/devices/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    deviceController.update
  );

  app.delete(
    "/api/devices/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    deviceController.delete
  );

  // Rutas para operaciones específicas de dispositivos
  app.get(
    "/api/devices/:id/status",
    [authJwt.verifyToken],
    deviceController.checkStatus
  );

  app.get(
    "/api/devices/:id/metrics",
    [authJwt.verifyToken],
    deviceController.getMetrics
  );

  app.post(
    "/api/devices/:id/actions",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    deviceController.executeAction
  );
};