const { authJwt } = require("../middleware");
const network = require("../controllers/network.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para nodos
  app.post(
    "/api/nodes",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.createNode
  );

  app.get(
    "/api/nodes",
    [authJwt.verifyToken],
    network.findAllNodes
  );

  app.get(
    "/api/nodes/:id",
    [authJwt.verifyToken],
    network.findNodeById
  );

  app.put(
    "/api/nodes/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.updateNode
  );

  app.delete(
    "/api/nodes/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.deleteNode
  );

  // Rutas para sectores
  app.post(
    "/api/sectors",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.createSector
  );

  app.get(
    "/api/sectors",
    [authJwt.verifyToken],
    network.findAllSectors
  );

  app.get(
    "/api/sectors/:id",
    [authJwt.verifyToken],
    network.findSectorById
  );

  app.put(
    "/api/sectors/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.updateSector
  );

  app.delete(
    "/api/sectors/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_network")],
    network.deleteSector
  );
};