// backend/src/controllers/metrics.controller.js
const metricsService = require('../services/metrics.service');

/**
 * Controlador de métricas del sistema
 */
class MetricsController {
  /**
   * Obtiene todas las métricas del dashboard
   * GET /api/metrics/dashboard
   */
  async getDashboardMetrics(req, res) {
    try {
      const metrics = await metricsService.getDashboardMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getDashboardMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas del dashboard',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de clientes
   * GET /api/metrics/clients
   */
  async getClientMetrics(req, res) {
    try {
      const metrics = await metricsService.getClientMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getClientMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de clientes',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de pagos
   * GET /api/metrics/payments
   */
  async getPaymentMetrics(req, res) {
    try {
      const metrics = await metricsService.getPaymentMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getPaymentMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de pagos',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de servicios
   * GET /api/metrics/services
   */
  async getServiceMetrics(req, res) {
    try {
      const metrics = await metricsService.getServiceMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getServiceMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de servicios',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas del sistema
   * GET /api/metrics/system
   */
  getSystemMetrics(req, res) {
    try {
      const metrics = metricsService.getSystemMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getSystemMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas del sistema',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de plugins
   * GET /api/metrics/plugins
   */
  async getPluginMetrics(req, res) {
    try {
      const metrics = await metricsService.getPluginMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getPluginMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de plugins',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de red
   * GET /api/metrics/network
   */
  async getNetworkMetrics(req, res) {
    try {
      const metrics = await metricsService.getNetworkMetrics();

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getNetworkMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas de red',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas históricas
   * GET /api/metrics/historical?days=7
   */
  async getHistoricalMetrics(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;

      // Validar que days esté entre 1 y 90
      if (days < 1 || days > 90) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro days debe estar entre 1 y 90'
        });
      }

      const metrics = await metricsService.getHistoricalMetrics(days);

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error en getHistoricalMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas históricas',
        error: error.message
      });
    }
  }

  /**
   * Obtiene actividad reciente
   * GET /api/metrics/activity
   */
  async getRecentActivity(req, res) {
    try {
      const activity = await metricsService.getRecentActivity();

      return res.status(200).json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('Error en getRecentActivity:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo actividad reciente',
        error: error.message
      });
    }
  }
}

module.exports = new MetricsController();
