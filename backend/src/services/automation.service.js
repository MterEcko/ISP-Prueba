const db = require('../models');
const logger = require('../utils/logger');
const moment = require('moment');
const cron = require('node-cron');
const clientBillingService = require('./client.billing.service');
const notificationService = require('./notification.service');
const mikrotikEnhancedService = require('./mikrotik.enhanced.service');
const ticketService = require('./ticket.service');
const fs = require('fs').promises;
const path = require('path');

class AutomationService {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
    this.jobStatus = {
      dailyBilling: { lastRun: null, status: 'pending', duration: 0 },
      overdueCheck: { lastRun: null, status: 'pending', duration: 0 },
      deviceSync: { lastRun: null, status: 'pending', duration: 0 },
      systemHealth: { lastRun: null, status: 'pending', duration: 0 },
      autoBackup: { lastRun: null, status: 'pending', duration: 0 }
    };
  }

  /**
   * Inicializa todos los trabajos automáticos
   * @returns {Promise<Object>} Estado de inicialización
   */
  async initializeAutomation() {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Automation already initialized' };
      }

      // Configurar trabajos programados
      await this.setupScheduledJobs();
      
      this.isInitialized = true;
      logger.info('Automation service initialized successfully');

      return {
        success: true,
        message: 'Automation service initialized',
        jobs: Object.keys(this.jobStatus)
      };
    } catch (error) {
      logger.error(`Error initializing automation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecuta el proceso diario de facturación
   * @returns {Promise<Object>} Resultado del proceso
   */
  async runDailyBillingProcess() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting daily billing process');
      this.jobStatus.dailyBilling.status = 'running';

      const today = moment();
      const results = {
        invoicesGenerated: 0,
        clientsProcessed: 0,
        errors: []
      };

      // Obtener clientes que necesitan facturación hoy
      const clientsToProcess = await db.ClientBilling.findAll({
        include: [
          { model: db.Client, as: 'client', where: { active: true } },
          { model: db.servicePackage, as: 'servicePackage' }
        ],
        where: {
          [db.Sequelize.Op.or]: [
            { nextDueDate: { [db.Sequelize.Op.lte]: today.toDate() } },
            { 
              billingDay: today.date(),
              nextDueDate: { [db.Sequelize.Op.lte]: today.endOf('day').toDate() }
            }
          ],
          clientStatus: ['active', 'suspended']
        }
      });

      for (const clientBilling of clientsToProcess) {
        try {
          const result = await clientBillingService.calculateMonthlyBilling(clientBilling.clientId);
          if (result.success) {
            results.invoicesGenerated++;
          }
          results.clientsProcessed++;
        } catch (error) {
          results.errors.push({
            clientId: clientBilling.clientId,
            error: error.message
          });
        }
      }

      // Verificar clientes en período de gracia
      await this.processGracePeriodClients();

      const duration = Date.now() - startTime;
      this.jobStatus.dailyBilling.lastRun = new Date();
      this.jobStatus.dailyBilling.status = 'completed';
      this.jobStatus.dailyBilling.duration = duration;

      logger.info(`Daily billing process completed: ${results.invoicesGenerated} invoices generated`);

      return {
        success: true,
        message: 'Daily billing process completed',
        results: results,
        duration: duration
      };
    } catch (error) {
      this.jobStatus.dailyBilling.status = 'failed';
      logger.error(`Error in daily billing process: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica pagos vencidos y aplica acciones
   * @returns {Promise<Object>} Resultado de la verificación
   */
  async checkOverduePayments() {
    const startTime = Date.now();

    try {
      logger.info('Starting overdue payments check');
      this.jobStatus.overdueCheck.status = 'running';

      const results = {
        overdueClients: 0,
        suspendedClients: 0,
        cutClients: 0,
        notificationsSent: 0
      };

      // Obtener clientes con pagos vencidos
      const overdueClients = await db.ClientBilling.findAll({
        include: [{ model: db.Client, as: 'client' }],
        where: {
          nextDueDate: { [db.Sequelize.Op.lt]: moment().toDate() },
          clientStatus: ['active', 'suspended']
        }
      });

      for (const clientBilling of overdueClients) {
        try {
          const daysOverdue = moment().diff(moment(clientBilling.nextDueDate), 'days');
          results.overdueClients++;

          // Enviar recordatorio
          await notificationService.sendPaymentDueReminder(clientBilling.clientId, daysOverdue);
          results.notificationsSent++;

          // Aplicar acciones según días de atraso
          if (daysOverdue > clientBilling.graceDays && clientBilling.clientStatus === 'active') {
            // Suspender servicio
            await this.suspendClientService(clientBilling.clientId, 'Pago vencido');
            results.suspendedClients++;
            
          } else if (daysOverdue > (clientBilling.graceDays + 7) && clientBilling.clientStatus === 'suspended') {
            // Cortar servicio
            await this.cutClientService(clientBilling.clientId, 'Pago vencido - Corte definitivo');
            results.cutClients++;
          }

        } catch (error) {
          logger.error(`Error processing overdue client ${clientBilling.clientId}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      this.jobStatus.overdueCheck.lastRun = new Date();
      this.jobStatus.overdueCheck.status = 'completed';
      this.jobStatus.overdueCheck.duration = duration;

      logger.info(`Overdue payments check completed: ${results.overdueClients} clients processed`);

      return {
        success: true,
        message: 'Overdue payments check completed',
        results: results,
        duration: duration
      };
    } catch (error) {
      this.jobStatus.overdueCheck.status = 'failed';
      logger.error(`Error checking overdue payments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza todos los dispositivos
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAllDevices() {
    const startTime = Date.now();

    try {
      logger.info('Starting device synchronization');
      this.jobStatus.deviceSync.status = 'running';

      const results = {
        devicesProcessed: 0,
        mikrotikRouters: 0,
        syncErrors: 0,
        metricsCollected: 0
      };

      // Sincronizar routers Mikrotik
      const mikrotikRouters = await db.MikrotikRouter.findAll({
        where: { active: true }
      });

      for (const router of mikrotikRouters) {
        try {
          // Sincronizar pools IP
          await mikrotikEnhancedService.syncPoolsWithRouter(router.id);
          
          // Recolectar métricas
          const metrics = await mikrotikEnhancedService.getRouterSystemInfo(router.id);
          if (metrics.success) {
            results.metricsCollected++;
          }

          results.mikrotikRouters++;
        } catch (error) {
          logger.error(`Error syncing Mikrotik router ${router.id}: ${error.message}`);
          results.syncErrors++;
        }
      }

      // Sincronizar otros dispositivos
      const otherDevices = await db.Device.findAll({
        where: { 
          brand: { [db.Sequelize.Op.ne]: 'mikrotik' },
          status: 'online'
        }
      });

      for (const device of otherDevices) {
        try {
          // Aquí se agregarían sincronizaciones específicas para otros tipos de dispositivos
          results.devicesProcessed++;
        } catch (error) {
          logger.error(`Error syncing device ${device.id}: ${error.message}`);
          results.syncErrors++;
        }
      }

      const duration = Date.now() - startTime;
      this.jobStatus.deviceSync.lastRun = new Date();
      this.jobStatus.deviceSync.status = 'completed';
      this.jobStatus.deviceSync.duration = duration;

      logger.info(`Device synchronization completed: ${results.devicesProcessed} devices processed`);

      return {
        success: true,
        message: 'Device synchronization completed',
        results: results,
        duration: duration
      };
    } catch (error) {
      this.jobStatus.deviceSync.status = 'failed';
      logger.error(`Error synchronizing devices: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera reportes programados
   * @param {string} reportType - Tipo de reporte
   * @returns {Promise<Object>} Resultado de la generación
   */
  async generateScheduledReports(reportType = 'daily') {
    try {
      logger.info(`Generating ${reportType} reports`);

      const results = {
        reportsGenerated: 0,
        reportTypes: []
      };

      const reportDate = moment().format('YYYY-MM-DD');
      const reportsDir = path.join(__dirname, '../reports', reportDate);
      
      // Crear directorio si no existe
      await fs.mkdir(reportsDir, { recursive: true });

      if (reportType === 'daily' || reportType === 'all') {
        // Reporte diario de operaciones
        const dailyReport = await this.generateDailyOperationsReport();
        await this.saveReport(reportsDir, 'daily-operations', dailyReport);
        results.reportsGenerated++;
        results.reportTypes.push('daily-operations');
      }

      if (reportType === 'weekly' || reportType === 'all') {
        const weeklyReport = await this.generateWeeklyFinancialReport();
        await this.saveReport(reportsDir, 'weekly-financial', weeklyReport);
        results.reportsGenerated++;
        results.reportTypes.push('weekly-financial');
      }

      if (reportType === 'monthly' || reportType === 'all') {
        const monthlyReport = await this.generateMonthlyExecutiveReport();
        await this.saveReport(reportsDir, 'monthly-executive', monthlyReport);
        results.reportsGenerated++;
        results.reportTypes.push('monthly-executive');
      }

      logger.info(`Report generation completed: ${results.reportsGenerated} reports generated`);

      return {
        success: true,
        message: 'Scheduled reports generated',
        results: results
      };
    } catch (error) {
      logger.error(`Error generating scheduled reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Respalda datos críticos del sistema
   * @returns {Promise<Object>} Resultado del respaldo
   */
  async backupSystemData() {
    const startTime = Date.now();

    try {
      logger.info('Starting system data backup');
      this.jobStatus.autoBackup.status = 'running';

      const backupDate = moment().format('YYYY-MM-DD_HH-mm');
      const backupDir = path.join(__dirname, '../backups', backupDate);
      
      await fs.mkdir(backupDir, { recursive: true });

      const results = {
        tablesBackedUp: 0,
        totalRecords: 0,
        backupSize: 0
      };

      // Tablas críticas para respaldo
      const criticalTables = [
        'clients', 'clientBilling', 'clientNetworkConfig',
        'servicePackages', 'mikrotikProfiles', 'ipPools',
        'invoices', 'payments', 'users', 'roles', 'permissions'
      ];

      for (const tableName of criticalTables) {
        try {
          const records = await db.sequelize.query(
            `SELECT * FROM "${tableName}"`,
            { type: db.Sequelize.QueryTypes.SELECT }
          );

          const backupFile = path.join(backupDir, `${tableName}.json`);
          await fs.writeFile(backupFile, JSON.stringify(records, null, 2));

          results.tablesBackedUp++;
          results.totalRecords += records.length;

          // Calcular tamaño del archivo
          const stats = await fs.stat(backupFile);
          results.backupSize += stats.size;

        } catch (error) {
          logger.error(`Error backing up table ${tableName}: ${error.message}`);
        }
      }

      // Crear archivo de metadatos del backup
      const metadata = {
        backupDate: new Date(),
        version: '1.0',
        tables: criticalTables,
        totalRecords: results.totalRecords,
        backupSize: results.backupSize
      };

      await fs.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Limpiar backups antiguos (mantener últimos 7)
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      this.jobStatus.autoBackup.lastRun = new Date();
      this.jobStatus.autoBackup.status = 'completed';
      this.jobStatus.autoBackup.duration = duration;

      logger.info(`System backup completed: ${results.tablesBackedUp} tables, ${results.totalRecords} records`);

      return {
        success: true,
        message: 'System backup completed',
        results: results,
        backupPath: backupDir,
        duration: duration
      };
    } catch (error) {
      this.jobStatus.autoBackup.status = 'failed';
      logger.error(`Error backing up system data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica salud del sistema
   * @returns {Promise<Object>} Estado de salud
   */
  async checkSystemHealth() {
    const startTime = Date.now();

    try {
      logger.info('Starting system health check');
      this.jobStatus.systemHealth.status = 'running';

      const healthChecks = {
        database: await this.checkDatabaseHealth(),
        diskSpace: await this.checkDiskSpace(),
        memory: await this.checkMemoryUsage(),
        networkDevices: await this.checkNetworkDevicesHealth(),
        services: await this.checkServicesHealth()
      };

      const overallHealth = this.calculateOverallHealth(healthChecks);
      
      // Enviar alertas si es necesario
      if (overallHealth.status === 'critical') {
        await notificationService.sendSystemAlert(
          `Sistema en estado crítico: ${overallHealth.issues.join(', ')}`,
          'critical',
          ['admins']
        );
      } else if (overallHealth.status === 'warning') {
        await notificationService.sendSystemAlert(
          `Advertencias del sistema: ${overallHealth.issues.join(', ')}`,
          'warning',
          ['admins']
        );
      }

      const duration = Date.now() - startTime;
      this.jobStatus.systemHealth.lastRun = new Date();
      this.jobStatus.systemHealth.status = 'completed';
      this.jobStatus.systemHealth.duration = duration;

      logger.info(`System health check completed: ${overallHealth.status}`);

      return {
        success: true,
        message: 'System health check completed',
        health: healthChecks,
        overall: overallHealth,
        duration: duration
      };
    } catch (error) {
      this.jobStatus.systemHealth.status = 'failed';
      logger.error(`Error checking system health: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspende servicio de cliente automáticamente
   * @param {number} clientId - ID del cliente
   * @param {string} reason - Razón de suspensión
   * @returns {Promise<Object>} Resultado de la suspensión
   */
  async autoSuspendOverdueClients() {
    try {
      logger.info('Starting automatic suspension of overdue clients');

      const results = {
        clientsEvaluated: 0,
        clientsSuspended: 0,
        errors: []
      };

      // Obtener clientes activos con pagos vencidos fuera del período de gracia
      const overdueClients = await db.ClientBilling.findAll({
        include: [{ model: db.Client, as: 'client', where: { active: true } }],
        where: {
          clientStatus: 'active',
          nextDueDate: { 
            [db.Sequelize.Op.lt]: moment().subtract(db.Sequelize.col('graceDays'), 'days').toDate()
          }
        }
      });

      for (const clientBilling of overdueClients) {
        results.clientsEvaluated++;
        
        try {
          await this.suspendClientService(clientBilling.clientId, 'Suspensión automática por pago vencido');
          results.clientsSuspended++;
          
          logger.info(`Client ${clientBilling.clientId} automatically suspended for overdue payment`);
        } catch (error) {
          results.errors.push({
            clientId: clientBilling.clientId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: 'Automatic suspension process completed',
        results: results
      };
    } catch (error) {
      logger.error(`Error in automatic suspension: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactiva clientes que han pagado
   * @returns {Promise<Object>} Resultado de la reactivación
   */
  async autoReactivatePaidClients() {
    try {
      logger.info('Starting automatic reactivation of paid clients');

      const results = {
        clientsEvaluated: 0,
        clientsReactivated: 0,
        errors: []
      };

      // Obtener clientes suspendidos/cortados con pagos recientes
      const paidClients = await db.ClientBilling.findAll({
        include: [
          { model: db.Client, as: 'client' },
          { 
            model: db.Payment, 
            where: {
              status: 'completed',
              paymentDate: { [db.Sequelize.Op.gte]: moment().subtract(24, 'hours').toDate() }
            },
            required: true
          }
        ],
        where: {
          clientStatus: ['suspended', 'cut_service']
        }
      });

      for (const clientBilling of paidClients) {
        results.clientsEvaluated++;
        
        try {
          await this.reactivateClientService(clientBilling.clientId, 'Reactivación automática por pago confirmado');
          results.clientsReactivated++;
          
          logger.info(`Client ${clientBilling.clientId} automatically reactivated after payment`);
        } catch (error) {
          results.errors.push({
            clientId: clientBilling.clientId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: 'Automatic reactivation process completed',
        results: results
      };
    } catch (error) {
      logger.error(`Error in automatic reactivation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Programa alertas de mantenimiento
   * @returns {Promise<Object>} Resultado de la programación
   */
  async scheduleMaintenanceAlerts() {
    try {
      logger.info('Scheduling maintenance alerts');

      const results = {
        devicesChecked: 0,
        alertsScheduled: 0,
        maintenanceRequired: []
      };

      // Obtener dispositivos que requieren mantenimiento
      const devices = await db.Device.findAll({
        include: [
          { model: db.DeviceMetric, as: 'metrics', 
            where: { recordedAt: { [db.Sequelize.Op.gte]: moment().subtract(7, 'days').toDate() } },
            required: false 
          }
        ],
        where: { status: 'online' }
      });

      for (const device of devices) {
        results.devicesChecked++;
        
        const maintenanceNeeded = await this.evaluateMaintenanceNeeds(device);
        
        if (maintenanceNeeded.required) {
          // Crear ticket de mantenimiento preventivo
          const ticket = await ticketService.createTicket({
            clientId: device.clientId,
            ticketTypeId: await this.getMaintenanceTicketTypeId(),
            title: `Mantenimiento preventivo - ${device.name}`,
            description: `Mantenimiento programado: ${maintenanceNeeded.reasons.join(', ')}`,
            priority: maintenanceNeeded.priority,
            category: 'maintenance',
            scheduledDate: moment().add(7, 'days').format('YYYY-MM-DD')
          });

          if (ticket.success) {
            results.alertsScheduled++;
            results.maintenanceRequired.push({
              deviceId: device.id,
              deviceName: device.name,
              reasons: maintenanceNeeded.reasons,
              ticketId: ticket.data.id
            });
          }
        }
      }

      logger.info(`Maintenance alerts scheduled: ${results.alertsScheduled} alerts for ${results.devicesChecked} devices`);

      return {
        success: true,
        message: 'Maintenance alerts scheduled',
        results: results
      };
    } catch (error) {
      logger.error(`Error scheduling maintenance alerts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estado de trabajos automáticos
   * @returns {Object} Estado de todos los trabajos
   */
  getJobStatus() {
    return {
      success: true,
      data: {
        isInitialized: this.isInitialized,
        jobs: this.jobStatus,
        scheduledJobs: Array.from(this.scheduledJobs.keys())
      }
    };
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Configura trabajos programados
   * @private
   */
  async setupScheduledJobs() {
    // Proceso diario de facturación - todos los días a las 2:00 AM
    this.scheduledJobs.set('dailyBilling', cron.schedule('0 2 * * *', async () => {
      await this.runDailyBillingProcess();
    }, { scheduled: false }));

    // Verificación de pagos vencidos - cada 6 horas
    this.scheduledJobs.set('overdueCheck', cron.schedule('0 */6 * * *', async () => {
      await this.checkOverduePayments();
    }, { scheduled: false }));

    // Sincronización de dispositivos - cada 4 horas
    this.scheduledJobs.set('deviceSync', cron.schedule('0 */4 * * *', async () => {
      await this.syncAllDevices();
    }, { scheduled: false }));

    // Verificación de salud del sistema - cada hora
    this.scheduledJobs.set('systemHealth', cron.schedule('0 * * * *', async () => {
      await this.checkSystemHealth();
    }, { scheduled: false }));

    // Backup automático - todos los días a las 3:00 AM
    this.scheduledJobs.set('autoBackup', cron.schedule('0 3 * * *', async () => {
      await this.backupSystemData();
    }, { scheduled: false }));

    // Limpieza de logs - todos los domingos a las 4:00 AM
    this.scheduledJobs.set('logCleanup', cron.schedule('0 4 * * 0', async () => {
      await this.cleanupOldLogs();
    }, { scheduled: false }));

    // Suspensión automática - todos los días a las 1:00 AM
    this.scheduledJobs.set('autoSuspend', cron.schedule('0 1 * * *', async () => {
      await this.autoSuspendOverdueClients();
    }, { scheduled: false }));

    // Reactivación automática - cada 2 horas
    this.scheduledJobs.set('autoReactivate', cron.schedule('0 */2 * * *', async () => {
      await this.autoReactivatePaidClients();
    }, { scheduled: false }));

    // Alertas de mantenimiento - todos los lunes a las 8:00 AM
    this.scheduledJobs.set('maintenanceAlerts', cron.schedule('0 8 * * 1', async () => {
      await this.scheduleMaintenanceAlerts();
    }, { scheduled: false }));

    // Iniciar todos los trabajos
    this.scheduledJobs.forEach((job, name) => {
      job.start();
      logger.info(`Scheduled job '${name}' started`);
    });
  }

  /**
   * Procesa clientes en período de gracia
   * @private
   */
  async processGracePeriodClients() {
    const gracePeriodClients = await db.ClientBilling.findAll({
      include: [{ model: db.Client, as: 'client' }],
      where: {
        clientStatus: 'active',
        nextDueDate: { 
          [db.Sequelize.Op.between]: [
            moment().subtract(30, 'days').toDate(),
            moment().toDate()
          ]
        }
      }
    });

    for (const clientBilling of gracePeriodClients) {
      const daysOverdue = moment().diff(moment(clientBilling.nextDueDate), 'days');
      
      if (daysOverdue > 0 && daysOverdue <= clientBilling.graceDays) {
        // Aplicar multa por pago tardío si corresponde
        if (clientBilling.penaltyFee > 0) {
          await clientBillingService.applyPenaltyFee(clientBilling.clientId);
        }
      }
    }
  }

  /**
   * Suspende servicio de cliente
   * @private
   */
  async suspendClientService(clientId, reason) {
    const transaction = await db.sequelize.transaction();

    try {
      // Actualizar estado en billing
      await db.ClientBilling.update(
        { clientStatus: 'suspended' },
        { where: { clientId: clientId }, transaction }
      );

      // Mover a pool de suspendidos en Mikrotik
      const clientNetwork = await db.ClientNetworkConfig.findOne({
        where: { clientId: clientId },
        include: [{ model: db.MikrotikRouter, as: 'MikrotikRouter' }],
        transaction
      });

      if (clientNetwork && clientNetwork.MikrotikRouter) {
        await mikrotikEnhancedService.moveClientToPool(clientId, 'suspended');
      }

      // Crear log de la suspensión
      await db.TicketComment.create({
        ticketId: null,
        userId: 1, // Sistema
        content: `Cliente suspendido automáticamente: ${reason}`,
        isInternal: true
      }, { transaction });

      await transaction.commit();
      
      // Notificar suspensión
      await notificationService.sendNotificationByChannel(
        'email',
        { email: clientNetwork?.client?.email },
        'service_suspended',
        { reason: reason }
      );

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Corta servicio de cliente
   * @private
   */
  async cutClientService(clientId, reason) {
    const transaction = await db.sequelize.transaction();

    try {
      // Actualizar estado en billing
      await db.ClientBilling.update(
        { clientStatus: 'cut_service' },
        { where: { clientId: clientId }, transaction }
      );

      // Mover a pool de corte en Mikrotik
      await mikrotikEnhancedService.moveClientToPool(clientId, 'cut_service');

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reactiva servicio de cliente
   * @private
   */
  async reactivateClientService(clientId, reason) {
    const transaction = await db.sequelize.transaction();

    try {
      // Actualizar estado en billing
      await db.ClientBilling.update(
        { clientStatus: 'active' },
        { where: { clientId: clientId }, transaction }
      );

      // Mover a pool activo en Mikrotik
      await mikrotikEnhancedService.moveClientToPool(clientId, 'active');

      await transaction.commit();

      // Notificar reactivación
      const client = await db.Client.findByPk(clientId);
      if (client) {
        await notificationService.sendNotificationByChannel(
          'email',
          client,
          'service_reactivated',
          { reason: reason }
        );
      }

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verifica salud de la base de datos
   * @private
   */
  async checkDatabaseHealth() {
    try {
      await db.sequelize.authenticate();
      
      const tableCount = await db.sequelize.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'",
        { type: db.Sequelize.QueryTypes.SELECT }
      );

      return {
        status: 'healthy',
        connected: true,
        tables: parseInt(tableCount[0].count)
      };
    } catch (error) {
      return {
        status: 'critical',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica espacio en disco
   * @private
   */
  async checkDiskSpace() {
    try {
      // Verificar espacio disponible (simplificado)
      const stats = await fs.stat(__dirname);
      
      return {
        status: 'healthy',
        available: 'N/A', // Implementar verificación real de espacio
        message: 'Disk space check not implemented'
      };
    } catch (error) {
      return {
        status: 'warning',
        error: error.message
      };
    }
  }

  /**
   * Verifica uso de memoria
   * @private
   */
  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal / 1024 / 1024; // MB
    const usedMem = memUsage.heapUsed / 1024 / 1024; // MB
    const usage = (usedMem / totalMem) * 100;

    return {
      status: usage > 90 ? 'critical' : usage > 70 ? 'warning' : 'healthy',
      totalMB: Math.round(totalMem),
      usedMB: Math.round(usedMem),
      usagePercent: Math.round(usage)
    };
  }

  /**
   * Verifica salud de dispositivos de red
   * @private
   */
  async checkNetworkDevicesHealth() {
    const totalDevices = await db.Device.count();
    const onlineDevices = await db.Device.count({ where: { status: 'online' } });
    const uptime = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0;

    return {
      status: uptime < 80 ? 'critical' : uptime < 95 ? 'warning' : 'healthy',
      totalDevices: totalDevices,
      onlineDevices: onlineDevices,
      uptimePercent: Math.round(uptime)
    };
  }

  /**
   * Verifica salud de servicios
   * @private
   */
  async checkServicesHealth() {
    // Verificar que los jobs automáticos estén funcionando
    const recentFailures = Object.values(this.jobStatus)
      .filter(job => job.status === 'failed').length;

    return {
      status: recentFailures > 2 ? 'critical' : recentFailures > 0 ? 'warning' : 'healthy',
      automationJobs: Object.keys(this.jobStatus).length,
      failedJobs: recentFailures
    };
  }

  /**
   * Calcula salud general del sistema
   * @private
   */
  calculateOverallHealth(healthChecks) {
    const statuses = Object.values(healthChecks).map(check => check.status);
    const issues = [];

    if (statuses.includes('critical')) {
      statuses.forEach((status, index) => {
        if (status === 'critical') {
          issues.push(Object.keys(healthChecks)[index]);
        }
      });
      return { status: 'critical', issues };
    }

    if (statuses.includes('warning')) {
      statuses.forEach((status, index) => {
        if (status === 'warning') {
          issues.push(Object.keys(healthChecks)[index]);
        }
      });
      return { status: 'warning', issues };
    }

    return { status: 'healthy', issues: [] };
  }

  /**
   * Limpia backups antiguos
   * @private
   */
  async cleanupOldBackups() {
    try {
      const backupsDir = path.join(__dirname, '../backups');
      const entries = await fs.readdir(backupsDir, { withFileTypes: true });
      
      const backupDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(backupsDir, entry.name)
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Más recientes primero

      // Mantener solo los últimos 7 backups
      for (let i = 7; i < backupDirs.length; i++) {
        await fs.rmdir(backupDirs[i].path, { recursive: true });
      }
    } catch (error) {
      logger.error(`Error cleaning up old backups: ${error.message}`);
    }
  }

  /**
   * Genera reporte diario de operaciones
   * @private
   */
  async generateDailyOperationsReport() {
    const today = moment();
    const yesterday = moment().subtract(1, 'day');

    return {
      date: today.format('YYYY-MM-DD'),
      tickets: await ticketService.getTicketMetrics('day'),
      billing: await clientBillingService.getDailyBillingReport(),
      network: await mikrotikEnhancedService.getNetworkSummary(),
      alerts: await this.getDailyAlerts()
    };
  }

  /**
   * Genera reporte semanal financiero
   * @private
   */
  async generateWeeklyFinancialReport() {
    return {
      period: 'week',
      revenue: await clientBillingService.getWeeklyRevenue(),
      collections: await clientBillingService.getCollectionReport(),
      overdue: await clientBillingService.getOverdueReport()
    };
  }

  /**
   * Genera reporte ejecutivo mensual
   * @private
   */
  async generateMonthlyExecutiveReport() {
    const analyticsService = require('./analytics.service');
    return await analyticsService.generateExecutiveReport(moment().format('YYYY-MM'));
  }

  /**
   * Guarda reporte en archivo
   * @private
   */
  async saveReport(dir, name, data) {
    const filename = `${name}-${moment().format('YYYY-MM-DD')}.json`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }

  /**
   * Evalúa necesidades de mantenimiento
   * @private
   */
  async evaluateMaintenanceNeeds(device) {
    const reasons = [];
    let priority = 'low';

    // Verificar métricas recientes
    if (device.metrics && device.metrics.length > 0) {
      const avgCpu = device.metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / device.metrics.length;
      const avgMemory = device.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / device.metrics.length;

      if (avgCpu > 80) {
        reasons.push('Alto uso de CPU');
        priority = 'medium';
      }

      if (avgMemory > 85) {
        reasons.push('Alto uso de memoria');
        priority = 'medium';
      }
    }

    // Verificar última actualización de firmware (simulado)
    const daysSinceUpdate = moment().diff(moment(device.updatedAt), 'days');
    if (daysSinceUpdate > 90) {
      reasons.push('Firmware desactualizado');
    }

    // Verificar uptime excesivo
    const lastSeen = moment(device.lastSeen);
    const uptimeDays = moment().diff(lastSeen, 'days');
    if (uptimeDays > 30) {
      reasons.push('Reinicio recomendado por uptime');
    }

    return {
      required: reasons.length > 0,
      reasons: reasons,
      priority: priority
    };
  }

  /**
   * Obtiene ID del tipo de ticket de mantenimiento
   * @private
   */
  async getMaintenanceTicketTypeId() {
    const maintenanceType = await db.TicketType.findOne({
      where: { category: 'maintenance' }
    });
    return maintenanceType ? maintenanceType.id : 1; // Fallback
  }

  /**
   * Obtiene alertas del día
   * @private
   */
  async getDailyAlerts() {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().endOf('day').toDate();

    return await db.CommunicationLog.findAll({
      where: {
        subject: { [db.Sequelize.Op.iLike]: '%alert%' },
        sentAt: { [db.Sequelize.Op.between]: [today, tomorrow] }
      },
      limit: 10
    });
  }
}

module.exports = new AutomationService();