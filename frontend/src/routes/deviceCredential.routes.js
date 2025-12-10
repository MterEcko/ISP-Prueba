// backend/src/routes/deviceCredential.routes.js
const { authJwt } = require("../middleware");
const deviceCredentialController = require("../controllers/deviceCredential.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Crear credenciales para un dispositivo
  app.post(
    "/api/devices/:deviceId/credentials",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.create
  );

  // Obtener credenciales de un dispositivo
  app.get(
    "/api/devices/:deviceId/credentials",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.findByDevice
  );

  // Probar conexión con las credenciales
  app.post(
    "/api/device-credentials/test-connection",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.testConnection
  );

  // Actualizar credenciales
  app.put(
    "/api/device-credentials/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.update
  );

  // Rotar credenciales (cambiar contraseña/clave)
  app.post(
    "/api/device-credentials/:id/rotate",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.rotateCredentials
  );

  // Eliminar credenciales
  app.delete(
    "/api/device-credentials/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceCredentialController.delete
  );


};