const { authJwt } = require("../middleware");
const mikrotikEnhanced = require("../controllers/mikrotik.enhanced.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para gráficas de tráfico de clientes
  app.get(
    "/api/mikrotik-enhanced/clients/:clientId/traffic",
    [authJwt.verifyToken],
    mikrotikEnhanced.getClientTrafficGraphs
  );

  // Rutas para métricas de calidad de clientes
  app.get(
    "/api/mikrotik-enhanced/clients/:clientId/quality",
    [authJwt.verifyToken],
    mikrotikEnhanced.getClientQualityMetrics
  );

  // Rutas para topología de red
  app.get(
    "/api/mikrotik-enhanced/nodes/:nodeId/topology",
    [authJwt.verifyToken],
    mikrotikEnhanced.getNetworkTopologyData
  );

  // Rutas para utilización de ancho de banda
  app.get(
    "/api/mikrotik-enhanced/routers/:routerId/bandwidth",
    [authJwt.verifyToken],
    mikrotikEnhanced.getBandwidthUtilization
  );

  // Rutas para interfaces de router
  app.get(
    "/api/mikrotik-enhanced/routers/:routerId/interfaces",
    [authJwt.verifyToken],
    mikrotikEnhanced.getRouterInterfaces
  );

  // Rutas para reglas de firewall
  app.get(
    "/api/mikrotik-enhanced/routers/:routerId/firewall",
    [authJwt.verifyToken],
    mikrotikEnhanced.getFirewallRules
  );

  // Rutas para backup de router
  app.post(
    "/api/mikrotik-enhanced/routers/:routerId/backup",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    mikrotikEnhanced.createRouterBackup
  );

  // Rutas para reiniciar router
  app.post(
    "/api/mikrotik-enhanced/routers/:routerId/reboot",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    mikrotikEnhanced.rebootRouter
  );

  // Rutas para ejecutar comandos
  app.post(
    "/api/mikrotik-enhanced/routers/:routerId/execute",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    mikrotikEnhanced.executeCommand
  );

  // Rutas para logs de router
  app.get(
    "/api/mikrotik-enhanced/routers/:routerId/logs",
    [authJwt.verifyToken],
    mikrotikEnhanced.getRouterLogs
  );

  // Rutas para recursos de router
  app.get(
    "/api/mikrotik-enhanced/routers/:routerId/resources",
    [authJwt.verifyToken],
    mikrotikEnhanced.getRouterResources
  );
};
