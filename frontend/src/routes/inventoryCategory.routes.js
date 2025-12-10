// backend/src/routes/inventoryCategory.routes.js
const { authJwt } = require("../middleware");
const inventoryCategoryController = require("../controllers/inventoryCategory.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.get("/api/inventory-categories", [authJwt.verifyToken], inventoryCategoryController.getAll);
  app.get("/api/inventory-categories/:id", [authJwt.verifyToken], inventoryCategoryController.getById);
  app.post("/api/inventory-categories", [authJwt.verifyToken], inventoryCategoryController.create);
  app.put("/api/inventory-categories/:id", [authJwt.verifyToken], inventoryCategoryController.update);
  app.delete("/api/inventory-categories/:id", [authJwt.verifyToken], inventoryCategoryController.delete);
};
