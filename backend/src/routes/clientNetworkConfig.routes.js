// backend/src/routes/clientNetworkConfig.routes.js
const { authJwt } = require("../middleware");
const clientNetworkConfigController = require("../controllers/clientNetworkConfig.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todas las configuraciones de red
  app.get(
    "/api/client-network-configs",
    [authJwt.verifyToken],
    clientNetworkConfigController.getAllConfigs
  );

  // Obtener configuración de red por ID
  app.get(
    "/api/client-network-configs/:id",
    [authJwt.verifyToken],
    clientNetworkConfigController.getConfigById
  );

  // Obtener configuración de red por cliente
  app.get(
    "/api/clients/:clientId/network-config",
    [authJwt.verifyToken],
    clientNetworkConfigController.getConfigByClient
  );

  // Crear nueva configuración de red
  app.post(
    "/api/client-network-configs",
    [authJwt.verifyToken],
    clientNetworkConfigController.createConfig
  );

  // Actualizar configuración de red
  app.put(
    "/api/client-network-configs/:id",
    [authJwt.verifyToken],
    clientNetworkConfigController.updateConfig
  );

  // Eliminar configuración de red
  app.delete(
    "/api/client-network-configs/:id",
    [authJwt.verifyToken],
    clientNetworkConfigController.deleteConfig
  );

  // Sincronizar configuración con Mikrotik
  app.post(
    "/api/client-network-configs/:id/sync",
    [authJwt.verifyToken],
    clientNetworkConfigController.syncConfig
  );
};
