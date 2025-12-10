// backend/src/routes/mikrotikProfile.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/mikrotikProfile.controller");

module.exports = function(app) {
  app.get("/api/mikrotik-profiles", [authJwt.verifyToken], controller.getAll);
  app.get("/api/mikrotik-profiles/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/mikrotik-profiles", [authJwt.verifyToken], controller.create);
  app.put("/api/mikrotik-profiles/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/mikrotik-profiles/:id", [authJwt.verifyToken], controller.delete);
};
