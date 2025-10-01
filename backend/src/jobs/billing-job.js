// backend/src/jobs/billing-job.js
// Job Automático Diario para Facturación

const cron = require('node-cron');
const billingService = require('../services/billing.service');
const billingConfig = require('../config/billing-config');

class BillingJob {

  /**
   * Inicializa todos los jobs automáticos de facturación
   */
  static initializeJobs() {
    console.log('🚀 Inicializando jobs automáticos de facturación...');
    
    const config = billingConfig.getConfig(process.env.NODE_ENV);
    
    // Job principal de facturación diaria
    if (config.SCHEDULED_JOBS.DAILY_BILLING.enabled) {
      this.scheduleDailyBillingJob();
    }
    
    // Job de generación de facturas
    if (config.SCHEDULED_JOBS.INVOICE_GENERATION.enabled) {
      this.scheduleInvoiceGenerationJob();
    }
    
    // Job de recordatorios de pago
    if (config.SCHEDULED_JOBS.PAYMENT_REMINDERS.enabled) {
      this.schedulePaymentRemindersJob();
    }
    
    // Job de suspensión de servicios
    if (config.SCHEDULED_JOBS.SERVICE_SUSPENSION.enabled) {
      this.scheduleServiceSuspensionJob();
    }
    
    console.log('�?Jobs de facturación inicializados correctamente');
  }

  /**
   * Job principal que ejecuta el procesamiento diario completo
   */
  static scheduleDailyBillingJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.DAILY_BILLING.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.DAILY_BILLING.timezone;
    
    console.log(`📅 Programando job diario de facturación: ${schedule} (${timezone})`);
    
    cron.schedule(schedule, async () => {
      console.log('🔄 === INICIANDO PROCESAMIENTO DIARIO DE FACTURACIÓN ===');
      console.log(`�?Fecha y hora: ${new Date().toLocaleString('es-MX')}`);
      
      try {
        const startTime = Date.now();
        
        // Ejecutar procesamiento diario completo
        await billingService.processDailyBilling();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`�?=== PROCESAMIENTO DIARIO COMPLETADO EN ${duration}s ===`);
        
      } catch (error) {
        console.error('�?=== ERROR EN PROCESAMIENTO DIARIO ===');
        console.error(error);
        
        // Enviar alerta al administrador
        await this.sendAdminAlert('Fallo en procesamiento diario de facturación', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job específico para generación automática de facturas
   */
  static scheduleInvoiceGenerationJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.INVOICE_GENERATION.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.INVOICE_GENERATION.timezone;
    
    console.log(`📄 Programando job de generación de facturas: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('📄 Ejecutando generación automática de facturas...');
      
      try {
        await billingService.generateAutomaticInvoices();
        console.log('�?Generación de facturas completada');
        
      } catch (error) {
        console.error('�?Error en generación de facturas:', error);
        await this.sendAdminAlert('Error en generación automática de facturas', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job para envío de recordatorios de pago
   */
  static schedulePaymentRemindersJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.PAYMENT_REMINDERS.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.PAYMENT_REMINDERS.timezone;
    
    console.log(`📨 Programando job de recordatorios: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('📨 Enviando recordatorios de pago...');
      
      try {
        await billingService.sendPaymentReminders();
        console.log('�?Recordatorios enviados');
        
      } catch (error) {
        console.error('�?Error enviando recordatorios:', error);
        await this.sendAdminAlert('Error en envío de recordatorios', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Job para suspensión automática de servicios vencidos
   */
  static scheduleServiceSuspensionJob() {
    const schedule = billingConfig.SCHEDULED_JOBS.SERVICE_SUSPENSION.schedule;
    const timezone = billingConfig.SCHEDULED_JOBS.SERVICE_SUSPENSION.timezone;
    
    console.log(`🚫 Programando job de suspensión: ${schedule}`);
    
    cron.schedule(schedule, async () => {
      console.log('🚫 Ejecutando suspensión automática de servicios...');
      
      try {
        await billingService.suspendOverdueServices();
        console.log('�?Suspensión de servicios completada');
        
      } catch (error) {
        console.error('�?Error en suspensión de servicios:', error);
        await this.sendAdminAlert('Error en suspensión automática', error);
      }
      
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  /**
   * Método para procesar pagos tardíos manualmente (desde controlador)
   */
  static async processLatePayment(clientId, paymentData) {
    console.log(`🔄 Procesando pago tardío manual para cliente ${clientId}`);
    
    try {
      const result = await billingService.processLatePayment(clientId, paymentData);
      
      console.log(`�?Pago tardío procesado exitosamente:`);
      console.log(`   Acción: ${result.action}`);
      console.log(`   Mensaje: ${result.message}`);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error(`�?Error procesando pago tardío:`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Método para ejecutar tareas de facturación bajo demanda
   */
  static async runBillingTaskOnDemand(taskType) {
    console.log(`🔄 Ejecutando tarea de facturación bajo demanda: ${taskType}`);
    
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
      
      console.log(`�?Tarea ${taskType} completada exitosamente`);
      return { success: true };
      
    } catch (error) {
      console.error(`�?Error ejecutando tarea ${taskType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene estadísticas del sistema de facturación
   */
  static async getBillingStats() {
    const db = require('../models');
    const { Client, Invoice, Payment, NotificationQueue } = db;
    
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Estadísticas básicas
      const stats = {
        // Clientes
        totalClients: await Client.count(),
        activeClients: await Client.count({ where: { active: true } }),
        
        // Facturas del último mes
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
        
        // Pagos del último mes
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
      console.error('�?Error obteniendo estadísticas de facturación:', error);
      throw error;
    }
  }

/**
 * Env��a alerta al administrador en caso de errores cr��ticos
 */
static async sendAdminAlert(subject, error) {
  console.log(`?? ALERTA ADMINISTRATIVA: ${subject}`);
  console.log(`?? Error: ${error.message}`);
  
  try {
    const db = require('../models');
    const { NotificationQueue } = db;
    
    await NotificationQueue.create({
      type: 'system_alert',
      title: `?? ALERTA SISTEMA: ${subject}`,
      message: `Error en sistema de facturaci��n: ${error.message}`,
      priority: 'urgent',
      
      // Campos requeridos que faltaban:
      channelId: 1, // ID de canal por defecto
      recipient: 'admin@sistema.com', // Destinatario por defecto
      messageData: JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context: 'billing_job'
      }),
      
      status: 'pending',
      scheduledFor: new Date(),
      attempts: 0,
      maxAttempts: 5
    });
    
    console.log('? Alerta administrativa creada');
    
  } catch (alertError) {
    console.error('? Error creando alerta administrativa:', alertError);
    // No hacer throw para evitar bucle infinito de errores
  }
}


  /**
   * Verifica la salud del sistema de facturación
   */
  static async healthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {},
      issues: []
    };
    
    try {
      // Verificar conexión a base de datos
      const db = require('../models');
      await db.sequelize.authenticate();
      healthStatus.services.database = 'healthy';
      
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.issues.push('Database connection failed');
      healthStatus.status = 'unhealthy';
    }
    
    try {
      // Verificar configuración de billing
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
   * Detiene todos los jobs programados (útil para shutdown graceful)
   */
  static stopAllJobs() {
    console.log('🛑 Deteniendo todos los jobs de facturación...');
    
    const activeJobs = cron.getTasks();
    activeJobs.forEach((task, name) => {
      task.stop();
      console.log(`🛑 Job detenido: ${name}`);
    });
    
    console.log('�?Todos los jobs de facturación han sido detenidos');
  }

}

module.exports = BillingJob;