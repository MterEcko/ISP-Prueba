module.exports = (router, Controller, plugin) => {
  const controller = new Controller(plugin);

  router.get('/config', (req, res) => controller.getConfig(req, res));
  router.post('/config', (req, res) => controller.saveConfig(req, res));
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.post('/test', (req, res) => controller.testConnection(req, res));
  router.post('/send', (req, res) => controller.sendEmail(req, res));

  return router;
};
