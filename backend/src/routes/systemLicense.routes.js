const { authJwt } = require("../middleware");
const systemLicense = require("../controllers/systemLicense.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all system licenses
  app.get(
    "/api/system-licenses",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getAllLicenses
  );

  // Get system license by ID
  app.get(
    "/api/system-licenses/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getLicenseById
  );

  // Get current active license
  app.get(
    "/api/system-licenses/current",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getCurrentLicense
  );

  // Create a new system license
  app.post(
    "/api/system-licenses",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.createLicense
  );

  // Update a system license
  app.put(
    "/api/system-licenses/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.updateLicense
  );

  // Delete a system license
  app.delete(
    "/api/system-licenses/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.deleteLicense
  );

  // Activate a system license
  app.post(
    "/api/system-licenses/activate",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.activateLicense
  );

  // Deactivate a system license
  app.put(
    "/api/system-licenses/:id/deactivate",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.deactivateLicense
  );

  // Verify license status
  app.post(
    "/api/system-licenses/verify",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.verifyLicense
  );

  // Renew a system license
  app.put(
    "/api/system-licenses/:id/renew",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.renewLicense
  );

  // Get license usage statistics
  app.get(
    "/api/system-licenses/:id/usage",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getLicenseUsage
  );
};
