// backend/src/routes/service.package.routes.js
const { authJwt } = require("../middleware");
const ServicePackage = require("../controllers/service.package.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all service packages
  app.get(
    "/api/service-packages",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getAllServicePackages
  );


  // Create a new service package
  app.post(
    "/api/service-packages",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.createServicePackage
  );

  
    // Get service package statistics
  app.get(
    "/api/service-packages/statistics",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getPackageStatistics
  );



  // Get service package by ID
  app.get(
    "/api/service-packages/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getServicePackageById
  );



  // Update a service package
  app.put(
    "/api/service-packages/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.updateServicePackage
  );

  // Delete a service package
  app.delete(
    "/api/service-packages/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.deleteServicePackage
  );

  // Get Mikrotik profiles for a service package
  app.get(
    "/api/service-packages/:id/profiles",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getPackageProfiles
  );

  // Create Mikrotik profiles for a service package on all routers
  app.post(
    "/api/service-packages/:id/profiles",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.createPackageProfiles
  );

  // Sync a service package with Mikrotik routers
  app.post(
    "/api/service-packages/:id/sync",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.syncPackageWithRouters
  );

// Get clients using a service package
  app.get(
    "/api/service-packages/:id/clients",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getPackageClients
  );

  // ======================================
  // RUTAS NUEVAS PARA GESTIÓN AVANZADA
  // ======================================

  /**
   * @route    PUT /api/service-packages/:id/profiles/:routerId
   * @desc     Actualizar perfil específico de un paquete en un router
   * @access   Privado (Admin)
   */
  app.put(
    "/api/service-packages/:id/profiles/:routerId",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.updatePackageProfile
  );

  /**
   * @route    DELETE /api/service-packages/:id/profiles/:routerId
   * @desc     Eliminar perfil específico de un paquete en un router
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/service-packages/:id/profiles/:routerId",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.deletePackageProfile
  );

  /**
   * @route    POST /api/service-packages/subscriptions
   * @desc     Crear suscripción de cliente con usuario PPPoE y asignación de IP
   * @access   Privado (Admin)
   */
  app.post(
    "/api/service-packages/subscriptions",
    //[authJwt.verifyToken, authJwt.checkPermission("manageServicePackages")],
    ServicePackage.createClientSubscription
  );

  /**
   * @route    GET /api/service-packages/zones/:zoneId/routers
   * @desc     Obtener routers disponibles para una zona
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/service-packages/zones/:zoneId/routers",
    //[authJwt.verifyToken, authJwt.checkPermission("viewServicePackages")],
    ServicePackage.getAvailableRouters
  );

 
};
