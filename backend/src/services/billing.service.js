// backend/src/services/billing-service.js
// Motor Principal de Facturación - "La Casa Nunca Pierde"

const db = require('../models');
const { Client, ClientBilling, Invoice, Payment, Subscription, NotificationQueue } = db;

class BillingService {

  /**
   * Procesa un pago tardío y determina la estrategia de reactivación
   * PRINCIPIO: La casa nunca pierde - siempre se cobra por días utilizados
   * 
   * @param {number} clientId - ID del cliente que pagó
   * @param {Object} paymentData - Datos del pago recibido
   * @returns {Object} Resultado del procesamiento
   */
  async processLatePayment(clientId, paymentData) {
    try {
      console.log(`🔄 Procesando pago tardío para cliente ${clientId}`);

      // 1. Obtener datos del cliente y su configuración de facturación
      const client = await this.getClientWithBillingConfig(clientId);
      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // 2. Crear registro del pago
      const payment = await this.createPaymentRecord(client, paymentData);

      // 3. Obtener la factura del período actual
      const currentInvoice = await this.getCurrentInvoice(client);
      if (!currentInvoice) {
        throw new Error(`No se encontró factura actual para cliente ${clientId}`);
      }

      // 4. Calcular fechas del período de facturación
      const paymentDates = this.calculatePaymentDates(
        client.ClientBilling.billingDay, 
        new Date(paymentData.paymentDate)
      );

      console.log(`📅 Cliente facturado día ${client.ClientBilling.billingDay}`);
      console.log(`📅 Período actual: ${paymentDates.periodStartDate.toLocaleDateString()} al ${paymentDates.periodEndDate.toLocaleDateString()}`);
      console.log(`📅 Días restantes: ${paymentDates.daysRemainingInPeriod}`);

      // 5. Determinar estrategia basada en días restantes
      const strategy = this.determineReactivationStrategy(
        paymentDates.daysRemainingInPeriod,
        client.ClientBilling,
        currentInvoice
      );

      console.log(`🎯 Estrategia seleccionada: ${strategy.action} (${strategy.reason})`);

      // 6. Ejecutar la estrategia
      const result = await this.executeStrategy(client, payment, currentInvoice, strategy, paymentDates);

      console.log(`✅ Pago tardío procesado exitosamente para cliente ${clientId}`);
      return result;

    } catch (error) {
      console.error(`❌ Error procesando pago tardío para cliente ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Calcula todas las fechas relevantes para el ciclo de facturación
   * El período va del día de facturación al día anterior del siguiente mes
   * 
   * @param {number} billingDay - Día del mes para facturar (1-28)
   * @param {Date} paymentDate - Fecha cuando se recibió el pago
   * @returns {Object} Fechas calculadas del período
   */
  calculatePaymentDates(billingDay, paymentDate) {
    const currentDate = new Date(paymentDate);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let periodStartDate, periodEndDate;
    
    // Determinar en qué período estamos
    if (currentDate.getDate() >= billingDay) {
      // Estamos en el período actual
      // Ejemplo: Factura día 15, hoy es 20 → Período del 15 al 14 del siguiente mes
      periodStartDate = new Date(currentYear, currentMonth, billingDay);
      periodEndDate = new Date(currentYear, currentMonth + 1, billingDay - 1);
    } else {
      // Ya estamos en el siguiente período (pasó la fecha de facturación)
      // Ejemplo: Factura día 15, hoy es 10 → Período del 15 del mes anterior al 14 actual
      periodStartDate = new Date(currentYear, currentMonth - 1, billingDay);
      periodEndDate = new Date(currentYear, currentMonth, billingDay - 1);
    }
    
    // Calcular días restantes en el período actual (incluyendo el día actual)
    const timeDiff = periodEndDate.getTime() - currentDate.getTime();
    const daysRemainingInPeriod = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1);
    
    return {
      periodStartDate,
      periodEndDate,
      nextPeriodStart: new Date(periodEndDate.getTime() + (24 * 60 * 60 * 1000)),
      daysRemainingInPeriod,
      currentPaymentDate: currentDate
    };
  }

  /**
   * Determina la estrategia de reactivación basada en días restantes
   * PRINCIPIO: La casa nunca pierde - solo se regalan 1-2 días máximo
   * 
   * @param {number} daysRemaining - Días que quedan en el período
   * @param {Object} billingConfig - Configuración de facturación del cliente
   * @param {Object} currentInvoice - Factura del período actual
   * @returns {Object} Estrategia a ejecutar
   */
  determineReactivationStrategy(daysRemaining, billingConfig, currentInvoice) {
    // Configuración del sistema - LA CASA NUNCA PIERDE
    const SYSTEM_CONFIG = {
      autoGiftDaysLimit: 2,        // Solo regalar 1-2 días máximo
      minimumChargeableDays: 3     // Siempre cobrar si quedan 3+ días
    };
    
    // Calcular costo diario del servicio
    const dailyRate = currentInvoice.amount / 30; // Asumiendo mes de 30 días
    const proportionalAmount = dailyRate * daysRemaining;
    
    if (daysRemaining <= SYSTEM_CONFIG.autoGiftDaysLimit) {
      /**
       * ESTRATEGIA 1: Regalo automático (SOLO 1-2 días)
       * Se ejecuta cuando quedan muy pocos días
       * El pago se aplica al siguiente mes
       */
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
      /**
       * ESTRATEGIA 2: La casa nunca pierde (3+ días)
       * Siempre se cobra proporcional por días utilizados
       * El cliente aprende que pagar tarde cuesta más
       */
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

  /**
   * Ejecuta la estrategia de reactivación determinada
   */
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

  /**
   * ESTRATEGIA 1: Aplicar pago al siguiente mes (1-2 días de regalo)
   */
  async executeNextMonthStrategy(client, payment, currentInvoice, strategy, paymentDates) {
    console.log(`🎁 Ejecutando estrategia de regalo: ${strategy.giftDays} días`);

    // 1. Marcar factura actual como pérdida
    await Invoice.update(
      { status: 'lost_revenue' },
      { where: { id: currentInvoice.id } }
    );

    // 2. Aplicar pago al siguiente período
    const nextInvoice = await this.getOrCreateNextInvoice(client, paymentDates.nextPeriodStart);
    await Payment.update(
      { invoiceId: nextInvoice.id },
      { where: { id: payment.id } }
    );

    // 3. Calcular fecha de fin del servicio (siguiente período completo)
    const serviceEndDate = new Date(paymentDates.nextPeriodStart);
    serviceEndDate.setMonth(serviceEndDate.getMonth() + 1);
    serviceEndDate.setDate(serviceEndDate.getDate() - 1);

    // 4. Reactivar servicio
    await this.reactivateClientService(client.id, serviceEndDate);

    // 5. Crear notificación informativa
    await this.createBillingNotification(client.id, {
      type: 'payment_applied_next_month',
      title: `Pago aplicado al siguiente período - ${client.firstName} ${client.lastName}`,
      message: `Pago de $${payment.amount} aplicado al siguiente período. ${strategy.giftDays} días de cortesía.`,
      priority: 'low',
      metadata: {
        originalInvoiceId: currentInvoice.id,
        appliedToInvoiceId: nextInvoice.id,
        giftDays: strategy.giftDays,
        strategy: strategy.reason,
        serviceActiveUntil: serviceEndDate.toISOString()
      }
    });

    // 6. Agregar comentario al cliente
    const comment = this.generateNextMonthComment(strategy, currentInvoice, payment, serviceEndDate);
    await this.addClientComment(client.id, comment);

    return {
      success: true,
      action: 'next_month_application',
      giftDays: strategy.giftDays,
      serviceActiveUntil: serviceEndDate,
      message: strategy.message
    };
  }

  /**
   * ESTRATEGIA 2: Reactivación parcial con ajuste (LA CASA NUNCA PIERDE)
   */
  async executePartialActivationStrategy(client, payment, currentInvoice, strategy, paymentDates) {
    console.log(`💰 Ejecutando estrategia "La casa nunca pierde": ${strategy.daysRemaining} días`);

    // 1. Marcar factura como pagada (se cobrará el proporcional)
    await Invoice.update(
      { status: 'paid' },
      { where: { id: currentInvoice.id } }
    );

    await Payment.update(
      { invoiceId: currentInvoice.id },
      { where: { id: payment.id } }
    );

    // 2. Calcular fecha de fin del servicio (fin del período + días de gracia)
    const serviceEndDate = new Date(paymentDates.periodEndDate);
    serviceEndDate.setDate(serviceEndDate.getDate() + client.ClientBilling.graceDays);

    // 3. Reactivar servicio temporalmente
    await this.reactivateClientService(client.id, serviceEndDate);

    // 4. Crear notificación para ajuste manual (REQUIERE ACCIÓN DEL OPERADOR)
    await this.createBillingNotification(client.id, {
      type: 'billing_adjustment_pending',
      title: `⚠️ AJUSTE REQUERIDO - ${client.firstName} ${client.lastName}`,
      message: `Cliente reactivado por ${strategy.daysRemaining} días. Requiere ajuste de $${strategy.proportionalAmount.toFixed(2)} en próxima factura.`,
      priority: 'medium',
      metadata: {
        daysUsed: strategy.daysRemaining,
        proportionalAmount: strategy.proportionalAmount,
        dailyRate: strategy.dailyRate,
        currentInvoiceId: currentInvoice.id,
        reactivationDate: paymentDates.currentPaymentDate.toISOString(),
        serviceEndDate: serviceEndDate.toISOString(),
        adjustmentType: 'partial_month_usage',
        billingDay: client.ClientBilling.billingDay
      },
      status: 'pending',
      assignedTo: 'billing_team'
    });

    // 5. Agregar comentario detallado al cliente
    const comment = this.generatePartialActivationComment(strategy, client, payment, paymentDates, serviceEndDate);
    await this.addClientComment(client.id, comment);

    return {
      success: true,
      action: 'partial_activation',
      daysActivated: strategy.daysRemaining,
      adjustmentRequired: strategy.proportionalAmount,
      serviceActiveUntil: serviceEndDate,
      message: strategy.message
    };
  }

  /**
   * Obtiene cliente con su configuración de facturación
   */
  async getClientWithBillingConfig(clientId) {
    return await Client.findByPk(clientId, {
      include: [{
        model: ClientBilling,
        required: true
      }]
    });
  }

  /**
   * Crea registro del pago en la base de datos
   */
  async createPaymentRecord(client, paymentData) {
    return await Payment.create({
      clientId: client.id,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || 'cash',
      paymentDate: paymentData.paymentDate,
      status: 'completed',
      paymentReference: paymentData.reference || `PAY-${Date.now()}`,
      // invoiceId se asignará después según la estrategia
    });
  }

  /**
   * Obtiene la factura del período actual
   */
  async getCurrentInvoice(client) {
    const currentDate = new Date();
    const billingDay = client.ClientBilling.billingDay;
    
    // Calcular inicio y fin del período actual
    let periodStart, periodEnd;
    if (currentDate.getDate() >= billingDay) {
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, billingDay - 1);
    } else {
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, billingDay);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay - 1);
    }

    return await Invoice.findOne({
      where: {
        clientId: client.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd
      }
    });
  }

  /**
   * Obtiene o crea la factura del siguiente período
   */
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
        invoiceNumber: `INV-${client.id}-${Date.now()}`,
        billingPeriodStart: nextPeriodStart,
        billingPeriodEnd: nextPeriodEnd,
        amount: client.ClientBilling.monthlyFee,
        totalAmount: client.ClientBilling.monthlyFee,
        dueDate: new Date(nextPeriodStart.getTime() + (client.ClientBilling.graceDays * 24 * 60 * 60 * 1000)),
        status: 'pending'
      });
    }

    return nextInvoice;
  }

  /**
   * Reactiva el servicio del cliente hasta la fecha especificada
   */
  async reactivateClientService(clientId, serviceEndDate) {
    // Actualizar estado en la tabla de suscripciones
    await Subscription.update(
      { 
        status: 'active',
        endDate: serviceEndDate,
        lastStatusChange: new Date()
      },
      { where: { clientId } }
    );

    // TODO: Integrar con Mikrotik para reactivar PPPoE
    // await this.reactivateMikrotikService(clientId);
    
    console.log(`✅ Servicio reactivado para cliente ${clientId} hasta ${serviceEndDate.toLocaleDateString()}`);
  }

  /**
   * Crea notificación relacionada con facturación
   */
async createBillingNotification(clientId, notificationData) {
  return await NotificationQueue.create({
    clientId,
    channelId: 1, // Canal por defecto (sistema)
    recipient: 'sistema@admin.com', // Destinatario por defecto
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

  /**
   * Agrega comentario al perfil del cliente
   */
  async addClientComment(clientId, comment) {
    // Asumir que existe un campo 'notes' en el modelo Client
    const client = await Client.findByPk(clientId);
    const existingNotes = client.notes || '';
    const newNotes = existingNotes + '\n\n' + comment;
    
    await Client.update(
      { notes: newNotes },
      { where: { id: clientId } }
    );
  }

  /**
   * Genera comentario para estrategia de siguiente mes
   */
  generateNextMonthComment(strategy, currentInvoice, payment, serviceEndDate) {
    return `[SISTEMA] ${new Date().toLocaleDateString()} - Pago aplicado al siguiente período:
• Factura ${currentInvoice.invoiceNumber} marcada como pérdida ($${currentInvoice.amount})
• Pago de $${payment.amount} aplicado al siguiente período
• Días de cortesía otorgados: ${strategy.giftDays}
• Servicio reactivado hasta: ${serviceEndDate.toLocaleDateString()}
• Motivo: ${strategy.reason === 'minimal_days_gift' ? 'Días insuficientes (regalo automático)' : 'Días insuficientes para cobro'}`;
  }

  /**
   * Genera comentario para estrategia de reactivación parcial
   */
  generatePartialActivationComment(strategy, client, payment, paymentDates, serviceEndDate) {
    return `[SISTEMA] ${new Date().toLocaleDateString()} - LA CASA NUNCA PIERDE:
• Pago tardío de $${payment.amount} recibido
• Período: ${paymentDates.periodStartDate.toLocaleDateString()} al ${paymentDates.periodEndDate.toLocaleDateString()}
• Días restantes del período: ${strategy.daysRemaining}
• Servicio reactivado hasta: ${serviceEndDate.toLocaleDateString()}
• AJUSTE REQUERIDO: $${strategy.proportionalAmount.toFixed(2)} por ${strategy.daysRemaining} días utilizados
• Tasa diaria: $${strategy.dailyRate.toFixed(2)}
• ⚠️ OPERADOR: Contactar cliente para cobrar proporcional en próxima factura
• 💰 Principio: La casa nunca pierde - siempre se cobra por días utilizados`;
  }

  // ========================================
  // MÉTODOS PARA AUTOMATIZACIÓN DIARIA
  // ========================================

  /**
   * Procesa automáticamente todos los clientes para:
   * - Generar facturas nuevas
   * - Suspender servicios vencidos
   * - Enviar recordatorios
   */
  async processDailyBilling() {
    console.log('🚀 Iniciando procesamiento diario de facturación...');
    
    try {
      // 1. Generar facturas automáticas (5 días antes del vencimiento)
      await this.generateAutomaticInvoices();
      
      // 2. Suspender servicios vencidos
      await this.suspendOverdueServices();
      
      // 3. Enviar recordatorios de pago
      await this.sendPaymentReminders();
      
      console.log('✅ Procesamiento diario completado');
      
    } catch (error) {
      console.error('❌ Error en procesamiento diario:', error);
      throw error;
    }
  }

  /**
   * Genera facturas automáticamente 5 días antes del vencimiento
   */
  async generateAutomaticInvoices() {
    console.log('📄 Generando facturas automáticas...');
    
    // Obtener clientes que necesitan factura en 5 días
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    
    const clientsToInvoice = await this.getClientsNeedingInvoice(fiveDaysFromNow);
    
    for (const client of clientsToInvoice) {
      try {
        await this.createAutomaticInvoice(client);
        console.log(`✅ Factura creada para cliente ${client.id}`);
      } catch (error) {
        console.error(`❌ Error creando factura para cliente ${client.id}:`, error);
      }
    }
  }

  /**
   * Suspende servicios que están vencidos (pasaron días de gracia)
   */
  async suspendOverdueServices() {
    console.log('🚫 Suspendiendo servicios vencidos...');
    
    const overdueClients = await this.getOverdueClients();
    
    for (const client of overdueClients) {
      try {
        await this.suspendClientService(client.id);
        await this.createSuspensionNotification(client);
        console.log(`🚫 Servicio suspendido para cliente ${client.id}`);
      } catch (error) {
        console.error(`❌ Error suspendiendo cliente ${client.id}:`, error);
      }
    }
  }

  /**
   * Envía recordatorios de pago automáticos
   */
  async sendPaymentReminders() {
    console.log('📨 Enviando recordatorios de pago...');
    
    const clientsNeedingReminder = await this.getClientsNeedingReminder();
    
    for (const client of clientsNeedingReminder) {
      try {
        await this.createPaymentReminderNotification(client);
        console.log(`📨 Recordatorio enviado a cliente ${client.id}`);
      } catch (error) {
        console.error(`❌ Error enviando recordatorio a cliente ${client.id}:`, error);
      }
    }
  }

/**
 * Obtiene clientes que necesitan factura
 */
async getClientsNeedingInvoice(targetDate) {
  const db = require('../models');
  const { ClientBilling, Client, ServicePackage } = db;
  
  const billingDay = targetDate.getDate();
  
  return await ClientBilling.findAll({
    where: {
      billingDay: billingDay
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
}



/**
 * Obtiene clientes vencidos para suspensión
 */
async getOverdueClients() {
  const db = require('../models');
  const { ClientBilling, Client } = db;
  
  const today = new Date();
  
  return await ClientBilling.findAll({
    where: {
      nextDueDate: {
        [db.Sequelize.Op.lt]: today
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
}

/**
 * Obtiene clientes que necesitan recordatorio
 */
async getClientsNeedingReminder() {
  const db = require('../models');
  const { ClientBilling, Client } = db;
  
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  return await ClientBilling.findAll({
    where: {
      nextDueDate: {
        [db.Sequelize.Op.between]: [today, threeDaysFromNow]
      },
      clientStatus: 'active'
    },
    include: [
      {
        model: Client,
        as: 'client',  // ← AGREGAR ESTE ALIAS
        where: { active: true }
      }
    ]
  });
}
/**
 * Obtiene clientes que necesitan recordatorio
 */
async getClientsNeedingReminder() {
  const db = require('../models');
  const { ClientBilling, Client } = db;
  
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  return await ClientBilling.findAll({
    where: {
      nextDueDate: {
        [db.Sequelize.Op.between]: [today, threeDaysFromNow]
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
}

/**
 * Crea factura automática para un cliente
 */
async createAutomaticInvoice(client) {
  const db = require('../models');
  const { Invoice, Subscription } = db;
  
  // Calcular período de facturación
  const today = new Date();
  const billingDay = client.billingDay;
  
  const periodStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, billingDay - 1);
  const dueDate = new Date(periodEnd.getTime() + (client.graceDays * 24 * 60 * 60 * 1000));
  
  // Verificar si ya existe factura
  const existingInvoice = await Invoice.findOne({
    where: {
      clientId: client.clientId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd
    }
  });
  
  if (existingInvoice) {
    console.log(`Factura ya existe para cliente ${client.clientId}`);
    return null;
  }
  
  // Generar número de factura
  const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${client.clientId}-${Date.now().toString().slice(-4)}`;

// Obtener o crear suscripción activa para el cliente
let subscription = await Subscription.findOne({
  where: { 
    clientId: client.clientId,
    status: 'active'
  }
});

if (!subscription) {
  // Crear suscripción básica si no existe
  subscription = await Subscription.create({
    clientId: client.clientId,
    servicePackageId: client.servicePackageId,
    monthlyFee: client.monthlyFee,
    billingDay: client.billingDay,
    status: 'active',
    startDate: new Date()
  });
}
  
  // Crear factura
  const invoice = await Invoice.create({
    clientId: client.clientId,
    subscriptionId: subscription.id,
    invoiceNumber: invoiceNumber,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    amount: client.monthlyFee,
    taxAmount: 0,
    totalAmount: client.monthlyFee,
    dueDate: dueDate,
    status: 'pending',
    invoiceData: {
      servicePackage: client.ServicePackage?.name,
      billingDay: billingDay,
      generatedAt: new Date().toISOString()
    }
  });
  
  console.log(`Factura ${invoiceNumber} creada para cliente ${client.clientId}`);
  return invoice;
}


/**
 * Suspende un cliente específico
 */
async suspendClientService(clientId) {
  const db = require('../models');
  const { ClientBilling } = db;
  
  await ClientBilling.update(
    { clientStatus: 'suspended' },
    { where: { clientId } }
  );
  
  console.log(`Cliente ${clientId} suspendido por falta de pago`);
}

/**
 * Crea notificación de suspensión
 */
async createSuspensionNotification(client) {
  return await this.createBillingNotification(client.clientId, {
    type: 'service_suspended',
    title: `SERVICIO SUSPENDIDO - ${client.client.firstName} ${client.client.lastName}`,  // ← client.client.firstName
    message: `Servicio suspendido por falta de pago. Fecha vencimiento: ${client.nextDueDate}`,
    priority: 'high'
  });
}

/**
 * Crea notificación de recordatorio
 */
async createPaymentReminderNotification(client) {
  const daysUntilDue = Math.ceil((new Date(client.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  return await this.createBillingNotification(client.clientId, {
    type: 'payment_reminder',
    title: `Recordatorio de Pago - ${client.client?.firstName || 'Cliente'} ${client.client?.lastName || client.clientId}`,
    message: `Su factura de $${client.monthlyFee} vence en ${daysUntilDue} días.`,
    priority: 'medium'
  });
}
/**
 * Crea notificación de suspensión
 */
async createSuspensionNotification(client) {
  return await this.createBillingNotification(client.clientId, {
    type: 'service_suspended',
    title: `🚫 SERVICIO SUSPENDIDO - ${client.client?.firstName || 'Cliente'} ${client.client?.lastName || client.clientId}`,
    message: `Servicio suspendido por falta de pago. Fecha vencimiento: ${client.nextDueDate}`,
    priority: 'high'
  });
}

/**
 * Crea notificación de recordatorio
 */
async createPaymentReminderNotification(client) {
  const daysUntilDue = Math.ceil((new Date(client.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  return await this.createBillingNotification(client.clientId, {
    type: 'payment_reminder',
    title: `📅 Recordatorio de Pago - ${client.Client.firstName} ${client.Client.lastName}`,
    message: `Su factura de $${client.monthlyFee} vence en ${daysUntilDue} días.`,
    priority: 'medium'
  });
}
}

module.exports = new BillingService();