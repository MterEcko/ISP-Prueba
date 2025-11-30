// backend/src/services/metrics.service.js
const { Op } = require('sequelize');
const db = require('../models');
const os = require('os');

/**
 * Servicio de métricas del sistema ISP
 * Recolecta estadísticas en tiempo real para el dashboard
 */
class MetricsService {
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Obtiene todas las métricas del dashboard
   * @returns {Object} - Objeto con todas las métricas
   */
  async getDashboardMetrics() {
    try {
      const [
        clientMetrics,
        paymentMetrics,
        serviceMetrics,
        systemMetrics,
        pluginMetrics,
        networkMetrics,
        recentActivity
      ] = await Promise.all([
        this.getClientMetrics(),
        this.getPaymentMetrics(),
        this.getServiceMetrics(),
        this.getSystemMetrics(),
        this.getPluginMetrics(),
        this.getNetworkMetrics(),
        this.getRecentActivity()
      ]);

      return {
        timestamp: new Date().toISOString(),
        clients: clientMetrics,
        payments: paymentMetrics,
        services: serviceMetrics,
        system: systemMetrics,
        plugins: pluginMetrics,
        network: networkMetrics,
        recentActivity
      };
    } catch (error) {
      console.error('Error obteniendo métricas del dashboard:', error);
      throw error;
    }
  }

  /**
   * Métricas de clientes
   */
  async getClientMetrics() {
    try {
      const Client = db.Client;

      // Total de clientes
      const totalClients = await Client.count();

      // Clientes activos (active = true)
      const activeClients = await Client.count({
        where: { active: true }
      });

      // Clientes inactivos/suspendidos (active = false)
      const suspendedClients = await Client.count({
        where: { active: false }
      });

      // Clientes por corte - por ahora usamos 0 ya que no tenemos esta columna
      const cutClients = 0;

      // Nuevos clientes este mes
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const newClientsThisMonth = await Client.count({
        where: {
          createdAt: {
            [Op.gte]: firstDayOfMonth
          }
        }
      });

      // Nuevos clientes hoy
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const newClientsToday = await Client.count({
        where: {
          createdAt: {
            [Op.gte]: startOfToday
          }
        }
      });

      // Distribución por estado (active boolean)
      const clientsByStatus = await Client.findAll({
        attributes: [
          'active',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['active']
      });

      return {
        total: totalClients,
        active: activeClients,
        suspended: suspendedClients,
        pending_cut: cutClients,
        new_this_month: newClientsThisMonth,
        new_today: newClientsToday,
        by_status: clientsByStatus.map(item => ({
          status: item.active ? 'activo' : 'inactivo',
          count: parseInt(item.get('count'))
        }))
      };
    } catch (error) {
      console.error('Error obteniendo métricas de clientes:', error);
      return {
        total: 0,
        active: 0,
        suspended: 0,
        pending_cut: 0,
        new_this_month: 0,
        new_today: 0,
        by_status: []
      };
    }
  }

  /**
   * Métricas de pagos
   */
  async getPaymentMetrics() {
    try {
      const Payment = db.Payment;

      // Total de pagos
      const totalPayments = await Payment.count();

      // Pagos completados
      const completedPayments = await Payment.count({
        where: { estado: 'completado' }
      });

      // Ingresos totales
      const totalRevenue = await Payment.sum('monto', {
        where: { estado: 'completado' }
      }) || 0;

      // Ingresos este mes
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const monthRevenue = await Payment.sum('monto', {
        where: {
          estado: 'completado',
          fecha_pago: {
            [Op.gte]: firstDayOfMonth
          }
        }
      }) || 0;

      // Ingresos hoy
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayRevenue = await Payment.sum('monto', {
        where: {
          estado: 'completado',
          fecha_pago: {
            [Op.gte]: startOfToday
          }
        }
      }) || 0;

      // Pagos por método
      const paymentsByMethod = await Payment.findAll({
        attributes: [
          'metodo_pago',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('monto')), 'total']
        ],
        where: { estado: 'completado' },
        group: ['metodo_pago']
      });

      // Pagos pendientes
      const pendingPayments = await Payment.count({
        where: { estado: 'pendiente' }
      });

      // Pagos fallidos
      const failedPayments = await Payment.count({
        where: { estado: 'fallido' }
      });

      return {
        total_payments: totalPayments,
        completed_payments: completedPayments,
        pending_payments: pendingPayments,
        failed_payments: failedPayments,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        month_revenue: parseFloat(monthRevenue.toFixed(2)),
        today_revenue: parseFloat(todayRevenue.toFixed(2)),
        by_method: paymentsByMethod.map(item => ({
          method: item.metodo_pago,
          count: parseInt(item.get('count')),
          total: parseFloat((item.get('total') || 0).toFixed(2))
        }))
      };
    } catch (error) {
      console.error('Error obteniendo métricas de pagos:', error);
      return {
        total_payments: 0,
        completed_payments: 0,
        pending_payments: 0,
        failed_payments: 0,
        total_revenue: 0,
        month_revenue: 0,
        today_revenue: 0,
        by_method: []
      };
    }
  }

  /**
   * Métricas de servicios
   */
  async getServiceMetrics() {
    try {
      const Service = db.Service;
      const Plan = db.Plan;

      // Total de servicios
      const totalServices = await Service.count();

      // Servicios activos
      const activeServices = await Service.count({
        where: { estado: 'activo' }
      });

      // Servicios suspendidos
      const suspendedServices = await Service.count({
        where: { estado: 'suspendido' }
      });

      // Total de planes
      const totalPlans = await Plan.count();

      // Planes activos
      const activePlans = await Plan.count({
        where: { activo: true }
      });

      // Servicios por plan
      const servicesByPlan = await Service.findAll({
        attributes: [
          'plan_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('Service.id')), 'count']
        ],
        include: [{
          model: Plan,
          attributes: ['nombre', 'precio'],
          required: false
        }],
        group: ['plan_id', 'Plan.id']
      });

      return {
        total_services: totalServices,
        active_services: activeServices,
        suspended_services: suspendedServices,
        total_plans: totalPlans,
        active_plans: activePlans,
        by_plan: servicesByPlan.map(item => ({
          plan_id: item.plan_id,
          plan_name: item.Plan ? item.Plan.nombre : 'Sin plan',
          plan_price: item.Plan ? parseFloat(item.Plan.precio) : 0,
          count: parseInt(item.get('count'))
        }))
      };
    } catch (error) {
      console.error('Error obteniendo métricas de servicios:', error);
      return {
        total_services: 0,
        active_services: 0,
        suspended_services: 0,
        total_plans: 0,
        active_plans: 0,
        by_plan: []
      };
    }
  }

  /**
   * Métricas del sistema (CPU, memoria, uptime)
   */
  getSystemMetrics() {
    try {
      // Uptime del proceso Node.js
      const processUptime = process.uptime(); // en segundos

      // Uptime del sistema operativo
      const systemUptime = os.uptime(); // en segundos

      // Uso de memoria
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // CPU info
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model || 'Unknown';
      const cpuCount = cpus.length;

      // Load average (solo en Linux/Unix)
      const loadAverage = os.loadavg(); // [1min, 5min, 15min]

      // Platform info
      const platform = os.platform();
      const architecture = os.arch();
      const hostname = os.hostname();

      return {
        process_uptime: Math.floor(processUptime),
        process_uptime_formatted: this._formatUptime(processUptime),
        system_uptime: Math.floor(systemUptime),
        system_uptime_formatted: this._formatUptime(systemUptime),
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usage_percent: ((usedMemory / totalMemory) * 100).toFixed(2),
          process: {
            rss: memoryUsage.rss, // Resident Set Size
            heap_total: memoryUsage.heapTotal,
            heap_used: memoryUsage.heapUsed,
            external: memoryUsage.external
          }
        },
        cpu: {
          model: cpuModel,
          count: cpuCount,
          load_average: {
            '1min': loadAverage[0].toFixed(2),
            '5min': loadAverage[1].toFixed(2),
            '15min': loadAverage[2].toFixed(2)
          }
        },
        platform: {
          type: platform,
          architecture: architecture,
          hostname: hostname,
          node_version: process.version
        }
      };
    } catch (error) {
      console.error('Error obteniendo métricas del sistema:', error);
      return {
        process_uptime: 0,
        system_uptime: 0,
        memory: {},
        cpu: {},
        platform: {}
      };
    }
  }

  /**
   * Métricas de plugins
   */
  async getPluginMetrics() {
    try {
      const SystemPlugin = db.SystemPlugin;

      // Total de plugins
      const totalPlugins = await SystemPlugin.count();

      // Plugins activos
      const activePlugins = await SystemPlugin.count({
        where: { enabled: true }
      });

      // Plugins inactivos
      const inactivePlugins = await SystemPlugin.count({
        where: { enabled: false }
      });

      // Plugins por categoría
      const pluginsByCategory = await SystemPlugin.findAll({
        attributes: [
          'category',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['category']
      });

      // Lista de plugins activos
      const activePluginsList = await SystemPlugin.findAll({
        where: { enabled: true },
        attributes: ['id', 'name', 'version', 'category'],
        limit: 10
      });

      return {
        total: totalPlugins,
        active: activePlugins,
        inactive: inactivePlugins,
        by_category: pluginsByCategory.map(item => ({
          category: item.category,
          count: parseInt(item.get('count'))
        })),
        active_list: activePluginsList.map(plugin => ({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          category: plugin.category
        }))
      };
    } catch (error) {
      console.error('Error obteniendo métricas de plugins:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        by_category: [],
        active_list: []
      };
    }
  }

  /**
   * Métricas de red (routers, dispositivos)
   */
  async getNetworkMetrics() {
    try {
      const Router = db.Router;
      const Device = db.Device;

      // Total de routers
      const totalRouters = await Router.count();

      // Routers activos
      const activeRouters = await Router.count({
        where: { estado: 'activo' }
      });

      // Total de dispositivos
      const totalDevices = await Device.count();

      // Dispositivos activos/conectados
      const activeDevices = await Device.count({
        where: { estado: 'conectado' }
      });

      return {
        routers: {
          total: totalRouters,
          active: activeRouters,
          inactive: totalRouters - activeRouters
        },
        devices: {
          total: totalDevices,
          active: activeDevices,
          inactive: totalDevices - activeDevices
        }
      };
    } catch (error) {
      console.error('Error obteniendo métricas de red:', error);
      return {
        routers: { total: 0, active: 0, inactive: 0 },
        devices: { total: 0, active: 0, inactive: 0 }
      };
    }
  }

  /**
   * Actividad reciente del sistema
   */
  async getRecentActivity() {
    try {
      const PluginAuditLog = db.PluginAuditLog;

      // Últimas 10 acciones de auditoría
      const recentAudit = await PluginAuditLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ['id', 'action', 'pluginName', 'username', 'description', 'severity', 'createdAt']
      });

      return {
        recent_audit: recentAudit.map(log => ({
          id: log.id,
          action: log.action,
          plugin: log.pluginName,
          user: log.username,
          description: log.description,
          severity: log.severity,
          timestamp: log.createdAt
        }))
      };
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error);
      return {
        recent_audit: []
      };
    }
  }

  /**
   * Métricas históricas para gráficos (últimos 7 días)
   */
  async getHistoricalMetrics(days = 7) {
    try {
      const Payment = db.Payment;
      const Client = db.Client;

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      daysAgo.setHours(0, 0, 0, 0);

      // Ingresos diarios
      const dailyRevenue = await Payment.findAll({
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('fecha_pago')), 'date'],
          [db.sequelize.fn('SUM', db.sequelize.col('monto')), 'total'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        where: {
          estado: 'completado',
          fecha_pago: {
            [Op.gte]: daysAgo
          }
        },
        group: [db.sequelize.fn('DATE', db.sequelize.col('fecha_pago'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('fecha_pago')), 'ASC']]
      });

      // Nuevos clientes diarios
      const dailyNewClients = await Client.findAll({
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.gte]: daysAgo
          }
        },
        group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
      });

      return {
        daily_revenue: dailyRevenue.map(item => ({
          date: item.get('date'),
          total: parseFloat((item.get('total') || 0).toFixed(2)),
          count: parseInt(item.get('count'))
        })),
        daily_new_clients: dailyNewClients.map(item => ({
          date: item.get('date'),
          count: parseInt(item.get('count'))
        }))
      };
    } catch (error) {
      console.error('Error obteniendo métricas históricas:', error);
      return {
        daily_revenue: [],
        daily_new_clients: []
      };
    }
  }

  /**
   * Formatea tiempo de uptime en formato legible
   * @private
   */
  _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

// Exportar instancia singleton
module.exports = new MetricsService();
