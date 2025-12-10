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

  // Rutas para zonas
  app.post(
    "/api/zones",
   // [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.createZone
  );

  app.get(
    "/api/zones",
    [authJwt.verifyToken],
    network.findAllZones
  );

  app.get(
    "/api/zones/:id/nodes",
    //[authJwt.verifyToken],
    network.findNodesByZone
  );
  
  app.get(
    "/api/zones/:id",
    //[authJwt.verifyToken],
    network.findZoneById
  );

  app.put(
    "/api/zones/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.updateZone
  );

  app.delete(
    "/api/zones/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.deleteZone
  );

  // Rutas para nodos
  

  
  app.post(
    "/api/nodes",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.createNode
  );

  app.get(
    "/api/nodes",
    //[authJwt.verifyToken],
    network.findAllNodes
  );

  app.get(
    "/api/nodes/:id",
    //[authJwt.verifyToken],
    network.findNodeById
  );

  app.put(
    "/api/nodes/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.updateNode
  );

  app.delete(
    "/api/nodes/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.deleteNode
  );
  
  

  // Rutas para sectores
  app.get(
    "/api/nodes/:id/sectors",
    [authJwt.verifyToken],
    network.findNodesByZone
  );
  
   app.get(
    "/api/sectors",
    //[authJwt.verifyToken],
    network.findAllSector
  );

  
  app.get(
    "/api/nodes/:id/sectors",
    [authJwt.verifyToken],
    network.findNodesByZone
  );
  
  app.post(
    "/api/sectors",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.createSector
  );
  
  app.put(
    "/api/sectors/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.updateSector
  );
  
  app.delete(
    "/api/sectors/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    network.deleteSector
  );

  // ==================== ALIAS: /api/network/* ====================
  // Rutas alias para compatibilidad con el frontend

  app.get("/api/network/nodes", network.findAllNodes);
  app.get("/api/network/nodes/:id", network.findNodeById);
  app.post("/api/network/nodes", [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")], network.createNode);
  app.put("/api/network/nodes/:id", [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")], network.updateNode);
  app.delete("/api/network/nodes/:id", [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")], network.deleteNode);
};
