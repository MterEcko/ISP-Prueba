const { authJwt } = require("../middleware");
const locations = require("../controllers/inventoryLocation.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para ubicaciones de inventario
  app.post(
    "/api/inventory/locations",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    locations.create
  );

  app.get(
    "/api/inventory/locations",
    //[authJwt.verifyToken],
    locations.findAll
  );

  app.get(
    "/api/inventory/locations/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    locations.findOne
  );

  app.put(
    "/api/inventory/locations/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    locations.update
  );

  app.delete(
    "/api/inventory/locations/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_inventory")],
    locations.delete
  );
};