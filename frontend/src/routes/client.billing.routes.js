const { authJwt } = require("../middleware");
const clientBilling = require("../controllers/client.billing.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all client billings
  app.get(
    "/api/client-billing",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getAllClientBillings
  );
  
    // Create a new client billing
  app.post(
    "/api/client-billing",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.createClientBilling
  );
  
  // Process billing for all clients
  app.post(
    "/api/client-billing/process-all",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.processAllClientsBilling
  );

  // Get clients with overdue payments
  app.get(
    "/api/client-billing/overdue",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getOverdueClients
  );

  // Get clients with upcoming payments
  app.get(
    "/api/client-billing/upcoming",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getUpcomingPayments
  );
  
  // Get billing statistics
  app.get(
    "/api/client-billing/statistics",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getBillingStatistics
  );


  // Get client billing by client ID
  app.get(
    "/api/client-billing/by-client/:clientId",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getClientBillingByClientId
  );

  
  // Get client billing by ID
  app.get(
    "/api/client-billing/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("viewClientBilling")],
    clientBilling.getClientBillingById
  );


  // Update a client billing
  app.put(
    "/api/client-billing/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.updateClientBilling
  );

  // Delete a client billing
  app.delete(
    "/api/client-billing/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.deleteClientBilling
  );

  // Calculate monthly billing for a client
  app.get(
    "/api/client-billing/:clientId/calculate",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.calculateMonthlyBilling
  );



  // Generate invoice for a client
  app.post(
    "/api/client-billing/:clientId/invoice",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.generateInvoice
  );

  // Update client status
  app.put(
    "/api/client-billing/:clientId/status",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.updateClientStatus
  );

  // Register payment for a client
  app.post(
    "/api/client-billing/:clientId/payment",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.registerPayment
  );



  // Apply late payment penalty
  app.put(
    "/api/client-billing/:clientId/penalty",
    //[authJwt.verifyToken, authJwt.checkPermission("manageClientBilling")],
    clientBilling.applyLatePaymentPenalty
  );

};
