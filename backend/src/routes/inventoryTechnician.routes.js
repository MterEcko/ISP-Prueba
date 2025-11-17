// backend/src/routes/inventoryTechnician.routes.js

const { authJwt } = require("../middleware");
const technicianController = require("../controllers/inventoryTechnician.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Asignar material a técnico
  app.post(
    "/api/inventory/assign-to-technician",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    technicianController.assignToTechnician
  );

  // Obtener inventario de un técnico
  app.get(
    "/api/inventory/technician/:technicianId/inventory",
    //[authJwt.verifyToken],
    technicianController.getTechnicianInventory
  );

  // Consumir material (instalar en cliente)
  app.post(
    "/api/inventory/consume-material",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    technicianController.consumeMaterial
  );

  // Devolver material al almacén
  app.post(
    "/api/inventory/:id/return-to-warehouse",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    technicianController.returnToWarehouse
  );

  // Reportar material perdido
  app.post(
    "/api/inventory/:id/report-missing",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    technicianController.reportMissing
  );
};