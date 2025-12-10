// backend/src/routes/metrics.routes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const { authJwt } = require('../middleware');

module.exports = function(app) {
  // Todas las rutas de métricas requieren autenticación
  app.use('/api/metrics', router);

  /**
   * GET /api/metrics/dashboard
   * Obtiene todas las métricas del dashboard
   * Requiere: Usuario autenticado
   */
  router.get('/dashboard', [authJwt.verifyToken], metricsController.getDashboardMetrics);

  /**
   * GET /api/metrics/clients
   * Obtiene métricas de clientes
   * Requiere: Usuario autenticado
   */
  router.get('/clients', [authJwt.verifyToken], metricsController.getClientMetrics);

  /**
   * GET /api/metrics/payments
   * Obtiene métricas de pagos
   * Requiere: Usuario autenticado
   */
  router.get('/payments', [authJwt.verifyToken], metricsController.getPaymentMetrics);

  /**
   * GET /api/metrics/services
   * Obtiene métricas de servicios
   * Requiere: Usuario autenticado
   */
  router.get('/services', [authJwt.verifyToken], metricsController.getServiceMetrics);

  /**
   * GET /api/metrics/system
   * Obtiene métricas del sistema (CPU, memoria, uptime)
   * Requiere: Admin o Manager
   */
  router.get('/system', [authJwt.verifyToken, authJwt.isAdminOrManager], metricsController.getSystemMetrics);

  /**
   * GET /api/metrics/plugins
   * Obtiene métricas de plugins
   * Requiere: Admin o Manager
   */
  router.get('/plugins', [authJwt.verifyToken, authJwt.isAdminOrManager], metricsController.getPluginMetrics);

  /**
   * GET /api/metrics/network
   * Obtiene métricas de red (routers, dispositivos)
   * Requiere: Usuario autenticado
   */
  router.get('/network', [authJwt.verifyToken], metricsController.getNetworkMetrics);

  /**
   * GET /api/metrics/historical?days=7
   * Obtiene métricas históricas
   * Requiere: Usuario autenticado
   */
  router.get('/historical', [authJwt.verifyToken], metricsController.getHistoricalMetrics);

  /**
   * GET /api/metrics/activity
   * Obtiene actividad reciente del sistema
   * Requiere: Admin o Manager
   */
  router.get('/activity', [authJwt.verifyToken, authJwt.isAdminOrManager], metricsController.getRecentActivity);

  console.log('✅ Rutas de métricas configuradas');
};
