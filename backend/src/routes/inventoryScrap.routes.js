// backend/src/routes/inventoryScrap.routes.js
const { authJwt } = require("../middleware");
const inventoryScrapController = require("../controllers/inventoryScrap.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.get("/api/inventory-scrap", [authJwt.verifyToken], inventoryScrapController.getAll);
  app.get("/api/inventory-scrap/statistics", [authJwt.verifyToken], inventoryScrapController.getStatistics);
  app.get("/api/inventory-scrap/:id", [authJwt.verifyToken], inventoryScrapController.getById);
  app.post("/api/inventory-scrap", [authJwt.verifyToken], inventoryScrapController.create);
  app.put("/api/inventory-scrap/:id", [authJwt.verifyToken], inventoryScrapController.update);
  app.delete("/api/inventory-scrap/:id", [authJwt.verifyToken], inventoryScrapController.delete);
};
