// backend/src/routes/mikrotikPPPOE.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/mikrotikPPPOE.controller");

module.exports = function(app) {
  app.get("/api/mikrotik-pppoe", [authJwt.verifyToken], controller.getAll);
  app.get("/api/mikrotik-pppoe/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/mikrotik-pppoe", [authJwt.verifyToken], controller.create);
  app.put("/api/mikrotik-pppoe/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/mikrotik-pppoe/:id", [authJwt.verifyToken], controller.delete);
};
