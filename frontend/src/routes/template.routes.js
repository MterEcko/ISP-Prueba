// backend/src/routes/template.routes.js
const { authJwt } = require("../middleware");
const templateController = require("../controllers/template.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== GESTIÓN DE PLANTILLAS ====================

  // Obtener todas las plantillas
  app.get(
    "/api/templates",
    //[authJwt.verifyToken],
    templateController.getAllTemplates
  );
  
    // Obtener variables disponibles
  app.get(
    "/api/templates/variables",
    //[authJwt.verifyToken],
    templateController.getAvailableVariables
  );

  // Obtener plantilla por ID
  app.get(
    "/api/templates/:id",
    //[authJwt.verifyToken],
    templateController.getTemplateById
  );

  // Crear nueva plantilla
  app.post(
    "/api/templates",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_templates")],
    templateController.createTemplate
  );

  // Actualizar plantilla
  app.put(
    "/api/templates/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_templates")],
    templateController.updateTemplate
  );

  // Eliminar plantilla
  app.delete(
    "/api/templates/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_templates")],
    templateController.deleteTemplate
  );

  // Vista previa de plantilla
  app.post(
    "/api/templates/:id/preview",
    //[authJwt.verifyToken],
    templateController.previewTemplate
  );

  // Duplicar plantilla
  app.post(
    "/api/templates/:id/duplicate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_templates")],
    templateController.duplicateTemplate
  );

  // ==================== ALIAS: /api/message-templates ====================
  // Rutas alias para compatibilidad con el frontend

  app.get("/api/message-templates", templateController.getAllTemplates);
  app.get("/api/message-templates/variables", templateController.getAvailableVariables);
  app.get("/api/message-templates/:id", templateController.getTemplateById);
  app.post("/api/message-templates", templateController.createTemplate);
  app.put("/api/message-templates/:id", templateController.updateTemplate);
  app.delete("/api/message-templates/:id", templateController.deleteTemplate);
  app.post("/api/message-templates/:id/preview", templateController.previewTemplate);
  app.post("/api/message-templates/:id/duplicate", templateController.duplicateTemplate);
};


