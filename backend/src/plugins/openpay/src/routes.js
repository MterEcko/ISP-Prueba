module.exports = (router, Controller, plugin) => {
  const controller = new Controller(plugin);

  router.get('/config', (req, res) => controller.getConfig(req, res));
  router.post('/config', (req, res) => controller.saveConfig(req, res));
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.post('/test', (req, res) => controller.testConnection(req, res));
  router.post('/charge', (req, res) => controller.createCharge(req, res));
  router.get('/charge/:chargeId', (req, res) => controller.getCharge(req, res));
  router.post('/customer', (req, res) => controller.createCustomer(req, res));
  router.post('/transaction/:transactionId/refund', (req, res) => controller.refund(req, res));

  return router;
};
