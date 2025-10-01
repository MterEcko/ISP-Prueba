const { authJwt } = require("../middleware");
const roles = require("../controllers/role.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para roles
  app.get(
    "/api/roles",
    [authJwt.verifyToken],
    roles.findAll
  );

  app.get(
    "/api/roles/:id",
    [authJwt.verifyToken],
    roles.findOne
  );

  app.post(
    "/api/roles",
    [authJwt.verifyToken, authJwt.checkPermission("manage_roles")],
    roles.create
  );

  app.put(
    "/api/roles/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_roles")],
    roles.update
  );

  app.delete(
    "/api/roles/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_roles")],
    roles.delete
  );

  // Rutas para permisos de roles
  app.get(
    "/api/roles/:id/permissions",
    [authJwt.verifyToken],
    roles.getPermissions
  );

  app.post(
    "/api/roles/:id/permissions",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_roles")],
    roles.updatePermissions
  );
};