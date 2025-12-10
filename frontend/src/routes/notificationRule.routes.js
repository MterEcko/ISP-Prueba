// backend/src/routes/notificationRule.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/notificationRule.controller");

module.exports = function(app) {
  app.get("/api/notification-rules", [authJwt.verifyToken], controller.getAll);
  app.get("/api/notification-rules/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/notification-rules", [authJwt.verifyToken], controller.create);
  app.put("/api/notification-rules/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/notification-rules/:id", [authJwt.verifyToken], controller.delete);
};
