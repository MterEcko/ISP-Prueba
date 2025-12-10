// backend/src/routes/ticketAttachment.routes.js
const { authJwt } = require("../middleware");
const ticketAttachmentController = require("../controllers/ticketAttachment.controller");
const upload = require("../middleware/upload");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Obtener todos los adjuntos de un ticket
  app.get(
    "/api/tickets/:ticketId/attachments",
    [authJwt.verifyToken],
    ticketAttachmentController.getTicketAttachments
  );

  // Obtener adjunto por ID
  app.get(
    "/api/ticket-attachments/:id",
    [authJwt.verifyToken],
    ticketAttachmentController.getAttachmentById
  );

  // Crear nuevo adjunto (upload de archivo)
  app.post(
    "/api/tickets/:ticketId/attachments",
    [authJwt.verifyToken, upload.single('file')],
    ticketAttachmentController.createAttachment
  );

  // Actualizar descripción de adjunto
  app.put(
    "/api/ticket-attachments/:id",
    [authJwt.verifyToken],
    ticketAttachmentController.updateAttachment
  );

  // Eliminar adjunto
  app.delete(
    "/api/ticket-attachments/:id",
    [authJwt.verifyToken],
    ticketAttachmentController.deleteAttachment
  );

  // Descargar adjunto
  app.get(
    "/api/ticket-attachments/:id/download",
    [authJwt.verifyToken],
    ticketAttachmentController.downloadAttachment
  );
};
