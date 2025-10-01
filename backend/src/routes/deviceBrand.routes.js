// backend/src/routes/deviceBrand.routes.js
const { authJwt } = require("../middleware");
const deviceBrandController = require("../controllers/deviceBrand.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers", 
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todas las marcas de dispositivos
  app.get(
    "/api/device-brands",
    //[authJwt.verifyToken],
    deviceBrandController.findAll
  );

  // Obtener una marca específica por ID
  app.get(
    "/api/device-brands/:id",
    //[authJwt.verifyToken],
    deviceBrandController.findOne
  );

  // Crear nueva marca de dispositivo (solo admin)
  app.post(
    "/api/device-brands",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceBrandController.create
  );

  // Actualizar marca de dispositivo
  app.put(
    "/api/device-brands/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceBrandController.update
  );

  // Activar/desactivar marca
  app.patch(
    "/api/device-brands/:id/toggle",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceBrandController.toggleActive
  );

  // Eliminar marca (soft delete - marcar como inactiva)
  app.delete(
    "/api/device-brands/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceBrandController.delete
  );

  // Obtener familias de una marca específica
  app.get(
    "/api/device-brands/:id/families",
    //[authJwt.verifyToken],
    deviceBrandController.getFamilies
  );

  // Obtener comandos implementados por una marca
  app.get(
    "/api/device-brands/:id/commands",
    //[authJwt.verifyToken],
    deviceBrandController.getCommands
  );

  // Obtener OIDs SNMP de una marca
  app.get(
    "/api/device-brands/:id/snmp-oids",
    //[authJwt.verifyToken],
    deviceBrandController.getSnmpOids
  );
};