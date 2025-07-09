// backend/src/routes/mikrotikRouter.routes.js
const { authJwt } = require("../middleware");
const mikrotikRouterController = require("../controllers/mikrotikRouter.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Crear router Mikrotik (crea automáticamente el Device)
  app.post(
    "/api/mikrotik-routers",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    mikrotikRouterController.create
  );

  // Obtener todos los routers Mikrotik
  app.get(
    "/api/mikrotik-routers",
    //[authJwt.verifyToken],
    mikrotikRouterController.findAll
  );

  // Obtener router por ID
  app.get(
    "/api/mikrotik-routers/:id",
    //[authJwt.verifyToken],
    mikrotikRouterController.findOne
  );
  
  // Actualizar router Mikrotik
app.put(
  "/api/mikrotik-routers/:id",
  //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
  mikrotikRouterController.update
);
  
};