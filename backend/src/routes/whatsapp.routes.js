const { authJwt } = require("../middleware");
const controller = require("../controllers/whatsapp.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ===============================
  // WEBHOOK DE WHATSAPP (sin autenticacion)
  // ===============================

  // Verificacion del webhook (Meta API)
  app.get(
    "/api/whatsapp/webhook",
    controller.verifyWebhook
  );

  // Recibir mensajes entrantes
  app.post(
    "/api/whatsapp/webhook",
    controller.receiveMessage
  );

  // ===============================
  // ENVIO DE MENSAJES (con autenticacion)
  // ===============================

  // Enviar mensaje simple
  app.post(
    "/api/whatsapp/send",
    [authJwt.verifyToken],
    controller.sendMessage
  );

  // Enviar mensajes masivos
  app.post(
    "/api/whatsapp/send-bulk",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    controller.sendBulkMessages
  );

  // Enviar template
  app.post(
    "/api/whatsapp/send-template",
    [authJwt.verifyToken],
    controller.sendTemplate
  );

  // ===============================
  // ESTADO DEL SERVICIO
  // ===============================

  app.get(
    "/api/whatsapp/status",
    [authJwt.verifyToken],
    controller.getStatus
  );
};
