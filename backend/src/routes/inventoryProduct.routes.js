// backend/src/routes/inventoryProduct.routes.js
const { authJwt } = require("../middleware");
const inventoryProductController = require("../controllers/inventoryProduct.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.get("/api/inventory-products", [authJwt.verifyToken], inventoryProductController.getAll);
  app.get("/api/inventory-products/:id", [authJwt.verifyToken], inventoryProductController.getById);
  app.post("/api/inventory-products", [authJwt.verifyToken], inventoryProductController.create);
  app.put("/api/inventory-products/:id", [authJwt.verifyToken], inventoryProductController.update);
  app.delete("/api/inventory-products/:id", [authJwt.verifyToken], inventoryProductController.delete);
};
