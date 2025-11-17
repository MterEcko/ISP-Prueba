const { authJwt } = require("../middleware");
const inventory = require("../controllers/inventory.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });


  // ===============================================
  // RUTAS ESPECÍFICAS PRIMERO (sin parámetros)
  // ===============================================

  // Autocompletado por serial
  app.get(
    "/api/inventory/serial/:serial",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.getProductBySerial
  );

  // Obtener plantillas de productos
  app.get(
    "/api/inventory/templates",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.getProductTemplates
  );
  


  // Dashboard de eficiencia
  app.get(
    "/api/inventory/efficiency",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.getEfficiencyDashboard
  );

  // Reportes de scrap
  app.get(
    "/api/inventory/scrap/report",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.getScrapReport
  );

  // Consumir material con scrap automático
  app.post(
    "/api/inventory/consume",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.consumeMaterial
  );

  // Búsqueda sin autenticación (problema de seguridad existente)
  app.get(
    "/api/search-by-serial",
    inventory.findAllBySerial
  );

  app.get(
    "/api/search-by-mac",
    inventory.findAllByMac
  );

  // Rutas para inventario
  app.post(
    "/api/inventory",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.create
  );

  app.get(
    "/api/inventory",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.findAll
  );

  
  app.get(
    "/api/inventory/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    inventory.findOne
  );

  app.put(
    "/api/inventory/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.update
  );

  app.patch(
    "/api/inventory/:id/status",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.changeStatus
  );

  app.patch(
    "/api/inventory/:id/assign",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.assignToClient
  );

  app.delete(
    "/api/inventory/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    inventory.delete
  );
  

};