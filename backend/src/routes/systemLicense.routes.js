const { authJwt } = require("../middleware");
const systemLicense = require("../controllers/systemLicense.controller");
const licenseRegistration = require("../controllers/licenseRegistration.controller");

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
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getAllLicenses
  );

  // Get current active license (DEBE IR ANTES de /:id)
  // USAR licenseRegistration que tiene integración con Store
  app.get(
    "/api/system-licenses/current",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    licenseRegistration.getCurrentLicense
  );

  // Get system license by ID
  app.get(
    "/api/system-licenses/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getLicenseById
  );

  // Create a new system license
  app.post(
    "/api/system-licenses",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.createLicense
  );

  // Update a system license
  app.put(
    "/api/system-licenses/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.updateLicense
  );

  // Delete a system license
  app.delete(
    "/api/system-licenses/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.deleteLicense
  );

  // Activate a system license - USAR licenseRegistration con Store
  app.post(
    "/api/system-licenses/activate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    licenseRegistration.registerCompanyAndLicense
  );

  // Deactivate a system license
  app.put(
    "/api/system-licenses/:id/deactivate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.deactivateLicense
  );

  // Verify license status - USAR licenseRegistration con Store
  app.post(
    "/api/system-licenses/verify",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    licenseRegistration.validateLicenseKey
  );

  // Renew a system license
  app.put(
    "/api/system-licenses/:id/renew",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.renewLicense
  );

  // Get license usage statistics
  app.get(
    "/api/system-licenses/:id/usage",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    systemLicense.getLicenseUsage
  );
};
