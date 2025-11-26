// backend/src/routes/communicationEvent.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/communicationEvent.controller");

module.exports = function(app) {
  app.get("/api/communication-events", [authJwt.verifyToken], controller.getAll);
  app.get("/api/communication-events/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/communication-events", [authJwt.verifyToken], controller.create);
  app.put("/api/communication-events/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/communication-events/:id", [authJwt.verifyToken], controller.delete);
};
