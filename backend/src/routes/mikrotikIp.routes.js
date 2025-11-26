// backend/src/routes/mikrotikIp.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/mikrotikIp.controller");

module.exports = function(app) {
  app.get("/api/mikrotik-ips", [authJwt.verifyToken], controller.getAll);
  app.get("/api/mikrotik-ips/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/mikrotik-ips", [authJwt.verifyToken], controller.create);
  app.put("/api/mikrotik-ips/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/mikrotik-ips/:id", [authJwt.verifyToken], controller.delete);
};
