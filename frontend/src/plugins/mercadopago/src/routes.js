module.exports = (router, Controller, plugin) => {
  const controller = new Controller(plugin);

  router.get('/config', (req, res) => controller.getConfig(req, res));
  router.post('/config', (req, res) => controller.saveConfig(req, res));
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.post('/test', (req, res) => controller.testConnection(req, res));
  router.post('/payment', (req, res) => controller.createPayment(req, res));
  router.post('/webhook', (req, res) => controller.handleWebhook(req, res));
  router.get('/payment/:reference/status', (req, res) => controller.getPaymentStatus(req, res));
  router.post('/payment/:paymentId/refund', (req, res) => controller.refundPayment(req, res));

  return router;
};
