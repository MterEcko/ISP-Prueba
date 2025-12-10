// backend/src/routes/settings.routes.js
const { authJwt } = require("../middleware");
const controller = require("../controllers/settings.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ===============================
  // CONFIGURACIÓN GENERAL
  // ===============================

  app.get(
    "/api/settings/general",
    //[authJwt.verifyToken],
    controller.getGeneralSettings
  );

  app.put(
    "/api/settings/general",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateGeneralSettings
  );

  // ===============================
  // CONFIGURACIÓN DE EMAIL
  // ===============================

  app.get(
    "/api/settings/email",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getEmailSettings
  );

  app.put(
    "/api/settings/email",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateEmailSettings
  );

  app.post(
    "/api/settings/email/test",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.testEmailSettings
  );

  // ===============================
  // CONFIGURACIÓN DE TELEGRAM
  // ===============================

  app.get(
    "/api/settings/telegram",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getTelegramSettings
  );

  app.put(
    "/api/settings/telegram",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateTelegramSettings
  );

  app.post(
    "/api/settings/telegram/test",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.testTelegramSettings
  );

  // ===============================
  // CONFIGURACIÓN DE WHATSAPP
  // ===============================

  app.get(
    "/api/settings/whatsapp",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getWhatsAppSettings
  );

  app.put(
    "/api/settings/whatsapp",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateWhatsAppSettings
  );

  app.post(
    "/api/settings/whatsapp/test",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.testWhatsAppSettings
  );

  // ===============================
  // CONFIGURACIÓN DE SMS
  // ===============================

  app.get(
    "/api/settings/sms",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getSMSSettings
  );

  app.put(
    "/api/settings/sms",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateSMSSettings
  );

  app.post(
    "/api/settings/sms/test",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.testSMSSettings
  );

  app.get(
    "/api/settings/sms/status",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getSMSGatewayStatus
  );

  // ===============================
  // CONFIGURACIÓN DE JELLYFIN
  // ===============================

  app.get(
    "/api/settings/jellyfin",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getJellyfinSettings
  );

  app.put(
    "/api/settings/jellyfin",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateJellyfinSettings
  );

  // ===============================
  // CONFIGURACIÓN DE PAGOS
  // ===============================

  app.get(
    "/api/settings/payments",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getPaymentSettings
  );

  app.put(
    "/api/settings/payments",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updatePaymentSettings
  );

  // ===============================
  // CONFIGURACIÓN DE MAPAS
  // ===============================

  app.get(
    "/api/settings/maps",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getMapSettings
  );

  app.put(
    "/api/settings/maps",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateMapSettings
  );

  // ===============================
  // CONFIGURACIÓN DE MONITOREO
  // ===============================

  app.get(
    "/api/settings/monitoring",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getMonitoringSettings
  );

  app.put(
    "/api/settings/monitoring",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateMonitoringSettings
  );

  // ===============================
  // CONFIGURACIÓN DE FACTURACIÓN
  // ===============================

  app.get(
    "/api/settings/billing",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getBillingSettings
  );

  app.put(
    "/api/settings/billing",
   //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateBillingSettings
  );

  // ===============================
  // CONFIGURACIÓN DE RED
  // ===============================

  app.get(
    "/api/settings/network",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getNetworkSettings
  );

  // ===============================
  // CONFIGURACIÓN DE DOMINIO Y CORS
  // ===============================

  app.get(
    "/api/settings/domain",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getDomainSettings
  );

  app.put(
    "/api/settings/domain",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.updateDomainSettings
  );

  app.post(
    "/api/settings/cors/reload",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.reloadCors
  );

  // ===============================
  // ENDPOINTS GENERALES
  // ===============================

  // Obtener todas las configuraciones agrupadas por módulo
  app.get(
    "/api/settings/all",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getAllSettings
  );

  // Obtener configuración específica por key
  app.get(
    "/api/settings/key/:key",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getConfigByKey
  );

  // Obtener todas las configuraciones de un módulo
  app.get(
    "/api/settings/module/:module",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.getConfigByModule
  );

  // Invalidar caché de configuraciones
  app.post(
    "/api/settings/cache/invalidate",
    //[authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.invalidateCache
  );

  // ===============================
  // CRUD PERSONALIZADO
  // ===============================

  // Crear nueva configuración personalizada
  app.post(
    "/api/settings",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.createSetting
  );

  // Eliminar configuración
  app.delete(
    "/api/settings/:key",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.deleteSetting
  );
};