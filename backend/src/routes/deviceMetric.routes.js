// backend/src/routes/deviceMetric.routes.js
const { authJwt } = require("../middleware");
const deviceMetricController = require("../controllers/deviceMetric.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener métricas de dispositivos
  app.get(
    "/api/device-metrics",
    //[authJwt.verifyToken],
    deviceMetricController.findAll
  );

  // Obtener métricas para un dispositivo específico
  app.get(
    "/api/devices/:deviceId/metrics",
    //[authJwt.verifyToken],
    deviceMetricController.findByDevice
  );

  // Exportar métricas (por período, tipo)
  app.get(
    "/api/device-metrics/export",
    //[authJwt.verifyToken, authJwt.checkPermission("view_network")],
    deviceMetricController.exportMetrics
  );

  // Obtener métricas por ID
  app.get(
    "/api/device-metrics/:id",
    //[authJwt.verifyToken],
    deviceMetricController.findOne
  );

  // Crear métricas manualmente (para testing/admin)
  app.post(
    "/api/device-metrics",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceMetricController.create
  );

  // Eliminar registro de métricas
  app.delete(
    "/api/device-metrics/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceMetricController.delete
  );


};