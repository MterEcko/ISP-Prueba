module.exports = (router, Controller, plugin) => {
  const controller = new Controller(plugin);

  router.get('/config', (req, res) => controller.getConfig(req, res));
  router.post('/config', (req, res) => controller.saveConfig(req, res));
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.post('/test', (req, res) => controller.testConnection(req, res));
  router.post('/order', (req, res) => controller.createOrder(req, res));
  router.post('/order/:orderId/capture', (req, res) => controller.captureOrder(req, res));
  router.get('/order/:orderId', (req, res) => controller.getOrderDetails(req, res));
  router.post('/capture/:captureId/refund', (req, res) => controller.refundCapture(req, res));

  return router;
};
