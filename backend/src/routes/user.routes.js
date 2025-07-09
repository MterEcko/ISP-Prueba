const { authJwt } = require("../middleware");
const users = require("../controllers/user.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para usuarios
  app.get(
    "/api/users",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.findAll
  );

  app.get(
    "/api/users/profile",
    //[authJwt.verifyToken],
    users.getCurrentProfile
  );

  app.get(
    "/api/users/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.findOne
  );

  app.post(
    "/api/users",
    [authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.create
  );

  app.put(
    "/api/users/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.update
  );

  app.post(
    "/api/users/:id/change-password",
    [authJwt.verifyToken],
    users.changePassword
  );

  app.patch(
    "/api/users/:id/status",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.changeStatus
  );

  app.patch(
    "/api/users/:id/role",
    [authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.changeRole
  );

  app.delete(
    "/api/users/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_users")],
    users.delete
  );
};