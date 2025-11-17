// backend/src/routes/inventoryReconciliation.routes.js

const { authJwt } = require("../middleware");
const reconciliationController = require("../controllers/inventoryReconciliation.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Generar reconciliación para técnico y período
  app.post(
    "/api/inventory/reconciliations/generate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    reconciliationController.generateReconciliation
  );

  // Obtener todas las reconciliaciones (con filtros)
  app.get(
    "/api/inventory/reconciliations",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    reconciliationController.getAllReconciliations
  );

  // Obtener reconciliaciones de un técnico
  app.get(
    "/api/inventory/reconciliations/technician/:technicianId",
    //[authJwt.verifyToken],
    reconciliationController.getTechnicianReconciliations
  );

  // Aprobar reconciliación
  app.put(
    "/api/inventory/reconciliations/:id/approve",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    reconciliationController.approveReconciliation
  );

  // Balance actual de técnico
  app.get(
    "/api/inventory/technician/:technicianId/balance",
    //[authJwt.verifyToken],
    reconciliationController.getTechnicianBalance
  );

  // Reporte de material sin registrar
  app.get(
    "/api/inventory/unregistered-report",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    reconciliationController.getUnregisteredReport
  );

  // Cerrar material sin registrar (admin)
  app.post(
    "/api/inventory/:id/close-unregistered",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    reconciliationController.closeUnregistered
  );
};