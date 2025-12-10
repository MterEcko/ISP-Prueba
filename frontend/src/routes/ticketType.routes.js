// backend/src/routes/ticketType.routes.js
const { authJwt } = require("../middleware");
const ticketTypeController = require("../controllers/ticketType.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todos los tipos de ticket
  app.get(
    "/api/ticket-types",
    [authJwt.verifyToken],
    ticketTypeController.getAllTypes
  );

  // Obtener tipo de ticket por ID
  app.get(
    "/api/ticket-types/:id",
    [authJwt.verifyToken],
    ticketTypeController.getTypeById
  );

  // Crear nuevo tipo de ticket
  app.post(
    "/api/ticket-types",
    [authJwt.verifyToken],
    ticketTypeController.createType
  );

  // Actualizar tipo de ticket
  app.put(
    "/api/ticket-types/:id",
    [authJwt.verifyToken],
    ticketTypeController.updateType
  );

  // Eliminar tipo de ticket
  app.delete(
    "/api/ticket-types/:id",
    [authJwt.verifyToken],
    ticketTypeController.deleteType
  );
};
