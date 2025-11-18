// backend/src/routes/systemPlugin.routes.js
const { authJwt } = require("../middleware");
const systemPluginController = require("../controllers/systemPlugin.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== GESTIÓN DE PLUGINS DEL SISTEMA ====================

  // Obtener todos los plugins del sistema
  app.get(
    "/api/system-plugins",
    [authJwt.verifyToken],
    systemPluginController.getAllPlugins
  );


  // ==================== GESTIÓN MASIVA ====================

  // Inicializar todos los plugins activos
  app.post(
    "/api/system-plugins/initialize",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.initializeAllPlugins
  );

  // ==================== LEGACY COMPATIBILITY ====================
  // Mantener compatibilidad con rutas anteriores si existen

  // Obtener menús de plugins (si se necesita para el frontend)
  app.get(
    "/api/system-plugins/menu-items",
    [authJwt.verifyToken],
    systemPluginController.getPluginMenuItems || function(req, res) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Función no implementada en la nueva versión'
      });
    }
  );

  // Obtener permisos de plugins (si se necesita para el frontend)
  app.get(
    "/api/system-plugins/permissions",
    [authJwt.verifyToken],
    systemPluginController.getPluginPermissions || function(req, res) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Función no implementada en la nueva versión'
      });
    }
  );


  // Obtener plugins activos
  app.get(
    "/api/system-plugins/active",
    [authJwt.verifyToken],
    systemPluginController.getActivePlugins
  );

  // Obtener plugins disponibles en el sistema de archivos
  app.get(
    "/api/system-plugins/available",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.getAvailablePlugins
  );

  // Registrar/Crear nuevo plugin en la base de datos
  app.post(
    "/api/system-plugins",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.createPlugin
  );

  // Obtener plugin por ID
  app.get(
    "/api/system-plugins/:id",
    [authJwt.verifyToken],
    systemPluginController.getPluginById
  );

  // Actualizar plugin
  app.put(
    "/api/system-plugins/:id",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.updatePlugin
  );

  // Activar plugin
  app.post(
    "/api/system-plugins/:id/activate",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.activatePlugin
  );

  // Desactivar plugin
  app.post(
    "/api/system-plugins/:id/deactivate",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.deactivatePlugin
  );

  // Eliminar plugin
  app.delete(
    "/api/system-plugins/:id",
    [authJwt.verifyToken, authJwt.isAdmin],
    systemPluginController.deletePlugin
  );

  // Recargar plugin
  app.post(
    "/api/system-plugins/:id/reload",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.reloadPlugin
  );

  // ==================== CONFIGURACIÓN DE PLUGINS ====================

  // Obtener configuración de plugin
  app.get(
    "/api/system-plugins/:id/config",
    [authJwt.verifyToken],
    systemPluginController.getPluginConfig
  );

  // Actualizar configuración de plugin
  app.put(
    "/api/system-plugins/:id/config",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    systemPluginController.updatePluginConfig
  );


};