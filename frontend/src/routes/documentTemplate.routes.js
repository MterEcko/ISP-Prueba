// backend/src/routes/documentTemplate.routes.js
const { authJwt } = require("../middleware");
const templateController = require("../controllers/documentTemplate.controller");
const generateController = require("../controllers/documentGenerate.controller");
const documents = require("../controllers/clientDocument.controller");


module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ===============================
  // RUTAS PÚBLICAS (con autenticación básica)
  // ===============================

  // Obtener plantillas activas (usuarios normales)
  app.get(
    "/api/document-templates/active",
    //[authJwt.verifyToken],
    templateController.getActiveTemplates
  );

  // Obtener plantilla específica
  app.get(
    "/api/document-templates/:id",
    [authJwt.verifyToken],
    templateController.getTemplateById
  );

  // Obtener variables disponibles de un cliente
  app.get(
    "/api/document-templates/client/:clientId/variables",
    [authJwt.verifyToken],
    templateController.getClientVariables
  );

  // ===============================
  // RUTAS DE GENERACIÓN DE DOCUMENTOS
  // ===============================

  // Preview de documento con datos del cliente
  app.get(
    "/api/documents/preview/:templateId/:clientId",
    //[authJwt.verifyToken],
    generateController.previewDocument
  );

  // Generar documento PDF
  app.post(
    "/api/documents/generate/:templateId/:clientId",
    [authJwt.verifyToken],
    generateController.generateDocument
  );

  // Obtener historial de documentos generados de un cliente
  app.get(
    "/api/documents/history/:clientId",
    //[authJwt.verifyToken],
    generateController.getClientDocumentHistory
  );

  // Marcar documento como firmado
  app.post(
    "/api/documents/sign/:historyId",
    [authJwt.verifyToken],
    generateController.signDocument
  );
  
  app.get(
    "/api/documents/:id/download",
    //[authJwt.verifyToken],
    documents.download
  );

  app.delete(
    "/api/documents/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    documents.delete
  );

  // ===============================
  // RUTAS DE ADMINISTRACIÓN (solo admin)
  // ===============================

  // Obtener todas las plantillas (admin)
  app.get(
    "/api/admin/document-templates",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.getAllTemplates
  );

  // Crear nueva plantilla (admin)
  app.post(
    "/api/admin/document-templates",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.createTemplate
  );

  // Actualizar plantilla (admin)
  app.put(
    "/api/admin/document-templates/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.updateTemplate
  );

  // Habilitar/Deshabilitar plantilla (admin)
  app.patch(
    "/api/admin/document-templates/:id/toggle",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.toggleTemplateStatus
  );

  // Eliminar plantilla (admin)
  app.delete(
    "/api/admin/document-templates/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.deleteTemplate
  );

  // Obtener contenido HTML de plantilla (admin)
  app.get(
    "/api/admin/document-templates/:id/content",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    templateController.getTemplateContent
  );
};