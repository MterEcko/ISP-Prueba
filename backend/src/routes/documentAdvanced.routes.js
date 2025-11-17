// backend/src/routes/documentAdvanced.routes.js
const { authJwt } = require("../middleware");
const signatureController = require("../controllers/documentSignature.controller");
const versionController = require("../controllers/templateVersion.controller");
const exportController = require("../controllers/templateExport.controller");
const emailController = require("../controllers/documentEmail.controller");
const bulkController = require("../controllers/documentBulk.controller");
const generateController = require("../controllers/documentGenerate.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ===============================
  // 1. RUTAS ESPECÍFICAS (DESCARGA Y ENVÍO DE EMAIL)
  // ESTAS DEBEN IR PRIMERO PARA EVITAR CONFLICTOS CON :documentId
  // ===============================

  // Descargar documento generado (GET /api/documents/generated/:historyId/download)
  app.get(
    "/api/documents/generated/:historyId/download",
    //[authJwt.verifyToken],
    generateController.downloadGeneratedDocument
  );
  
  // Envío masivo de documentos (POST /api/documents/send-bulk)
  app.post(
    "/api/documents/send-bulk",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    emailController.sendBulkDocuments
  );

  // Generar documentos masivamente (POST /api/documents/generate-bulk)
  app.post(
    "/api/documents/generate-bulk",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    bulkController.generateBulkDocuments
  );

  // Descargar documentos en ZIP (POST /api/documents/download-bulk)
  app.post(
    "/api/documents/download-bulk",
    [authJwt.verifyToken],
    bulkController.downloadBulkDocuments
  );

  // ===============================
  // 2. RUTAS DE FIRMAS DIGITALES
  // ===============================

  // Crear firma (POST /api/documents/signatures)
  app.post(
    "/api/documents/signatures",
    [authJwt.verifyToken],
    signatureController.createSignature
  );

  // Obtener firmas de un documento (GET /api/documents/:documentId/signatures)
  // Esta ruta genérica puede seguir aquí
  app.get(
    "/api/documents/:documentId/signatures",
    //[authJwt.verifyToken],
    signatureController.getDocumentSignatures
  );

  // Verificar firma específica
  app.get(
    "/api/signatures/:id/verify",
    [authJwt.verifyToken],
    signatureController.verifySignature
  );

  // Revocar firma
  app.post(
    "/api/signatures/:id/revoke",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    signatureController.revokeSignature
  );

  // ===============================
  // 3. RUTAS DE ENVÍO POR EMAIL (Usando el parámetro :documentId)
  // ===============================

  // Enviar documento por email (POST /api/documents/:documentId/send-email)
  app.post(
    "/api/documents/:documentId/send-email",
    //[authJwt.verifyToken],
    emailController.sendDocumentByEmail
  );

  // Obtener historial de emails (GET /api/documents/:documentId/email-history)
  app.get(
    "/api/documents/:documentId/email-history",
    //[authJwt.verifyToken],
    emailController.getEmailHistory
  );

  // Preview de email (POST /api/documents/:documentId/email-preview)
  app.post(
    "/api/documents/:documentId/email-preview",
    //[authJwt.verifyToken],
    emailController.previewEmail
  );


  // ===============================
  // 4. RUTAS DE VERSIONAMIENTO (Templates)
  // Estas usan :templateId, por lo que están bien separadas
  // ===============================

  // Obtener todas las versiones de una plantilla
  app.get(
    "/api/templates/:templateId/versions",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    versionController.getTemplateVersions
  );

  // Crear nueva versión
  app.post(
    "/api/templates/:templateId/versions",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    versionController.createNewVersion
  );

  // Configurar envío automático
  app.post(
    "/api/templates/:templateId/auto-send",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    emailController.configureAutoSend
  );
  
  // Duplicar plantilla
  app.post(
    "/api/templates/:templateId/duplicate",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    exportController.duplicateTemplate
  );

  // Exportar plantilla
  app.get(
    "/api/templates/:templateId/export",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    exportController.exportTemplate
  );

  // Obtener historial de exportaciones
  app.get(
    "/api/templates/:templateId/export-history",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    exportController.getExportHistory
  );

  // ===============================
  // 5. RUTAS DE ID ESPECÍFICO DE VERSIONAMIENTO (Al final)
  // ===============================

  // Restaurar versión anterior
  app.post(
    "/api/templates/versions/:versionId/restore",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    versionController.restoreVersion
  );

  // Comparar dos versiones
  app.get(
    "/api/templates/versions/compare",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    versionController.compareVersions
  );

  // Importar plantilla
  app.post(
    "/api/templates/import",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    exportController.importTemplate
  );
};
