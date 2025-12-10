// backend/src/routes/commandParameter.routes.js
const { authJwt } = require("../middleware");
const commandParameterController = require("../controllers/commandParameter.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.get("/api/command-parameters", [authJwt.verifyToken], commandParameterController.getAll);
  app.get("/api/command-parameters/:id", [authJwt.verifyToken], commandParameterController.getById);
  app.post("/api/command-parameters", [authJwt.verifyToken], commandParameterController.create);
  app.put("/api/command-parameters/:id", [authJwt.verifyToken], commandParameterController.update);
  app.delete("/api/command-parameters/:id", [authJwt.verifyToken], commandParameterController.delete);
};
