// backend/src/routes/snmpOid.routes.js
const { authJwt } = require("../middleware");
const snmpOidController = require("../controllers/snmpOid.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Crear nuevo SNMP OID
  app.post(
    "/api/snmp-oids",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    snmpOidController.create
  );

  // Obtener todos los SNMP OIDs
  app.get(
    "/api/snmp-oids",
    //[authJwt.verifyToken],
    snmpOidController.findAll
  );

  // Obtener SNMP OID específico por ID
  app.get(
    "/api/snmp-oids/:id",
    //[authJwt.verifyToken],
    snmpOidController.findOne
  );

  // Actualizar SNMP OID
  app.put(
    "/api/snmp-oids/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    snmpOidController.update
  );

  // Eliminar SNMP OID
  app.delete(
    "/api/snmp-oids/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    snmpOidController.delete
  );

  // Obtener OIDs por marca específica
  app.get(
    "/api/brands/:brandId/snmp-oids",
    //[authJwt.verifyToken],
    snmpOidController.findByBrand
  );

  // Obtener OIDs por familia específica
  app.get(
    "/api/families/:familyId/snmp-oids",
    //[authJwt.verifyToken],
    snmpOidController.findByFamily
  );
};