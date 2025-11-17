// backend/src/jobs/billing-job.js
// Job Autom谩tico Diario para Facturaci贸n

const cron = require('node-cron');
const billingService = require('../services/billing.service');
const billingConfig = require('../config/billing-config');

class BillingJob {

  /**
   * Inicializa todos los jobs autom谩ticos de facturaci贸n
   */
  static initializeJobs() {
    console.log('馃殌 Inicializando jobs autom谩ticos de facturaci贸n...');
    
    const config = billingConfig.getConfig(process.env.NODE_ENV);
    
    // Job principal de facturaci贸n diaria
    if (config.SCHEDULED_JOBS.DAILY_BILLING.enabled) {
      this.scheduleDailyBillingJob();
    }
    
    // Job de generaci贸n de facturas
    if (config.SCHEDULED_JOBS.INVOICE_GENERATION.enabled) {
      this.scheduleInvoiceGenerationJob();
    }
    
    // Job de recordatorios de pago
    if (config.SCHEDULED_JOBS.PAYMENT_REMINDERS.enabled) {
      this.schedulePaymentRemindersJob();
    }
    
    // Job de suspensi贸n de servicios
    if (config.SCHEDULED_JOBS.SERVICE_SUSPENSION.enabled) {
      this.scheduleServiceSuspensionJob();
    }
    
    console.log('鉁?Jobs de facturaci贸n inicializados correctamente');
  }

  /**
   * Job principal que ejecuta el procesamiento diario completo
   */
  static scheduleDailyBillingJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.DAILY_BILLING.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.DAILY_BILLING.timezone;
    
    console.log(`馃搮 Programando job diario de facturaci贸n: ${schedule} (${timezone})`);
    
    cron.schedule(schedule, async () => {
      console.log('馃攧 === INICIANDO PROCESAMIENTO DIARIO DE FACTURACI脫N ===');
      console.log(`鈴?Fecha y hora: ${new Date().toLocaleString('es-MX')}`);
      
      try {
        const startTime = Date.now();
        
        // Ejecutar procesamiento diario completo
        await billingService.processDailyBilling();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`鉁?=== PROCESAMIENTO DIARIO COMPLETADO EN ${duration}s ===`);
        
      } catch (error) {
        console.error('鉂?=== ERROR EN PROCESAMIENTO DIARIO ===');
        console.error(error);
        
        // Enviar alerta al administrador
        await this.sendAdminAlert('Fallo en procesamiento diario de facturaci贸n', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job espec铆fico para generaci贸n autom谩tica de facturas
   */
  static scheduleInvoiceGenerationJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.INVOICE_GENERATION.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.INVOICE_GENERATION.timezone;
    
    console.log(`馃搫 Programando job de generaci贸n de facturas: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('馃搫 Ejecutando generaci贸n autom谩tica de facturas...');
      
      try {
        await billingService.generateAutomaticInvoices();
        console.log('鉁?Generaci贸n de facturas completada');
        
      } catch (error) {
        console.error('鉂?Error en generaci贸n de facturas:', error);
        await this.sendAdminAlert('Error en generaci贸n autom谩tica de facturas', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job para env铆o de recordatorios de pago
   */
  static schedulePaymentRemindersJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.PAYMENT_REMINDERS.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.PAYMENT_REMINDERS.timezone;
    
    console.log(`馃摠 Programando job de recordatorios: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('馃摠 Enviando recordatorios de pago...');
      
      try {
        await billingService.sendPaymentReminders();
        console.log('鉁?Recordatorios enviados');
        
      } catch (error) {
        console.error('鉂?Error enviando recordatorios:', error);
        await this.sendAdminAlert('Error en env铆o de recordatorios', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job para suspensi贸n autom谩tica de servicios vencidos
   */
  static scheduleServiceSuspensionJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.SERVICE_SUSPENSION.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.SERVICE_SUSPENSION.timezone;
    
    console.log(`馃毇 Programando job de suspensi贸n: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('馃毇 Ejecutando suspensi贸n autom谩tica de servicios...');
      
      try {
        await billingService.suspendOverdueServices();
        console.log('鉁?Suspensi贸n de servicios completada');
        
      } catch (error) {
        console.error('鉂?Error en suspensi贸n de servicios:', error);
        await this.sendAdminAlert('Error en suspensi贸n autom谩tica', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * M茅todo para procesar pagos tard铆os manualmente (desde controlador)
   */
  static async processLatePayment(clientId, paymentData) {
    console.log(`馃攧 Procesando pago tard铆o manual para cliente ${clientId}`);
    
    try {
      const result = await billingService.processLatePayment(clientId, paymentData);
      
      console.log(`鉁?Pago tard铆o procesado exitosamente:`);
      console.log(`   Acci贸n: ${result.action}`);
      console.log(`   Mensaje: ${result.message}`);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error(`鉂?Error procesando pago tard铆o:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * M茅todo para ejecutar tareas de facturaci贸n bajo demanda
   */
  static async runBillingTaskOnDemand(taskType) {
    console.log(`馃攧 Ejecutando tarea de facturaci贸n bajo demanda: ${taskType}`);
    
    try {
      switch (taskType) {
        case 'generate_invoices':
          await billingService.generateAutomaticInvoices();
          break;
          
        case 'send_reminders':
          await billingService.sendPaymentReminders();
          break;
          
        case 'suspend_services':
          await billingService.suspendOverdueServices();
          break;
          
        case 'full_daily_process':
          await billingService.processDailyBilling();
          break;
          
        default:
          throw new Error(`Tipo de tarea no reconocido: ${taskType}`);
      }
      
      console.log(`鉁?Tarea ${taskType} completada exitosamente`);
      return { success: true };
      
    } catch (error) {
      console.error(`鉂?Error ejecutando tarea ${taskType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene estad铆sticas del sistema de facturaci贸n
   */
  static async getBillingStats() {
    const db = require('../models');
    const { Client, Invoice, Payment, NotificationQueue } = db;
    
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Estad铆sticas b谩sicas
      const stats = {
        // Clientes
        totalClients: await Client.count(),
        activeClients: await Client.count({ where: { active: true } }),
        
        // Facturas del 煤ltimo mes
        invoicesLastMonth: await Invoice.count({
          where: {
            createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo }
          }
        }),
        
        paidInvoicesLastMonth: await Invoice.count({
          where: {
            status: 'paid',
            createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo }
          }
        }),
        
        overdueInvoices: await Invoice.count({
          where: { status: 'overdue' }
        }),
        
        lostRevenueInvoices: await Invoice.count({
          where: { status: 'lost_revenue' }
        }),
        
        // Pagos del 煤ltimo mes
        paymentsLastMonth: await Payment.count({
          where: {
            createdAt: { [db.Sequelize.Op.gte]: thirtyDaysAgo }
          }
        }),
        
        // Notificaciones pendientes
        pendingNotifications: await NotificationQueue.count({
          where: { status: 'pending' }
        }),
        
        adjustmentNotifications: await NotificationQueue.count({
          where: { 
            type: 'billing_adjustment_pending',
            status: 'pending'
          }
        }),
        
        // Timestamp de la consulta
        generatedAt: new Date().toISOString()
      };
      
      // Calcular eficiencia de cobranza
      if (stats.invoicesLastMonth > 0) {
        stats.collectionEfficiency = (
          (stats.paidInvoicesLastMonth / stats.invoicesLastMonth) * 100
        ).toFixed(2) + '%';
      } else {
        stats.collectionEfficiency = 'N/A';
      }
      
      return stats;
      
    } catch (error) {
      console.error('鉂?Error obteniendo estad铆sticas de facturaci贸n:', error);
      throw error;
    }
  }

/**
 * Envía alerta al administrador en caso de errores críticos
 * CORRECCIóN: Usa estructura correcta de NotificationQueue
 */
static async sendAdminAlert(subject, error) {
  console.log(`?? ALERTA ADMINISTRATIVA: ${subject}`);
  console.log(`? Error: ${error.message}`);
  
  try {
    const db = require('../models');
    const { NotificationQueue } = db;
    
    await NotificationQueue.create({
      clientId: null, // No está asociado a un cliente específico
      channelId: 1, // Canal por defecto (sistema/email)
      recipient: 'admin@sistema.com', // Email del administrador
      messageData: JSON.stringify({
        type: 'system_alert',
        title: `?? ALERTA SISTEMA: ${subject}`,
        message: `Error en sistema de facturación: ${error.message}`,
        metadata: {
          errorStack: error.stack,
          timestamp: new Date().toISOString(),
          context: 'billing_job',
          subject: subject
        }
      }),
      scheduledFor: new Date(),
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      priority: 'high' // Usar 'high' en lugar de 'urgent'
    });
    
    console.log('? Alerta administrativa creada');
    
  } catch (alertError) {
    console.error('? Error creando alerta administrativa:', alertError);
    // No hacer throw para evitar bucle infinito de errores
  }
}

  /**
   * Verifica la salud del sistema de facturaci贸n
   */
  static async healthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {},
      issues: []
    };
    
    try {
      // Verificar conexi贸n a base de datos
      const db = require('../models');
      await db.sequelize.authenticate();
      healthStatus.services.database = 'healthy';
      
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.issues.push('Database connection failed');
      healthStatus.status = 'unhealthy';
    }
    
    try {
      // Verificar configuraci贸n de billing
      const config = billingConfig.getConfig();
      if (config.BILLING_PRINCIPLE === 'LA_CASA_NUNCA_PIERDE') {
        healthStatus.services.billingConfig = 'healthy';
      } else {
        healthStatus.services.billingConfig = 'misconfigured';
        healthStatus.issues.push('Billing principle not properly configured');
      }
      
    } catch (error) {
      healthStatus.services.billingConfig = 'unhealthy';
      healthStatus.issues.push('Billing configuration error');
      healthStatus.status = 'unhealthy';
    }
    
    // Verificar jobs programados
    const activeJobs = cron.getTasks();
    healthStatus.services.scheduledJobs = activeJobs.size > 0 ? 'healthy' : 'no_jobs';
    if (activeJobs.size === 0) {
      healthStatus.issues.push('No scheduled jobs found');
    }
    
    return healthStatus;
  }

  /**
   * Detiene todos los jobs programados (煤til para shutdown graceful)
   */
  static stopAllJobs() {
    console.log('馃洃 Deteniendo todos los jobs de facturaci贸n...');
    
    const activeJobs = cron.getTasks();
    activeJobs.forEach((task, name) => {
      task.stop();
      console.log(`馃洃 Job detenido: ${name}`);
    });
    
    console.log('鉁?Todos los jobs de facturaci贸n han sido detenidos');
  }

}

module.exports = BillingJob;