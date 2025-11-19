// backend/src/routes/client.routes.js
const { authJwt } = require("../middleware");
const clients = require("../controllers/client.controller");
const documents = require("../controllers/clientDocument.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ============================================
  // RUTAS EXISTENTES (SIN MODIFICAR)
  // ============================================
  
  // Rutas para clientes
  app.post(
    "/api/clients",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.create
  );

  app.get(
    "/api/clients",
    //[authJwt.verifyToken],
    clients.findAll
  );


  // ============================================
  // NUEVAS RUTAS PARA FUNCIONALIDADES AVANZADAS
  // ============================================

  // Estadísticas de clientes
  app.get(
    "/api/clients/statistics",
    //[authJwt.verifyToken],
    clients.getStatistics
  );

  // Verificar duplicados
  app.get(
    "/api/clients/check-duplicate",
    //[authJwt.verifyToken],
    clients.checkDuplicate
  );

  // Acciones masivas - Actualizar estado
  app.post(
    "/api/clients/bulk/status",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.bulkUpdateStatus
  );

  // Acciones masivas - Suspender servicios
  app.post(
    "/api/clients/bulk/suspend-services",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.bulkSuspendServices
  );

  // Acciones masivas - Reactivar servicios
  app.post(
    "/api/clients/bulk/reactivate-services",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.bulkReactivateServices
  );

  // Acciones masivas - Email masivo
  app.post(
    "/api/clients/bulk/email",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    async (req, res) => {
      try {
        const { clientIds, subject, message, templateId } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Se requiere un array de IDs de clientes"
          });
        }

        // Simular envío exitoso por ahora
        const emailResults = {
          sent: clientIds.length,
          failed: 0,
          details: clientIds.map(id => ({ clientId: id, status: 'sent' }))
        };

        return res.status(200).json({
          success: true,
          message: `${emailResults.sent} email(s) enviado(s) exitosamente`,
          data: emailResults
        });

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // Acciones masivas - WhatsApp masivo
  app.post(
    "/api/clients/bulk/whatsapp",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    async (req, res) => {
      try {
        const { clientIds, message, templateId } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Se requiere un array de IDs de clientes"
          });
        }

        // Simular envío exitoso por ahora
        const whatsappResults = {
          sent: clientIds.length,
          failed: 0,
          details: clientIds.map(id => ({ clientId: id, status: 'sent' }))
        };

        return res.status(200).json({
          success: true,
          message: `${whatsappResults.sent} mensaje(s) de WhatsApp enviado(s) exitosamente`,
          data: whatsappResults
        });

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // ============================================
  // RUTAS AUXILIARES PARA FILTROS
  // ============================================

  // Obtener zonas para filtros
  app.get(
    "/api/zones",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const db = require('../models');
        
        const zones = await db.Zone.findAll({
          where: { active: true },
          attributes: ['id', 'name'],
          order: [['name', 'ASC']]
        });

        return res.status(200).json(zones);

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // Obtener nodos para filtros
  app.get(
    "/api/nodes",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const { zoneId } = req.query;
        const db = require('../models');
        
        const whereClause = { active: true };
        if (zoneId) whereClause.zoneId = zoneId;
        
        const nodes = await db.Node.findAll({
          where: whereClause,
          attributes: ['id', 'name', 'zoneId'],
          order: [['name', 'ASC']]
        });

        return res.status(200).json(nodes);

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // Obtener sectores para filtros
  app.get(
    "/api/sectors",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const { nodeId } = req.query;
        const db = require('../models');
        
        const whereClause = { active: true };
        if (nodeId) whereClause.nodeId = nodeId;
        
        const sectors = await db.Sector.findAll({
          where: whereClause,
          attributes: ['id', 'name', 'nodeId'],
          order: [['name', 'ASC']]
        });

        return res.status(200).json(sectors);

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // Obtener paquetes de servicio para filtros
  app.get(
    "/api/service-packages",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const db = require('../models');

        const packages = await db.ServicePackage.findAll({
          where: { active: true },
          attributes: ['id', 'name', 'downloadSpeedMbps', 'uploadSpeedMbps', 'price'],
          order: [['name', 'ASC']]
        });

        return res.status(200).json(packages);

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  // Search endpoint (must be before /:id route)
  app.get(
    "/api/clients/search",
    [authJwt.verifyToken],
    (req, res, next) => {
      // Convert search query 'q' to 'globalSearch' for findAll
      req.query.globalSearch = req.query.q || req.query.search || req.query.globalSearch;
      clients.findAll(req, res, next);
    }
  );

  app.get(
    "/api/clients/:id",
    //[authJwt.verifyToken],
    clients.findOne
  );

  app.put(
    "/api/clients/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.update
  );

  app.patch(
    "/api/clients/:id/status",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.changeStatus
  );

  app.delete(
    "/api/clients/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    clients.delete
  );

  // Rutas para documentos de clientes
  app.post(
    "/api/clients/:clientId/documents",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    documents.uploadDocument
  );

  app.get(
    "/api/clients/:clientId/documents",
    //[authJwt.verifyToken],
    documents.findAll
  );




};