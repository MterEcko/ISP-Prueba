const { authJwt } = require("../middleware");
const permissions = require("../controllers/permission.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para permisos
  app.get(
    "/api/permissions",
    [authJwt.verifyToken],
    permissions.findAll
  );

  app.get(
    "/api/permissions/:id",
    //[authJwt.verifyToken],
    permissions.findOne
  );

  app.post(
    "/api/permissions",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_permissions")],
    permissions.create
  );

  app.put(
    "/api/permissions/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_permissions")],
    permissions.update
  );

  app.delete(
    "/api/permissions/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_permissions")],
    permissions.delete
  );
};