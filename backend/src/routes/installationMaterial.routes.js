// backend/src/routes/installationMaterial.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/installationMaterial.controller");

module.exports = function(app) {
  app.get("/api/installation-materials", [authJwt.verifyToken], controller.getAll);
  app.get("/api/installation-materials/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/installation-materials", [authJwt.verifyToken], controller.create);
  app.put("/api/installation-materials/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/installation-materials/:id", [authJwt.verifyToken], controller.delete);
};
