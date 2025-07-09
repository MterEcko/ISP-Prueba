const { authJwt } = require("../middleware");
const clients = require("../controllers/client.controller");
const documents = require("../controllers/clientDocument.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para clientes
  app.post(
    "/api/clients",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.create
  );

  app.get(
    "/api/clients",
    //[authJwt.verifyToken],
    clients.findAll
  );

  app.get(
    "/api/clients/:id",
    //[authJwt.verifyToken],
    clients.findOne
  );

  app.put(
    "/api/clients/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.update
  );

  app.patch(
    "/api/clients/:id/status",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.changeStatus
  );

  app.delete(
    "/api/clients/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.delete
  );

  // Rutas para documentos de clientes
  app.post(
    "/api/clients/:clientId/documents",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    documents.uploadDocument
  );

  app.get(
    "/api/clients/:clientId/documents",
    [authJwt.verifyToken],
    documents.findAll
  );

  app.get(
    "/api/documents/:id/download",
    [authJwt.verifyToken],
    documents.download
  );

  app.delete(
    "/api/documents/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    documents.delete
  );
};