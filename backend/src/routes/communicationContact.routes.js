// backend/src/routes/communicationContact.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/communicationContact.controller");

module.exports = function(app) {
  app.get("/api/communication-contacts", [authJwt.verifyToken], controller.getAll);
  app.get("/api/communication-contacts/:id", [authJwt.verifyToken], controller.getById);
  app.post("/api/communication-contacts", [authJwt.verifyToken], controller.create);
  app.put("/api/communication-contacts/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/communication-contacts/:id", [authJwt.verifyToken], controller.delete);
};
