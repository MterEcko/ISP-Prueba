// backend/src/routes/inventoryBatch.routes.js

const { authJwt } = require("../middleware");
const batchController = require("../controllers/inventoryBatch.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Crear nuevo lote
  app.post(
    "/api/inventory/batches",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    batchController.create
  );

  // Agregar items al lote
  app.post(
    "/api/inventory/batches/:id/add-items",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    batchController.addItems
  );

  // Completar lote
  app.post(
    "/api/inventory/batches/:id/complete",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    batchController.complete
  );

  // Cancelar lote
  app.post(
    "/api/inventory/batches/:id/cancel",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    batchController.cancel
  );

  // Listar todos los lotes
  app.get(
    "/api/inventory/batches",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    batchController.findAll
  );

  // Obtener lote por ID
  app.get(
    "/api/inventory/batches/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    batchController.findOne
  );
};