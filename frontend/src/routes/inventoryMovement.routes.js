const { authJwt } = require("../middleware");
const movements = require("../controllers/inventoryMovement.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para movimientos de inventario
  app.post(
    "/api/inventory/movements",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    movements.create
  );

  app.get(
    "/api/inventory/movements",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    movements.findAll
  );

  app.get(
    "/api/inventory/movements/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    movements.findOne
  );

  app.get(
    "/api/inventory/movements/item/:itemId",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    movements.findByItem
  );

  app.delete(
    "/api/inventory/movements/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    movements.delete
  );
};