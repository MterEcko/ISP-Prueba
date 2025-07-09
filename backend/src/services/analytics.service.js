const db = require('../models');
const logger = require('../utils/logger');
const moment = require('moment');
const _ = require('lodash');

class AnalyticsService {
  constructor() {
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.metricsCache = new Map();
  }

  /**
   * Obtiene métricas principales para el dashboard
   * @param {string} period - Período (day, week, month, quarter, year)
   * @returns {Promise<Object>} Métricas del dashboard
   */
  async getDashboardMetrics(period = 'month') {
    const cacheKey = `dashboard_${period}`;
    const cached = this.getCachedMetrics(cacheKey);
    if (cached) return cached;

    try {
      const startDate = moment().subtract(1, period).toDate();
      const endDate = new Date();

      // Métricas paralelas para mejor rendimiento
      const [
        clientMetrics,
        revenueMetrics,
        networkMetrics,
        ticketMetrics,
        serviceMetrics
      ] = await Promise.all([
        this.getClientMetrics(startDate, endDate),
        this.getRevenueMetrics(startDate, endDate),
        this.getNetworkMetrics(),
        this.getTicketSummary(startDate, endDate),
        this.getServiceMetrics(startDate, endDate)
      ]);

      const dashboardData = {
        period: period,
        dateRange: { startDate, endDate },
        clients: clientMetrics,
        revenue: revenueMetrics,
        network: networkMetrics,
        tickets: ticketMetrics,
        services: serviceMetrics,
        lastUpdated: new Date()
      };

      this.setCachedMetrics(cacheKey, dashboardData);

      logger.info(`Dashboard metrics generated for period: ${period}`);

      return {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      logger.error(`Error generating dashboard metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Análisis detallado de ingresos
   * @param {string} period - Período de análisis
   * @returns {Promise<Object>} Análisis de ingresos
   */
  async getRevenueAnalytics(period = 'month') {
    try {
      const startDate = moment().subtract(1, period).toDate();
      const endDate = new Date();

      // Ingresos por facturación
      const invoiceRevenue = await db.Invoice.findAll({
        attributes: [
          [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'totalRevenue'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'invoiceCount'],
          [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'date']
        ],
        where: {
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] },
          status: 'paid'
        },
        group: [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt'))],
        order: [[db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      // Ingresos por paquete de servicio
      const revenueByPackage = await db.ClientBilling.findAll({
        attributes: [
          [db.Sequelize.fn('SUM', db.Sequelize.col('monthlyFee')), 'totalRevenue'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('ClientBilling.id')), 'clientCount']
        ],
        include: [{
          model: db.servicePackage,
          as: 'servicePackage',
          attributes: ['name', 'price']
        }],
        where: {
          clientStatus: 'active'
        },
        group: ['servicePackage.id', 'servicePackage.name', 'servicePackage.price']
      });

      // Análisis de morosidad
      const overdueAnalysis = await this.getOverdueAnalysis();

      // Proyección de ingresos
      const projection = await this.calculateRevenueProjection();

      // Métricas de crecimiento
      const growthMetrics = await this.calculateGrowthMetrics(startDate, endDate);

      return {
        success: true,
        data: {
          period: period,
          totalRevenue: invoiceRevenue.reduce((sum, item) => sum + parseFloat(item.totalRevenue || 0), 0),
          dailyRevenue: invoiceRevenue,
          revenueByPackage: revenueByPackage,
          overdueAnalysis: overdueAnalysis,
          projection: projection,
          growth: growthMetrics,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating revenue analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Análisis de crecimiento de clientes
   * @returns {Promise<Object>} Tendencias de crecimiento
   */
  async getClientGrowthTrends() {
    try {
      // Clientes nuevos por mes (últimos 12 meses)
      const newClientsByMonth = await db.Client.findAll({
        attributes: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'year'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'month'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: { [db.Sequelize.Op.gte]: moment().subtract(12, 'months').toDate() }
        },
        group: [
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')),
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"'))
        ],
        order: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'ASC'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'ASC']
        ],
        raw: true
      });

      // Análisis de churn (clientes dados de baja)
      const churnAnalysis = await this.calculateChurnRate();

      // Distribución geográfica
      const geographicDistribution = await db.Client.findAll({
        attributes: [
          [db.Sequelize.fn('COUNT', db.Sequelize.col('Client.id')), 'clientCount']
        ],
        include: [{
          model: db.Sector,
          attributes: ['name'],
          include: [{
            model: db.Node,
            attributes: ['name']
          }]
        }],
        where: { active: true },
        group: ['Sector.id', 'Sector.name', 'Sector.Node.id', 'Sector.Node.name']
      });

      // Clientes por paquete de servicio
      const clientsByPackage = await db.ClientBilling.findAll({
        attributes: [
          [db.Sequelize.fn('COUNT', db.Sequelize.col('ClientBilling.id')), 'clientCount']
        ],
        include: [{
          model: db.servicePackage,
          as: 'servicePackage',
          attributes: ['name', 'downloadSpeedMbps', 'price']
        }],
        where: { clientStatus: 'active' },
        group: ['servicePackage.id', 'servicePackage.name', 'servicePackage.downloadSpeedMbps', 'servicePackage.price']
      });

      return {
        success: true,
        data: {
          newClientsByMonth: newClientsByMonth,
          churnAnalysis: churnAnalysis,
          geographicDistribution: geographicDistribution,
          clientsByPackage: clientsByPackage,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating client growth trends: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estadísticas de rendimiento de red
   * @returns {Promise<Object>} Métricas de red
   */
  async getNetworkPerformanceStats() {
    try {
      // Estado de dispositivos
      const deviceStatus = await db.Device.findAll({
        attributes: [
          'status',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Métricas de los últimos 7 días
      const recentMetrics = await db.DeviceMetric.findAll({
        attributes: [
          [db.Sequelize.fn('AVG', db.Sequelize.col('cpuUsage')), 'avgCpu'],
          [db.Sequelize.fn('AVG', db.Sequelize.col('memoryUsage')), 'avgMemory'],
          [db.Sequelize.fn('AVG', db.Sequelize.col('latency')), 'avgLatency'],
          [db.Sequelize.fn('AVG', db.Sequelize.col('packetLoss')), 'avgPacketLoss']
        ],
        where: {
          recordedAt: { [db.Sequelize.Op.gte]: moment().subtract(7, 'days').toDate() }
        },
        raw: true
      });

      // Utilización de ancho de banda por nodo
      const bandwidthByNode = await db.Device.findAll({
        attributes: [
          [db.Sequelize.fn('AVG', db.Sequelize.col('DeviceMetrics.latency')), 'avgLatency']
        ],
        include: [
          {
            model: db.Node,
            as: 'node',
            attributes: ['name']
          },
          {
            model: db.DeviceMetric,
            as: 'metrics',
            where: {
              recordedAt: { [db.Sequelize.Op.gte]: moment().subtract(24, 'hours').toDate() }
            },
            required: false
          }
        ],
        group: ['node.id', 'node.name'],
        having: db.Sequelize.where(db.Sequelize.fn('COUNT', db.Sequelize.col('DeviceMetrics.id')), '>', 0)
      });

      // Alertas activas
      const activeAlerts = await this.getActiveNetworkAlerts();

      return {
        success: true,
        data: {
          deviceStatus: deviceStatus,
          performanceMetrics: recentMetrics[0] || {},
          bandwidthByNode: bandwidthByNode,
          activeAlerts: activeAlerts,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating network performance stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Métricas de resolución de tickets
   * @returns {Promise<Object>} Análisis de tickets
   */
  async getTicketResolutionMetrics() {
    try {
      const last30Days = moment().subtract(30, 'days').toDate();

      // Tiempo promedio de resolución por prioridad
      const resolutionTimeByPriority = await db.Ticket.findAll({
        attributes: [
          'priority',
          [db.Sequelize.fn('AVG', 
            db.Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600')
          ), 'avgHours'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        where: {
          resolvedAt: { [db.Sequelize.Op.not]: null },
          createdAt: { [db.Sequelize.Op.gte]: last30Days }
        },
        group: ['priority'],
        raw: true
      });

      // Tickets por técnico
      const ticketsByTechnician = await db.Ticket.findAll({
        attributes: [
          [db.Sequelize.fn('COUNT', db.Sequelize.col('Ticket.id')), 'ticketCount'],
          [db.Sequelize.fn('AVG', 
            db.Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600')
          ), 'avgResolutionHours']
        ],
        include: [{
          model: db.User,
          as: 'assignedTo',
          attributes: ['fullName']
        }],
        where: {
          assignedToId: { [db.Sequelize.Op.not]: null },
          createdAt: { [db.Sequelize.Op.gte]: last30Days }
        },
        group: ['assignedTo.id', 'assignedTo.fullName']
      });

      // SLA compliance
      const slaCompliance = await this.calculateSLACompliance();

      // Tendencia de tickets
      const ticketTrend = await db.Ticket.findAll({
        attributes: [
          [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'date'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
          'status'
        ],
        where: {
          createdAt: { [db.Sequelize.Op.gte]: last30Days }
        },
        group: [
          db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')),
          'status'
        ],
        order: [[db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      return {
        success: true,
        data: {
          resolutionTimeByPriority: resolutionTimeByPriority,
          ticketsByTechnician: ticketsByTechnician,
          slaCompliance: slaCompliance,
          ticketTrend: ticketTrend,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating ticket resolution metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reporte de rotación de inventario
   * @returns {Promise<Object>} Análisis de inventario
   */
  async getInventoryTurnoverReport() {
    try {
      const last90Days = moment().subtract(90, 'days').toDate();

      // Items más utilizados
      const mostUsedItems = await db.InventoryMovement.findAll({
        attributes: [
          'itemId',
          [db.Sequelize.fn('SUM', db.Sequelize.col('quantityMoved')), 'totalUsed']
        ],
        include: [{
          model: db.InventoryItem,
          as: 'item',
          include: [{
            model: db.InventoryProduct,
            as: 'product',
            attributes: ['brand', 'model']
          }]
        }],
        where: {
          movementType: ['assignment', 'consumption'],
          movementDate: { [db.Sequelize.Op.gte]: last90Days }
        },
        group: ['itemId', 'item.id', 'item.product.id', 'item.product.brand', 'item.product.model'],
        order: [[db.Sequelize.fn('SUM', db.Sequelize.col('quantityMoved')), 'DESC']],
        limit: 10
      });

      // Stock crítico
      const criticalStock = await db.InventoryItem.findAll({
        attributes: [
          'id',
          'remainingQuantity',
          'totalQuantity'
        ],
        include: [{
          model: db.InventoryProduct,
          as: 'product',
          attributes: ['brand', 'model']
        }],
        where: {
          itemStatus: 'available',
          [db.Sequelize.Op.and]: [
            db.Sequelize.where(
              db.Sequelize.col('remainingQuantity'),
              db.Sequelize.Op.lt,
              db.Sequelize.literal('totalQuantity * 0.1')
            )
          ]
        }
      });

      // Generación de scrap por técnico
      const scrapByTechnician = await db.InventoryMovement.findAll({
        attributes: [
          [db.Sequelize.fn('SUM', db.Sequelize.col('scrapGenerated')), 'totalScrap']
        ],
        include: [{
          model: db.User,
          as: 'movedBy',
          attributes: ['fullName']
        }],
        where: {
          scrapGenerated: { [db.Sequelize.Op.gt]: 0 },
          movementDate: { [db.Sequelize.Op.gte]: last90Days }
        },
        group: ['movedBy.id', 'movedBy.fullName'],
        order: [[db.Sequelize.fn('SUM', db.Sequelize.col('scrapGenerated')), 'DESC']]
      });

      return {
        success: true,
        data: {
          mostUsedItems: mostUsedItems,
          criticalStock: criticalStock,
          scrapByTechnician: scrapByTechnician,
          period: '90 días',
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating inventory turnover report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Análisis de churn de clientes
   * @returns {Promise<Object>} Análisis de churn
   */
  async getChurnAnalysis() {
    try {
      const last12Months = moment().subtract(12, 'months').toDate();

      // Clientes dados de baja por mes
      const churnByMonth = await db.Client.findAll({
        attributes: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "updatedAt"')), 'year'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "updatedAt"')), 'month'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'churnedClients']
        ],
        where: {
          active: false,
          updatedAt: { [db.Sequelize.Op.gte]: last12Months }
        },
        group: [
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "updatedAt"')),
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "updatedAt"'))
        ],
        order: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "updatedAt"')), 'ASC'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "updatedAt"')), 'ASC']
        ],
        raw: true
      });

      // Razones de cancelación (basado en tickets)
      const cancellationReasons = await db.Ticket.findAll({
        attributes: [
          'description',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        where: {
          title: { [db.Sequelize.Op.iLike]: '%cancelación%' },
          createdAt: { [db.Sequelize.Op.gte]: last12Months }
        },
        group: ['description'],
        order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']],
        limit: 5,
        raw: true
      });

      // Predicción de churn (clientes en riesgo)
      const clientsAtRisk = await this.identifyClientsAtRisk();

      return {
        success: true,
        data: {
          churnByMonth: churnByMonth,
          cancellationReasons: cancellationReasons,
          clientsAtRisk: clientsAtRisk,
          period: '12 meses',
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error generating churn analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera reporte ejecutivo completo
   * @param {string} month - Mes en formato YYYY-MM
   * @returns {Promise<Object>} Reporte ejecutivo
   */
  async generateExecutiveReport(month) {
    try {
      const startDate = moment(month, 'YYYY-MM').startOf('month').toDate();
      const endDate = moment(month, 'YYYY-MM').endOf('month').toDate();

      const [
        summary,
        financial,
        operations,
        growth,
        risks
      ] = await Promise.all([
        this.getExecutiveSummary(startDate, endDate),
        this.getFinancialSummary(startDate, endDate),
        this.getOperationalSummary(startDate, endDate),
        this.getGrowthSummary(startDate, endDate),
        this.getRiskAssessment()
      ]);

      const executiveReport = {
        period: month,
        dateRange: { startDate, endDate },
        summary: summary,
        financial: financial,
        operations: operations,
        growth: growth,
        risks: risks,
        recommendations: await this.generateRecommendations(summary, financial, operations),
        generatedAt: new Date()
      };

      logger.info(`Executive report generated for ${month}`);

      return {
        success: true,
        data: executiveReport
      };
    } catch (error) {
      logger.error(`Error generating executive report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Predicción de ingresos
   * @param {number} months - Número de meses a proyectar
   * @returns {Promise<Object>} Proyección de ingresos
   */
  async predictRevenue(months = 6) {
    try {
      // Obtener histórico de ingresos de los últimos 12 meses
      const historicalRevenue = await db.Invoice.findAll({
        attributes: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'year'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'month'],
          [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'revenue']
        ],
        where: {
          status: 'paid',
          createdAt: { [db.Sequelize.Op.gte]: moment().subtract(12, 'months').toDate() }
        },
        group: [
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')),
          db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"'))
        ],
        order: [
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'ASC'],
          [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'ASC']
        ],
        raw: true
      });

      // Calcular tendencia (regresión lineal simple)
      const revenues = historicalRevenue.map(item => parseFloat(item.revenue));
      const trend = this.calculateLinearTrend(revenues);

      // Generar proyección
      const lastRevenue = revenues[revenues.length - 1] || 0;
      const projection = [];

      for (let i = 1; i <= months; i++) {
        const projectedRevenue = lastRevenue + (trend.slope * i);
        const date = moment().add(i, 'months');
        
        projection.push({
          year: date.year(),
          month: date.month() + 1,
          projectedRevenue: Math.max(0, projectedRevenue),
          confidence: Math.max(0.5, 1 - (i * 0.1)) // Confianza decrece con el tiempo
        });
      }

      return {
        success: true,
        data: {
          historical: historicalRevenue,
          projection: projection,
          trend: trend,
          totalProjected: projection.reduce((sum, item) => sum + item.projectedRevenue, 0),
          methodology: 'Linear regression with 12-month historical data'
        }
      };
    } catch (error) {
      logger.error(`Error predicting revenue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene KPIs principales
   * @returns {Promise<Object>} KPIs del sistema
   */
  async getKPIs() {
    try {
      const now = moment();
      const thisMonth = now.clone().startOf('month').toDate();
      const lastMonth = now.clone().subtract(1, 'month').startOf('month').toDate();
      const lastMonthEnd = now.clone().subtract(1, 'month').endOf('month').toDate();

      // KPIs paralelos
      const [
        totalClients,
        activeClients,
        thisMonthRevenue,
        lastMonthRevenue,
        avgTicketResolution,
        networkUptime,
        churnRate,
        arpu
      ] = await Promise.all([
        db.Client.count(),
        db.Client.count({ where: { active: true } }),
        this.getMonthRevenue(thisMonth, now.toDate()),
        this.getMonthRevenue(lastMonth, lastMonthEnd),
        this.getAvgTicketResolution(),
        this.calculateNetworkUptime(),
        this.calculateChurnRate(),
        this.calculateARPU()
      ]);

      // Calcular cambios porcentuales
      const revenueGrowth = lastMonthRevenue > 0 ? 
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

      const kpis = {
        clients: {
          total: totalClients,
          active: activeClients,
          activePercentage: totalClients > 0 ? (activeClients / totalClients * 100) : 0
        },
        revenue: {
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
          arpu: arpu
        },
        operations: {
          avgTicketResolutionHours: avgTicketResolution,
          networkUptime: networkUptime,
          churnRate: churnRate
        },
        lastUpdated: new Date()
      };

      return {
        success: true,
        data: kpis
      };
    } catch (error) {
      logger.error(`Error generating KPIs: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Obtiene métricas de clientes
   * @private
   */
  async getClientMetrics(startDate, endDate) {
    const totalClients = await db.Client.count();
    const activeClients = await db.Client.count({ where: { active: true } });
    const newClients = await db.Client.count({
      where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
    });

    return {
      total: totalClients,
      active: activeClients,
      new: newClients,
      activePercentage: totalClients > 0 ? (activeClients / totalClients * 100) : 0
    };
  }

  /**
   * Obtiene métricas de ingresos
   * @private
   */
  async getRevenueMetrics(startDate, endDate) {
    const totalRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
      }
    }) || 0;

    const pendingRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'pending',
        dueDate: { [db.Sequelize.Op.lte]: new Date() }
      }
    }) || 0;

    return {
      total: totalRevenue,
      pending: pendingRevenue,
      collected: totalRevenue
    };
  }

  /**
   * Obtiene métricas de red
   * @private
   */
  async getNetworkMetrics() {
    const totalDevices = await db.Device.count();
    const onlineDevices = await db.Device.count({ where: { status: 'online' } });
    const activeAlerts = await db.DeviceMetric.count({
      where: {
        status: ['degraded', 'offline'],
        recordedAt: { [db.Sequelize.Op.gte]: moment().subtract(1, 'hour').toDate() }
      }
    });

    return {
      totalDevices: totalDevices,
      onlineDevices: onlineDevices,
      uptime: totalDevices > 0 ? (onlineDevices / totalDevices * 100) : 0,
      activeAlerts: activeAlerts
    };
  }

  /**
   * Obtiene resumen de tickets
   * @private
   */
  async getTicketSummary(startDate, endDate) {
    const totalTickets = await db.Ticket.count({
      where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
    });

    const openTickets = await db.Ticket.count({ where: { status: 'open' } });
    const resolvedTickets = await db.Ticket.count({
      where: {
        status: 'resolved',
        resolvedAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
      }
    });

    return {
      total: totalTickets,
      open: openTickets,
      resolved: resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets * 100) : 0
    };
  }

  /**
   * Obtiene métricas de servicios
   * @private
   */
  async getServiceMetrics(startDate, endDate) {
    const activeServices = await db.ClientBilling.count({
      where: { clientStatus: 'active' }
    });

    const suspendedServices = await db.ClientBilling.count({
      where: { clientStatus: 'suspended' }
    });

    return {
      active: activeServices,
      suspended: suspendedServices,
      total: activeServices + suspendedServices
    };
  }

  /**
   * Calcula análisis de morosidad
   * @private
   */
  async getOverdueAnalysis() {
    const overdueInvoices = await db.Invoice.findAll({
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'amount'],
        [db.Sequelize.literal(`
          CASE 
            WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 30 THEN '1-30 días'
            WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 60 THEN '31-60 días'
            WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 90 THEN '61-90 días'
            ELSE 'Más de 90 días'
          END
        `), 'period']
      ],
      where: {
        status: 'pending',
        dueDate: { [db.Sequelize.Op.lt]: new Date() }
      },
      group: [db.Sequelize.literal(`
        CASE 
          WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 30 THEN '1-30 días'
          WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 60 THEN '31-60 días'
          WHEN EXTRACT(DAYS FROM (NOW() - "dueDate")) <= 90 THEN '61-90 días'
          ELSE 'Más de 90 días'
        END
      `)],
      raw: true
    });

    return overdueInvoices;
  }

  /**
   * Calcula proyección de ingresos
   * @private
   */
  async calculateRevenueProjection() {
    try {
      const monthlyRecurring = await db.ClientBilling.sum('monthlyFee', {
        where: { clientStatus: 'active' }
      }) || 0;

      const averageGrowth = await this.calculateAverageGrowthRate();

      return {
        monthlyRecurring: monthlyRecurring,
        projectedNextMonth: monthlyRecurring * (1 + averageGrowth),
        growthRate: averageGrowth * 100
      };
    } catch (error) {
      logger.error(`Error calculating revenue projection: ${error.message}`);
      return { monthlyRecurring: 0, projectedNextMonth: 0, growthRate: 0 };
    }
  }

  /**
   * Calcula métricas de crecimiento
   * @private
   */
  async calculateGrowthMetrics(startDate, endDate) {
    const previousPeriod = moment(startDate).subtract(moment(endDate).diff(moment(startDate))).toDate();

    const currentRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
      }
    }) || 0;

    const previousRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.between]: [previousPeriod, startDate] }
      }
    }) || 0;

    const revenueGrowth = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue * 100) : 0;

    const currentClients = await db.Client.count({
      where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
    });

    const previousClients = await db.Client.count({
      where: { createdAt: { [db.Sequelize.Op.between]: [previousPeriod, startDate] } }
    });

    const clientGrowth = previousClients > 0 ? 
      ((currentClients - previousClients) / previousClients * 100) : 0;

    return {
      revenueGrowth: revenueGrowth,
      clientGrowth: clientGrowth,
      currentRevenue: currentRevenue,
      previousRevenue: previousRevenue
    };
  }

  /**
   * Calcula la tasa de churn
   * @private
   */
  async calculateChurnRate() {
    try {
      const last30Days = moment().subtract(30, 'days').toDate();
      
      const startOfPeriodClients = await db.Client.count({
        where: { 
          createdAt: { [db.Sequelize.Op.lt]: last30Days },
          active: true
        }
      });

      const churnedClients = await db.Client.count({
        where: {
          active: false,
          updatedAt: { [db.Sequelize.Op.gte]: last30Days }
        }
      });

      const churnRate = startOfPeriodClients > 0 ? 
        (churnedClients / startOfPeriodClients * 100) : 0;

      return {
        churnRate: churnRate,
        churnedClients: churnedClients,
        totalClients: startOfPeriodClients
      };
    } catch (error) {
      logger.error(`Error calculating churn rate: ${error.message}`);
      return { churnRate: 0, churnedClients: 0, totalClients: 0 };
    }
  }

  /**
   * Obtiene alertas de red activas
   * @private
   */
  async getActiveNetworkAlerts() {
    const alerts = await db.DeviceMetric.findAll({
      attributes: [
        'deviceId',
        'status',
        'cpuUsage',
        'memoryUsage',
        'latency',
        'packetLoss'
      ],
      include: [{
        model: db.Device,
        attributes: ['name', 'ipAddress', 'type']
      }],
      where: {
        [db.Sequelize.Op.or]: [
          { status: ['degraded', 'offline'] },
          { cpuUsage: { [db.Sequelize.Op.gt]: 90 } },
          { memoryUsage: { [db.Sequelize.Op.gt]: 90 } },
          { latency: { [db.Sequelize.Op.gt]: 200 } },
          { packetLoss: { [db.Sequelize.Op.gt]: 5 } }
        ],
        recordedAt: { [db.Sequelize.Op.gte]: moment().subtract(1, 'hour').toDate() }
      },
      order: [['recordedAt', 'DESC']]
    });

    return alerts;
  }

  /**
   * Calcula SLA compliance
   * @private
   */
  async calculateSLACompliance() {
    const slaTargets = {
      'critical': 2, // 2 horas
      'high': 4,     // 4 horas
      'medium': 24,  // 24 horas
      'low': 48      // 48 horas
    };

    const compliance = {};

    for (const [priority, targetHours] of Object.entries(slaTargets)) {
      const tickets = await db.Ticket.findAll({
        attributes: [
          [db.Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600'), 'resolutionHours']
        ],
        where: {
          priority: priority,
          resolvedAt: { [db.Sequelize.Op.not]: null },
          createdAt: { [db.Sequelize.Op.gte]: moment().subtract(30, 'days').toDate() }
        },
        raw: true
      });

      const totalTickets = tickets.length;
      const compliantTickets = tickets.filter(t => t.resolutionHours <= targetHours).length;
      
      compliance[priority] = {
        target: targetHours,
        total: totalTickets,
        compliant: compliantTickets,
        percentage: totalTickets > 0 ? (compliantTickets / totalTickets * 100) : 100
      };
    }

    return compliance;
  }

  /**
   * Identifica clientes en riesgo de churn
   * @private
   */
  async identifyClientsAtRisk() {
    const riskFactors = await db.Client.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'phone'
      ],
      include: [
        {
          model: db.ClientBilling,
          where: { 
            [db.Sequelize.Op.or]: [
              { clientStatus: 'suspended' },
              { 
                nextDueDate: { 
                  [db.Sequelize.Op.lt]: moment().add(7, 'days').toDate() 
                }
              }
            ]
          },
          required: true
        },
        {
          model: db.Ticket,
          where: {
            status: 'open',
            priority: ['high', 'critical']
          },
          required: false
        }
      ],
      where: { active: true }
    });

    return riskFactors.map(client => ({
      clientId: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phone,
      riskFactors: {
        paymentIssues: client.ClientBilling?.clientStatus === 'suspended',
        dueSoon: moment(client.ClientBilling?.nextDueDate).isBefore(moment().add(7, 'days')),
        openCriticalTickets: client.Tickets?.length > 0
      }
    }));
  }

  /**
   * Genera resumen ejecutivo
   * @private
   */
  async getExecutiveSummary(startDate, endDate) {
    const totalRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
      }
    }) || 0;

    const newClients = await db.Client.count({
      where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
    });

    const totalClients = await db.Client.count({ where: { active: true } });

    const networkUptime = await this.calculateNetworkUptime();

    return {
      totalRevenue: totalRevenue,
      newClients: newClients,
      totalActiveClients: totalClients,
      networkUptime: networkUptime,
      period: moment(endDate).diff(moment(startDate), 'days') + 1
    };
  }

  /**
   * Genera resumen financiero
   * @private
   */
  async getFinancialSummary(startDate, endDate) {
    const revenue = await this.getRevenueMetrics(startDate, endDate);
    const arpu = await this.calculateARPU();
    const collections = await this.calculateCollectionEfficiency();

    return {
      totalRevenue: revenue.total,
      pendingRevenue: revenue.pending,
      arpu: arpu,
      collectionEfficiency: collections
    };
  }

  /**
   * Genera resumen operacional
   * @private
   */
  async getOperationalSummary(startDate, endDate) {
    const tickets = await this.getTicketSummary(startDate, endDate);
    const networkMetrics = await this.getNetworkMetrics();
    const avgResolution = await this.getAvgTicketResolution();

    return {
      ticketsCreated: tickets.total,
      ticketsResolved: tickets.resolved,
      networkUptime: networkMetrics.uptime,
      avgTicketResolutionHours: avgResolution
    };
  }

  /**
   * Genera resumen de crecimiento
   * @private
   */
  async getGrowthSummary(startDate, endDate) {
    const growth = await this.calculateGrowthMetrics(startDate, endDate);
    const churn = await this.calculateChurnRate();

    return {
      revenueGrowth: growth.revenueGrowth,
      clientGrowth: growth.clientGrowth,
      churnRate: churn.churnRate
    };
  }

  /**
   * Evalúa riesgos del negocio
   * @private
   */
  async getRiskAssessment() {
    const clientsAtRisk = await this.identifyClientsAtRisk();
    const overdueAmount = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'pending',
        dueDate: { [db.Sequelize.Op.lt]: new Date() }
      }
    }) || 0;

    const networkAlerts = await this.getActiveNetworkAlerts();

    return {
      clientsAtRisk: clientsAtRisk.length,
      overdueAmount: overdueAmount,
      networkAlerts: networkAlerts.length,
      riskLevel: this.calculateOverallRisk(clientsAtRisk.length, overdueAmount, networkAlerts.length)
    };
  }

  /**
   * Genera recomendaciones basadas en métricas
   * @private
   */
  async generateRecommendations(summary, financial, operations) {
    const recommendations = [];

    if (financial.collectionEfficiency < 90) {
      recommendations.push({
        priority: 'high',
        category: 'financial',
        recommendation: 'Mejorar proceso de cobranza - eficiencia por debajo del 90%'
      });
    }

    if (operations.networkUptime < 99) {
      recommendations.push({
        priority: 'critical',
        category: 'operations',
        recommendation: 'Revisar infraestructura de red - uptime por debajo del 99%'
      });
    }

    if (operations.avgTicketResolutionHours > 24) {
      recommendations.push({
        priority: 'medium',
        category: 'operations',
        recommendation: 'Optimizar proceso de resolución de tickets'
      });
    }

    return recommendations;
  }

  /**
   * Calcula ARPU (Average Revenue Per User)
   * @private
   */
  async calculateARPU() {
    const totalRevenue = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.gte]: moment().subtract(1, 'month').toDate() }
      }
    }) || 0;

    const activeClients = await db.Client.count({ where: { active: true } });

    return activeClients > 0 ? (totalRevenue / activeClients) : 0;
  }

  /**
   * Calcula tiempo promedio de resolución de tickets
   * @private
   */
  async getAvgTicketResolution() {
    const result = await db.Ticket.findAll({
      attributes: [
        [db.Sequelize.fn('AVG', 
          db.Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600')
        ), 'avgHours']
      ],
      where: {
        resolvedAt: { [db.Sequelize.Op.not]: null },
        createdAt: { [db.Sequelize.Op.gte]: moment().subtract(30, 'days').toDate() }
      },
      raw: true
    });

    return parseFloat(result[0]?.avgHours || 0);
  }

  /**
   * Calcula uptime de la red
   * @private
   */
  async calculateNetworkUptime() {
    const totalDevices = await db.Device.count();
    const onlineDevices = await db.Device.count({ where: { status: 'online' } });

    return totalDevices > 0 ? (onlineDevices / totalDevices * 100) : 100;
  }

  /**
   * Calcula eficiencia de cobranza
   * @private
   */
  async calculateCollectionEfficiency() {
    const totalInvoiced = await db.Invoice.sum('totalAmount', {
      where: {
        createdAt: { [db.Sequelize.Op.gte]: moment().subtract(1, 'month').toDate() }
      }
    }) || 0;

    const totalCollected = await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.gte]: moment().subtract(1, 'month').toDate() }
      }
    }) || 0;

    return totalInvoiced > 0 ? (totalCollected / totalInvoiced * 100) : 100;
  }

  /**
   * Obtiene ingresos de un mes específico
   * @private
   */
  async getMonthRevenue(startDate, endDate) {
    return await db.Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
      }
    }) || 0;
  }

  /**
   * Calcula tasa de crecimiento promedio
   * @private
   */
  async calculateAverageGrowthRate() {
    const monthlyRevenues = await db.Invoice.findAll({
      attributes: [
        [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'year'],
        [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'month'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'revenue']
      ],
      where: {
        status: 'paid',
        createdAt: { [db.Sequelize.Op.gte]: moment().subtract(6, 'months').toDate() }
      },
      group: [
        db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')),
        db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"'))
      ],
      order: [
        [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('YEAR FROM "createdAt"')), 'ASC'],
        [db.Sequelize.fn('EXTRACT', db.Sequelize.literal('MONTH FROM "createdAt"')), 'ASC']
      ],
      raw: true
    });

    if (monthlyRevenues.length < 2) return 0;

    const growthRates = [];
    for (let i = 1; i < monthlyRevenues.length; i++) {
      const current = parseFloat(monthlyRevenues[i].revenue);
      const previous = parseFloat(monthlyRevenues[i - 1].revenue);
      if (previous > 0) {
        growthRates.push((current - previous) / previous);
      }
    }

    return growthRates.length > 0 ? 
      growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
  }

  /**
   * Calcula nivel de riesgo general
   * @private
   */
  calculateOverallRisk(clientsAtRisk, overdueAmount, networkAlerts) {
    let riskScore = 0;

    if (clientsAtRisk > 10) riskScore += 3;
    else if (clientsAtRisk > 5) riskScore += 2;
    else if (clientsAtRisk > 0) riskScore += 1;

    if (overdueAmount > 100000) riskScore += 3;
    else if (overdueAmount > 50000) riskScore += 2;
    else if (overdueAmount > 10000) riskScore += 1;

    if (networkAlerts > 5) riskScore += 3;
    else if (networkAlerts > 2) riskScore += 2;
    else if (networkAlerts > 0) riskScore += 1;

    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Calcula tendencia lineal
   * @private
   */
  calculateLinearTrend(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Cache utilities
   * @private
   */
  getCachedMetrics(key) {
    const cached = this.metricsCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedMetrics(key, data) {
    this.metricsCache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }
}

module.exports = new AnalyticsService();