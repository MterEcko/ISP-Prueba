// backend/src/routes/deviceFamily.routes.js
const { authJwt } = require("../middleware");
const deviceFamilyController = require("../controllers/deviceFamily.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers", 
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todas las familias de dispositivos
  app.get(
    "/api/device-families",
    //[authJwt.verifyToken],
    deviceFamilyController.findAll
  );
  
  // Obtener familias por marca específica
  app.get(
    "/api/device-brands/:brandId/families",
    //[authJwt.verifyToken],
    deviceFamilyController.findByBrand
  );

  // Obtener una familia específica por ID
  app.get(
    "/api/device-families/:id",
    //[authJwt.verifyToken],
    deviceFamilyController.findOne
  );

  // Crear nueva familia de dispositivo
  app.post(
    "/api/device-families",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceFamilyController.create
  );

  // Actualizar familia de dispositivo
  app.put(
    "/api/device-families/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceFamilyController.update
  );
  
  // Eliminar familia (soft delete - marcar como inactiva)
  app.delete(
    "/api/device-families/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceFamilyController.delete
  );

  // Activar/desactivar familia
  app.patch(
    "/api/device-families/:id/toggle",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceFamilyController.toggleActive
  );




  // Obtener implementaciones de comandos de una familia
  app.get(
    "/api/device-families/:id/command-implementations",
    //[authJwt.verifyToken],
    deviceFamilyController.getCommandImplementations
  );

  // Obtener OIDs SNMP específicos de una familia
  app.get(
    "/api/device-families/:id/snmp-oids",
    //[authJwt.verifyToken],
    deviceFamilyController.getSnmpOids
  );

  // Obtener dispositivos que pertenecen a una familia
  app.get(
    "/api/device-families/:id/devices",
    //[authJwt.verifyToken],
    deviceFamilyController.getDevices
  );
};