/**
 * Módulo de Rutas (Función Constructora)
 * @param {Router} router - Instancia de Express Router
 * @param {Class} ControllerClass - Clase del Controlador
 * @param {Object} pluginInstance - Instancia del Plugin (Servicio)
 */
module.exports = (router, ControllerClass, pluginInstance) => {
  
  // 1. Instanciamos el controlador con el plugin
  const controller = new ControllerClass(pluginInstance);

  // 2. Middleware de Seguridad (Lazy Load)
  const auth = async (req, res, next) => {
    try {
      const { authJwt } = require('../../../middleware');
      if (authJwt && authJwt.verifyToken) {
        return authJwt.verifyToken(req, res, next);
      }
      throw new Error('Auth no disponible');
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Error de seguridad' });
    }
  };

  // 3. Definición de Rutas (Usando arrow functions para mantener el contexto 'this' del controlador)
  
  // Aprovisionamiento
  router.post('/provision-client', auth, (req, res) => controller.provisionClient(req, res));

  // Perfiles
  router.post('/profiles', auth, (req, res) => controller.createProfile(req, res));
  router.get('/profiles', auth, (req, res) => controller.getProfiles(req, res));
  router.delete('/profiles/:profileId', auth, (req, res) => controller.deleteProfile(req, res));

  // App Externa
  router.post('/validate-app-access', (req, res) => controller.validateAppAccess(req, res));

  // Gestión Usuarios
  router.post('/assign-libraries', auth, (req, res) => controller.assignLibraries(req, res));
  router.post('/suspend-user', auth, (req, res) => controller.suspendUser(req, res));
  router.post('/activate-user', auth, (req, res) => controller.activateUser(req, res));
  router.delete('/delete-user/:userId', auth, (req, res) => controller.deleteUser(req, res));

  // Consultas
  router.get('/libraries', auth, (req, res) => controller.getLibraries(req, res));
  router.get('/statistics', auth, (req, res) => controller.getStatistics(req, res));
  router.get('/status', auth, (req, res) => controller.getStatus(req, res));
  router.post('/test', auth, (req, res) => controller.testConnection(req, res));

  return router;
};