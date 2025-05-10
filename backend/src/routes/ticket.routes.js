const { authJwt } = require("../middleware");
const ticketController = require("../controllers/ticket.controller");
const commentController = require("../controllers/ticketComment.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para tickets
  app.post(
    "/api/tickets",
    [authJwt.verifyToken],
    ticketController.create
  );

  app.get(
    "/api/tickets",
    [authJwt.verifyToken],
    ticketController.findAll
  );

  app.get(
    "/api/tickets/:id",
    [authJwt.verifyToken],
    ticketController.findOne
  );

  app.put(
    "/api/tickets/:id",
    [authJwt.verifyToken],
    ticketController.update
  );

  app.delete(
    "/api/tickets/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_tickets")],
    ticketController.delete
  );

  // Rutas para comentarios de tickets
  app.post(
    "/api/tickets/:ticketId/comments",
    [authJwt.verifyToken],
    commentController.addComment
  );

  app.get(
    "/api/tickets/:ticketId/comments",
    [authJwt.verifyToken],
    commentController.getComments
  );

  app.put(
    "/api/comments/:commentId",
    [authJwt.verifyToken],
    commentController.updateComment
  );

  app.delete(
    "/api/comments/:commentId",
    [authJwt.verifyToken],
    commentController.deleteComment
  );
};