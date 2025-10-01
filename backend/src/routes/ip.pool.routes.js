const { authJwt } = require("../middleware");
const ipPool = require("../controllers/ip.pool.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all IP pools
  app.get(
    "/api/ip-pools",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getAllIpPools
  );

  // Get IP pool by ID
  app.get(
    "/api/ip-pools/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getIpPoolById
  );

  // Create a new IP pool
  app.post(
    "/api/ip-pools",
    //[authJwt.verifyToken, authJwt.checkPermission("manageIpPools")],
    ipPool.createIpPool
  );

  // Update an IP pool
  app.put(
    "/api/ip-pools/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageIpPools")],
    ipPool.updateIpPool
  );

  // Delete an IP pool
  app.delete(
    "/api/ip-pools/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageIpPools")],
    ipPool.deleteIpPool
  );

  // Get IP pools by Mikrotik router ID
  app.get(
    "/api/ip-pools/mikrotik/:mikrotikRouterId",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getIpPoolsByMikrotikId
  );

  // Get IP pools by type
  app.get(
    "/api/ip-pools/type/:poolType",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getIpPoolsByType
  );

  // Sync IP pool with Mikrotik router
  app.post(
    "/api/ip-pools/:id/sync",
    //[authJwt.verifyToken, authJwt.checkPermission("manageIpPools")],
    ipPool.syncIpPoolWithRouter
  );

  // Get available IPs in a pool
  app.get(
    "/api/ip-pools/:id/available-ips",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getPoolAvailableIPs
  );

  // Get clients in a pool
  app.get(
    "/api/ip-pools/:id/clients",
    //[authJwt.verifyToken, authJwt.checkPermission("viewIpPools")],
    ipPool.getPoolClients
  );
  
  // Sync pools from Mikrotik router
  app.post(
    "/api/ip-pools/sync-from-mikrotik/:mikrotikRouterId",
    //[authJwt.verifyToken, authJwt.checkPermission("manageIpPools")],
    ipPool.syncPoolsFromMikrotik
  );
};
