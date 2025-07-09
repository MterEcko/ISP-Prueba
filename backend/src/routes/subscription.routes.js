// backend/src/routes/subscription.routes.js
const { authJwt } = require("../middleware");
const subscriptionController = require("../controllers/client.subscription.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  /**
   * @route    POST /api/subscriptions
   * @desc     Crear nueva suscripción completa para un cliente
   * @access   Privado (Admin)
   */
  app.post(
    "/api/subscriptions",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.createSubscription
  );

  /**
   * @route    GET /api/subscriptions/:id
   * @desc     Obtener detalles completos de una suscripción
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/subscriptions/:id",
    //[authJwt.verifyToken],
    subscriptionController.getSubscriptionDetails
  );

  /**
   * @route    GET /api/clients/:clientId/subscriptions
   * @desc     Obtener todas las suscripciones de un cliente
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/clients/:clientId/subscriptions",
    //[authJwt.verifyToken],
    subscriptionController.getClientSubscriptions
  );

  /**
   * @route    PUT /api/subscriptions/:id/change-plan
   * @desc     Cambiar plan de servicio de una suscripción
   * @access   Privado (Admin)
   */
  app.put(
    "/api/subscriptions/:id/change-plan",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.changeServicePlan
  );

  /**
   * @route    POST /api/subscriptions/:id/suspend
   * @desc     Suspender suscripción por falta de pago o razón administrativa
   * @access   Privado (Admin)
   */
  app.post(
    "/api/subscriptions/:id/suspend",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.suspendSubscription
  );

  /**
   * @route    POST /api/subscriptions/:id/reactivate
   * @desc     Reactivar suscripción después de pago o resolución
   * @access   Privado (Admin)
   */
  app.post(
    "/api/subscriptions/:id/reactivate",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.reactivateSubscription
  );

  /**
   * @route    POST /api/subscriptions/:id/cancel
   * @desc     Cancelar suscripción permanentemente
   * @access   Privado (Admin)
   */
  app.post(
    "/api/subscriptions/:id/cancel",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.cancelSubscription
  );

  /**
   * @route    GET /api/subscriptions/statistics
   * @desc     Obtener estadísticas generales de suscripciones
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/subscriptions/statistics",
    [authJwt.verifyToken],
    subscriptionController.getSubscriptionStatistics
  );

  /**
   * @route    GET /api/subscriptions/search
   * @desc     Búsqueda avanzada de suscripciones con filtros
   * @access   Privado (Admin, Técnico)
   */
  app.get(
    "/api/subscriptions/search",
    [authJwt.verifyToken],
    subscriptionController.searchSubscriptions
  );

  /**
   * @route    POST /api/subscriptions/process-overdue
   * @desc     Procesar suscripciones vencidas (suspensión automática)
   * @access   Privado (Admin) - Típicamente usado por cron jobs
   */
  app.post(
    "/api/subscriptions/process-overdue",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    subscriptionController.processOverdueSubscriptions
  );
};