const { authJwt } = require("../middleware");
const controller = require("../controllers/sms.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ===============================
  // ENVIO DE SMS
  // ===============================

  // Enviar SMS simple
  app.post(
    "/api/sms/send",
    [authJwt.verifyToken],
    controller.sendSMS
  );

  // Enviar SMS con template
  app.post(
    "/api/sms/send-template",
    [authJwt.verifyToken],
    controller.sendSMSWithTemplate
  );

  // Enviar recordatorio de pago
  app.post(
    "/api/sms/payment-reminder",
    [authJwt.verifyToken],
    controller.sendPaymentReminder
  );

  // Enviar notificacion de mantenimiento de red
  app.post(
    "/api/sms/network-maintenance",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.sendNetworkMaintenance
  );

  // Enviar SMS masivo
  app.post(
    "/api/sms/send-bulk",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.sendBulkSMS
  );

  // ===============================
  // ESTADO DEL GATEWAY
  // ===============================

  app.get(
    "/api/sms/status",
    [authJwt.verifyToken],
    controller.getStatus
  );
};
