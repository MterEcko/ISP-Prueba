// backend/src/services/billing.service.js
// Motor Principal de Facturación - VERSIÓN ACTUALIZADA

const db = require('../models');
const { Client, ClientBilling, Invoice, Payment, Subscription, NotificationQueue, ServicePackage } = db;
const { Op } = db.Sequelize;
const billingConfig = require('../config/billing-config');
const ClientSuspensionService = require('./client.suspension.service');

class BillingService {

  /**
   * Procesa automáticamente todos los clientes para:
   * - Generar facturas del período actual si no existen
   * - Generar facturas perdidas de días anteriores
   * - Generar facturas nuevas (5 días antes del vencimiento)
   * - Suspender servicios vencidos
   * - Enviar recordatorios
   */
  async processDailyBilling() {
    console.log('Iniciando procesamiento diario de facturación...');
    
    try {
      // 1. NUEVO: Generar facturas del período actual si no existen
      await this.generateMissingCurrentPeriodInvoices();
      
      // 2. Generar facturas perdidas de días anteriores
      await this.generateMissedInvoices();
      
      // 3. Generar facturas automáticas (5 días antes)
      await this.generateAutomaticInvoices();
      
      // 4. Suspender servicios vencidos
      await this.suspendOverdueServices();
      
      // 5. Enviar recordatorios de pago
      await this.sendPaymentReminders();
      
      console.log('Procesamiento diario completado');
      
    } catch (error) {
      console.error('Error en procesamiento diario:', error);
      throw error;
    }
  }

  /**
   * NUEVO: Genera facturas para clientes que no tienen factura del período actual
   * Se ejecuta cuando lastPaymentDate indica que deberían tener factura pero no la tienen
   */

async generateMissingCurrentPeriodInvoices() {
  console.log('Verificando clientes sin factura del período actual...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const allActiveClients = await ClientBilling.findAll({
    where: {
      clientStatus: 'active'
    },
    include: [
      {
        model: Client,
        as: 'client',
        where: { active: true }
      },
      {
        model: ServicePackage,
        as: 'ServicePackage',
        where: { active: true }
      }
    ]
  });
  
  let generatedCount = 0;
  
  for (const clientBilling of allActiveClients) {
    try {
      const { periodStart, periodEnd } = this.calculateCurrentPeriodFromBillingDay(
        today,
        clientBilling.billingDay
      );
      
      // Verificar si existe factura para el período actual
      const existingInvoice = await Invoice.findOne({
        where: {
          clientId: clientBilling.clientId,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          status: {
            [Op.notIn]: ['cancelled', 'overdue']
          }
        }
      });
      
      // CAMBIO CRÍTICO: Generar si NO existe, sin validar lastPaymentDate
      if (!existingInvoice) {
        await this.createInvoiceForClient(clientBilling, periodStart, periodEnd);
        generatedCount++;
        console.log(`Factura generada para cliente ${clientBilling.clientId} (período ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()})`);
      }
      
    } catch (error) {
      console.error(`Error generando factura para cliente ${clientBilling.clientId}:`, error.message);
    }
  }
  
  if (generatedCount > 0) {
    console.log(`${generatedCount} facturas del período actual generadas`);
  } else {
    console.log('Todos los clientes tienen factura del período actual');
  }
}


  /**
   * NUEVO: Calcula el período actual basado en billingDay
   */
  calculateCurrentPeriodFromBillingDay(referenceDate, billingDay) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const currentDay = referenceDate.getDate();
    
    let periodStart, periodEnd;
    
    const adjustedBillingDay = this.adjustBillingDayForMonth(year, month, billingDay);
    
    if (currentDay >= adjustedBillingDay) {
      periodStart = new Date(year, month, adjustedBillingDay);
      
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
      const adjustedNextDay = this.adjustBillingDayForMonth(nextYear, adjustedNextMonth, billingDay);
      
      periodEnd = new Date(nextYear, adjustedNextMonth, adjustedNextDay - 1);
    } else {
      const prevMonth = month - 1;
      const prevYear = prevMonth < 0 ? year - 1 : year;
      const adjustedPrevMonth = prevMonth < 0 ? 11 : prevMonth;
      const adjustedPrevDay = this.adjustBillingDayForMonth(prevYear, adjustedPrevMonth, billingDay);
      
      periodStart = new Date(prevYear, adjustedPrevMonth, adjustedPrevDay);
      periodEnd = new Date(year, month, adjustedBillingDay - 1);
    }
    
    return { periodStart, periodEnd };
  }

  /**
   * Genera facturas perdidas de días anteriores
   */
  async generateMissedInvoices() {
    console.log('Verificando facturas perdidas...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const clientsMissingInvoices = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [Op.lte]: today
        },
        clientStatus: 'active'
      },
      include: [
        {
          model: Client,
          as: 'client',
          where: { active: true }
        },
        {
          model: ServicePackage,
          as: 'ServicePackage',
          where: { active: true }
        }
      ]
    });

    let recoveredCount = 0;
    
    for (const clientBilling of clientsMissingInvoices) {
      try {
        const { periodStart, periodEnd } = this.calculateBillingPeriod(
          clientBilling.nextDueDate,
          clientBilling.billingDay
        );
        
        const existingInvoice = await Invoice.findOne({
          where: {
            clientId: clientBilling.clientId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd
          }
        });
        
        if (!existingInvoice) {
          await this.createInvoiceForClient(clientBilling, periodStart, periodEnd);
          recoveredCount++;
          console.log(`Factura recuperada para cliente ${clientBilling.clientId}`);
        }
        
      } catch (error) {
        console.error(`Error recuperando factura para cliente ${clientBilling.clientId}:`, error.message);
      }
    }
    
    if (recoveredCount > 0) {
      console.log(`${recoveredCount} facturas perdidas recuperadas`);
    } else {
      console.log('No hay facturas perdidas');
    }
  }

  /**
   * Genera facturas 5 días antes del vencimiento
   */
  async generateAutomaticInvoices() {
    console.log('Generando facturas automáticas...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + billingConfig.AUTO_BILLING.invoiceGenerationDays);
    
    const clientsNeedingInvoice = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [Op.between]: [today, targetDate]
        },
        clientStatus: 'active'
      },
      include: [
        {
          model: Client,
          as: 'client',
          where: { active: true }
        },
        {
          model: ServicePackage,
          as: 'ServicePackage',
          where: { active: true }
        }
      ]
    });
    
    console.log(`${clientsNeedingInvoice.length} clientes necesitan factura`);
    
    for (const clientBilling of clientsNeedingInvoice) {
      try {
        const { periodStart, periodEnd } = this.calculateBillingPeriod(
          clientBilling.nextDueDate,
          clientBilling.billingDay
        );
        
        const existingInvoice = await Invoice.findOne({
          where: {
            clientId: clientBilling.clientId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd
          }
        });
        
        if (existingInvoice) {
          console.log(`Factura ya existe para cliente ${clientBilling.clientId}`);
          continue;
        }
        
        await this.createInvoiceForClient(clientBilling, periodStart, periodEnd);
        console.log(`Factura creada para cliente ${clientBilling.clientId}`);
        
      } catch (error) {
        console.error(`Error creando factura para cliente ${clientBilling.clientId}:`, error.message);
      }
    }
  }

  /**
   * Maneja correctamente meses cortos (28/30 días)
   */
  calculateBillingPeriod(nextDueDate, billingDay) {
    const dueDate = new Date(nextDueDate);
    
    const year = dueDate.getFullYear();
    const month = dueDate.getMonth();
    
    const adjustedBillingDay = this.adjustBillingDayForMonth(year, month, billingDay);
    
    const periodStart = new Date(year, month, adjustedBillingDay);
    
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
    
    const adjustedNextBillingDay = this.adjustBillingDayForMonth(
      nextYear, 
      adjustedNextMonth, 
      billingDay
    );
    
    const periodEnd = new Date(nextYear, adjustedNextMonth, adjustedNextBillingDay - 1);
    
    return { periodStart, periodEnd };
  }

  /**
   * Ajusta billingDay para meses cortos
   */
  adjustBillingDayForMonth(year, month, requestedDay) {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return Math.min(requestedDay, lastDayOfMonth);
  }

  /**
   * MODIFICADO: Crea factura y cancela facturas antiguas pendientes
   */
  async createInvoiceForClient(clientBilling, periodStart, periodEnd) {
    const subscription = await Subscription.findOne({
      where: { 
        clientId: clientBilling.clientId,
        status: 'active'
      }
    });
    
    if (!subscription) {
      console.log(`Cliente ${clientBilling.clientId} no tiene subscription activa - NO se crea factura`);
      return null;
    }

    // CORREGIDO: Para sistema prepago, la fecha de vencimiento es:
    // billingDay + graceDays (no periodEnd + graceDays)
    // Ejemplo: si billingDay es 1 y graceDays es 5, vence el día 6 del mes
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + clientBilling.graceDays);

    const invoiceNumber = this.generateInvoiceNumber(clientBilling.clientId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // NUEVO: Buscar facturas pendientes de períodos anteriores que no han vencido
    const oldPendingInvoices = await Invoice.findAll({
      where: {
        clientId: clientBilling.clientId,
        status: 'pending',
        dueDate: {
          [Op.gte]: today
        },
        billingPeriodEnd: {
          [Op.lt]: periodEnd
        }
      }
    });
    
    // NUEVO: Cancelar facturas antiguas que ya no aplican
    if (oldPendingInvoices.length > 0) {
      const cancelledNumbers = [];
      
      for (const oldInvoice of oldPendingInvoices) {
        await Invoice.update(
          { 
            status: 'cancelled',
            invoiceData: {
              ...oldInvoice.invoiceData,
              cancelledBy: invoiceNumber,
              cancelledAt: new Date().toISOString(),
              cancelReason: 'Reemplazada por factura del nuevo período'
            }
          },
          { where: { id: oldInvoice.id } }
        );
        
        cancelledNumbers.push(oldInvoice.invoiceNumber);
        console.log(`Factura ${oldInvoice.invoiceNumber} cancelada (reemplazada por ${invoiceNumber})`);
      }
      
      // Crear nueva factura con referencia a las canceladas
      const invoice = await Invoice.create({
        clientId: clientBilling.clientId,
        subscriptionId: subscription.id,
        invoiceNumber: invoiceNumber,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        amount: clientBilling.monthlyFee,
        taxAmount: 0,
        totalAmount: clientBilling.monthlyFee,
        dueDate: dueDate,
        status: 'pending',
        invoiceData: {
          servicePackage: clientBilling.ServicePackage?.name,
          billingDay: clientBilling.billingDay,
          generatedAt: new Date().toISOString(),
          subscriptionId: subscription.id,
          replacedInvoices: cancelledNumbers
        }
      });
      
      await this.updateNextDueDate(clientBilling, periodEnd);
      
      console.log(`Factura ${invoiceNumber} creada (reemplazó ${cancelledNumbers.length} facturas antiguas)`);
      return invoice;
      
    } else {
      // Crear factura normalmente (sin cancelaciones)
      const invoice = await Invoice.create({
        clientId: clientBilling.clientId,
        subscriptionId: subscription.id,
        invoiceNumber: invoiceNumber,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        amount: clientBilling.monthlyFee,
        taxAmount: 0,
        totalAmount: clientBilling.monthlyFee,
        dueDate: dueDate,
        status: 'pending',
        invoiceData: {
          servicePackage: clientBilling.ServicePackage?.name,
          billingDay: clientBilling.billingDay,
          generatedAt: new Date().toISOString(),
          subscriptionId: subscription.id
        }
      });
      
      await this.updateNextDueDate(clientBilling, periodEnd);
      
      console.log(`Factura ${invoiceNumber} creada - Nuevo nextDueDate actualizado`);
      return invoice;
    }
  }

  /**
   * NUEVO: Método separado para actualizar nextDueDate
   */
  async updateNextDueDate(clientBilling, periodEnd) {
    const newNextDueDate = new Date(periodEnd);
    newNextDueDate.setMonth(newNextDueDate.getMonth() + 1);
    
    const adjustedDay = this.adjustBillingDayForMonth(
      newNextDueDate.getFullYear(),
      newNextDueDate.getMonth(),
      clientBilling.billingDay
    );
    newNextDueDate.setDate(adjustedDay);
    
    await ClientBilling.update(
      { nextDueDate: newNextDueDate },
      { where: { clientId: clientBilling.clientId } }
    );
  }

  /**
   * Genera número de factura único
   */
  generateInvoiceNumber(clientId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    
    return `${billingConfig.AUTO_BILLING.invoicePrefix}-${year}${month}-${clientId}-${timestamp}`;
  }

  /**
   * Suspende servicios vencidos
   */
  async suspendOverdueServices() {
    console.log('Suspendiendo servicios vencidos...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueClients = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [Op.lt]: today
        },
        clientStatus: 'active'
      },
      include: [
        {
          model: Client,
          as: 'client',
          where: { active: true }
        }
      ]
    });
    
    for (const clientBilling of overdueClients) {
      try {
        await this.suspendClientService(clientBilling.clientId);
        await this.createSuspensionNotification(clientBilling);
        console.log(`Servicio suspendido para cliente ${clientBilling.clientId}`);
      } catch (error) {
        console.error(`Error suspendiendo cliente ${clientBilling.clientId}:`, error.message);
      }
    }
  }

  /**
   * Envía recordatorios de pago
   */
  async sendPaymentReminders() {
    console.log('Enviando recordatorios de pago...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const clientsNeedingReminder = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [Op.between]: [today, threeDaysFromNow]
        },
        clientStatus: 'active'
      },
      include: [
        {
          model: Client,
          as: 'client',
          where: { active: true }
        }
      ]
    });
    
    for (const clientBilling of clientsNeedingReminder) {
      try {
        await this.createPaymentReminderNotification(clientBilling);
        console.log(`Recordatorio enviado a cliente ${clientBilling.clientId}`);
      } catch (error) {
        console.error(`Error enviando recordatorio a cliente ${clientBilling.clientId}:`, error.message);
      }
    }
  }

  async suspendClientService(clientId) {
    // IMPORTANTE: Ahora usamos ClientSuspensionService que también desactiva PPPoE
    try {
      await ClientSuspensionService.suspendClient(clientId, 'non_payment');
      console.log(`✅ Cliente ${clientId} suspendido por falta de pago (incluyendo PPPoE)`);
    } catch (error) {
      console.error(`Error suspendiendo cliente ${clientId}:`, error);
      // Si falla la suspensión completa, al menos actualizar BD
      await ClientBilling.update(
        { clientStatus: 'suspended' },
        { where: { clientId } }
      );
      console.log(`⚠️ Cliente ${clientId} suspendido solo en BD (error en PPPoE)`);
    }
  }

  async createSuspensionNotification(clientBilling) {
    return await this.createBillingNotification(clientBilling.clientId, {
      type: 'service_suspended',
      title: `SERVICIO SUSPENDIDO - ${clientBilling.client.firstName} ${clientBilling.client.lastName}`,
      message: `Servicio suspendido por falta de pago. Fecha vencimiento: ${clientBilling.nextDueDate}`,
      priority: 'high'
    });
  }

  async createPaymentReminderNotification(clientBilling) {
    const daysUntilDue = Math.ceil(
      (new Date(clientBilling.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    return await this.createBillingNotification(clientBilling.clientId, {
      type: 'payment_reminder',
      title: `Recordatorio de Pago - ${clientBilling.client.firstName} ${clientBilling.client.lastName}`,
      message: `Su factura de $${clientBilling.monthlyFee} vence en ${daysUntilDue} días.`,
      priority: 'normal'
    });
  }

  async createBillingNotification(clientId, notificationData) {
    return await NotificationQueue.create({
      clientId,
      channelId: 1,
      recipient: 'sistema@admin.com',
      messageData: JSON.stringify({
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        metadata: notificationData.metadata || {}
      }),
      scheduledFor: new Date(),
      status: notificationData.status || 'pending',
      attempts: 0,
      maxAttempts: 3,
      priority: notificationData.priority || 'normal'
    });
  }

  // ===== MÉTODOS PARA PAGOS TARDÍOS (sin cambios) =====
  
  async processLatePayment(clientId, paymentData) {
    try {
      console.log(`Procesando pago tardío para cliente ${clientId}`);

      const client = await this.getClientWithBillingConfig(clientId);
      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      const payment = await this.createPaymentRecord(client, paymentData);
      const currentInvoice = await this.getCurrentInvoice(client);
      
      if (!currentInvoice) {
        throw new Error(`No se encontró factura actual para cliente ${clientId}`);
      }

      const paymentDates = this.calculatePaymentDates(
        client.clientBilling.billingDay, 
        new Date(paymentData.paymentDate)
      );

      const strategy = this.determineReactivationStrategy(
        paymentDates.daysRemainingInPeriod,
        client.clientBilling,
        currentInvoice
      );

      const result = await this.executeStrategy(client, payment, currentInvoice, strategy, paymentDates);

      console.log(`Pago tardío procesado exitosamente para cliente ${clientId}`);
      return result;

    } catch (error) {
      console.error(`Error procesando pago tardío para cliente ${clientId}:`, error);
      throw error;
    }
  }

  calculatePaymentDates(billingDay, paymentDate) {
    const currentDate = new Date(paymentDate);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const adjustedBillingDay = this.adjustBillingDayForMonth(
      currentYear, 
      currentMonth, 
      billingDay
    );
    
    let periodStartDate, periodEndDate;
    
    if (currentDate.getDate() >= adjustedBillingDay) {
      periodStartDate = new Date(currentYear, currentMonth, adjustedBillingDay);
      
      const nextMonth = currentMonth + 1;
      const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
      const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
      const adjustedNextDay = this.adjustBillingDayForMonth(nextYear, adjustedNextMonth, billingDay);
      
      periodEndDate = new Date(nextYear, adjustedNextMonth, adjustedNextDay - 1);
    } else {
      const prevMonth = currentMonth - 1;
      const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
      const adjustedPrevMonth = prevMonth < 0 ? 11 : prevMonth;
      const adjustedPrevDay = this.adjustBillingDayForMonth(prevYear, adjustedPrevMonth, billingDay);
      
      periodStartDate = new Date(prevYear, adjustedPrevMonth, adjustedPrevDay);
      periodEndDate = new Date(currentYear, currentMonth, adjustedBillingDay - 1);
    }
    
    const timeDiff = periodEndDate.getTime() - currentDate.getTime();
    const daysRemainingInPeriod = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    
    return {
      periodStartDate,
      periodEndDate,
      nextPeriodStart: new Date(periodEndDate.getTime() + (24 * 60 * 60 * 1000)),
      daysRemainingInPeriod,
      currentPaymentDate: currentDate
    };
  }

  determineReactivationStrategy(daysRemaining, billingConfig, currentInvoice) {
    const SYSTEM_CONFIG = {
      autoGiftDaysLimit: 2,
      minimumChargeableDays: 3
    };
    
    const dailyRate = currentInvoice.amount / 30;
    const proportionalAmount = dailyRate * daysRemaining;
    
    if (daysRemaining <= SYSTEM_CONFIG.autoGiftDaysLimit) {
      return {
        action: 'apply_to_next_month',
        reason: 'minimal_days_gift',
        daysRemaining,
        giftDays: daysRemaining,
        currentInvoiceStatus: 'lost_revenue',
        paymentApplication: 'next_month',
        requiresManualAdjustment: false,
        proportionalAmount: 0,
        message: `Regalo automático de ${daysRemaining} días - pago aplicado al siguiente período`
      };
    } else {
      return {
        action: 'partial_month_activation',
        reason: 'house_never_loses',
        daysRemaining,
        giftDays: 0,
        currentInvoiceStatus: 'paid',
        paymentApplication: 'current_month',
        requiresManualAdjustment: true,
        proportionalAmount,
        dailyRate,
        serviceActiveUntil: 'period_end_plus_grace',
        message: `Reactivación por ${daysRemaining} días - ajuste requerido: $${proportionalAmount.toFixed(2)}`
      };
    }
  }

  async executeStrategy(client, payment, currentInvoice, strategy, paymentDates) {
    switch (strategy.action) {
      case 'apply_to_next_month':
        return await this.executeNextMonthStrategy(client, payment, currentInvoice, strategy, paymentDates);
      case 'partial_month_activation':
        return await this.executePartialActivationStrategy(client, payment, currentInvoice, strategy, paymentDates);
      default:
        throw new Error(`Estrategia desconocida: ${strategy.action}`);
    }
  }

  async executeNextMonthStrategy(client, payment, currentInvoice, strategy, paymentDates) {
    await Invoice.update({ status: 'lost_revenue' }, { where: { id: currentInvoice.id } });
    const nextInvoice = await this.getOrCreateNextInvoice(client, paymentDates.nextPeriodStart);
    await Payment.update({ invoiceId: nextInvoice.id }, { where: { id: payment.id } });

    const serviceEndDate = new Date(paymentDates.nextPeriodStart);
    serviceEndDate.setMonth(serviceEndDate.getMonth() + 1);
    serviceEndDate.setDate(serviceEndDate.getDate() - 1);

    await this.reactivateClientService(client.id, serviceEndDate);

    return {
      success: true,
      action: 'next_month_application',
      giftDays: strategy.giftDays,
      serviceActiveUntil: serviceEndDate,
      message: strategy.message
    };
  }

  async executePartialActivationStrategy(client, payment, currentInvoice, strategy, paymentDates) {
    await Invoice.update({ status: 'paid' }, { where: { id: currentInvoice.id } });
    await Payment.update({ invoiceId: currentInvoice.id }, { where: { id: payment.id } });

    const serviceEndDate = new Date(paymentDates.periodEndDate);
    serviceEndDate.setDate(serviceEndDate.getDate() + client.clientBilling.graceDays);

    await this.reactivateClientService(client.id, serviceEndDate);

    return {
      success: true,
      action: 'partial_activation',
      daysActivated: strategy.daysRemaining,
      adjustmentRequired: strategy.proportionalAmount,
      serviceActiveUntil: serviceEndDate,
      message: strategy.message
    };
  }

  async getClientWithBillingConfig(clientId) {
    return await Client.findByPk(clientId, {
      include: [{
        model: ClientBilling,
        as: 'clientBilling',
        required: true
      }]
    });
  }

  async createPaymentRecord(client, paymentData) {
    return await Payment.create({
      clientId: client.id,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || 'cash',
      paymentDate: paymentData.paymentDate,
      status: 'completed',
      paymentReference: paymentData.reference || `PAY-${Date.now()}`
    });
  }

  async getCurrentInvoice(client) {
    const currentDate = new Date();
    const billingDay = client.clientBilling.billingDay;
    
    const { periodStart, periodEnd } = this.calculateBillingPeriod(currentDate, billingDay);

    return await Invoice.findOne({
      where: {
        clientId: client.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd
      }
    });
  }

  async getOrCreateNextInvoice(client, nextPeriodStart) {
    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() - 1);

    let nextInvoice = await Invoice.findOne({
      where: {
        clientId: client.id,
        billingPeriodStart: nextPeriodStart,
        billingPeriodEnd: nextPeriodEnd
      }
    });

    if (!nextInvoice) {
      nextInvoice = await Invoice.create({
        clientId: client.id,
        invoiceNumber: this.generateInvoiceNumber(client.id),
        billingPeriodStart: nextPeriodStart,
        billingPeriodEnd: nextPeriodEnd,
        amount: client.clientBilling.monthlyFee,
        totalAmount: client.clientBilling.monthlyFee,
        dueDate: new Date(nextPeriodStart.getTime() + (client.clientBilling.graceDays * 24 * 60 * 60 * 1000)),
        status: 'pending'
      });
    }

    return nextInvoice;
  }

  async reactivateClientService(clientId, serviceEndDate) {
    await Subscription.update(
      { 
        status: 'active',
        endDate: serviceEndDate,
        lastStatusChange: new Date()
      },
      { where: { clientId } }
    );
    
    // IMPORTANTE: Reactivar también el usuario PPPoE si estaba suspendido
    const currentStatus = await ClientBilling.findOne({ where: { clientId } });

    if (currentStatus && currentStatus.clientStatus === 'suspended') {
      try {
        await ClientSuspensionService.reactivateClient(clientId, null);
        console.log(`✅ Cliente ${clientId} reactivado (incluyendo PPPoE)`);
      } catch (error) {
        console.error(`Error reactivando cliente ${clientId} (PPPoE):`, error);
        // Si falla la reactivación de PPPoE, al menos actualizar BD
        await ClientBilling.update(
          { clientStatus: 'active' },
          { where: { clientId } }
        );
        console.log(`⚠️ Cliente ${clientId} reactivado solo en BD (error en PPPoE)`);
      }
    } else {
      await ClientBilling.update(
        { clientStatus: 'active' },
        { where: { clientId } }
      );
    }

    console.log(`Servicio reactivado para cliente ${clientId} hasta ${serviceEndDate.toLocaleDateString()}`);
  }
}

module.exports = new BillingService();