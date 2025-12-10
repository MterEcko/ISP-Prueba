// backend/src/routes/notificationQueue.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/notificationQueue.controller");

module.exports = function(app) {
  app.get("/api/notification-queue", [authJwt.verifyToken], controller.getAll);
  app.get("/api/notification-queue/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/notification-queue", [authJwt.verifyToken], controller.create);
  app.put("/api/notification-queue/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/notification-queue/:id", [authJwt.verifyToken], controller.delete);
  app.post("/api/notification-queue/:id/cancel", [authJwt.verifyToken], controller.cancelPending);
};
