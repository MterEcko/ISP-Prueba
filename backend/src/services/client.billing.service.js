const db = require('../models');
const logger = require('../utils/logger');
const MikrotikService = require('./mikrotik.service');
const moment = require('moment');

// Modelos necesarios
const ClientBilling = db.ClientBilling;
const Client = db.Client;
const ServicePackage = db.ServicePackage;
const IpPool = db.IpPool;
const MikrotikRouter = db.MikrotikRouter;
const Invoice = db.Invoice;
const Payment = db.Payment;
const PaymentReminder = db.PaymentReminder;
const ClientNetworkConfig = db.ClientNetworkConfig;

// Importar servicio de comunicaciones con manejo seguro
let communicationService;
try {
  communicationService = require('./communication.service');
} catch (error) {
  logger.warn('Servicio de comunicaciones no disponible');
  communicationService = null;
}

class ClientBillingService {
  constructor() {
    this.billingCache = new Map();
    this.processedToday = new Set();
  }

  /**
   * Calcula la facturación mensual para un cliente específico
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Cálculo de facturación
   */
  async calculateMonthlyBilling(clientId) {
    try {
      logger.info(`Calculando facturación mensual para cliente ${clientId}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            as: 'clientBilling',  // ✅ AGREGAR ALIAS
            include: [{ 
              model: ServicePackage,
              as: 'ServicePackage',  // ✅ AGREGAR ALIAS			
            }]
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      if (!client.clientBilling) {
        throw new Error(`Cliente ${clientId} no tiene configuración de facturación`);
      }

      const billing = client.clientBilling;
      const servicePackageData = billing.ServicePackage;

      if (!servicePackageData) {
        throw new Error(`Cliente ${clientId} no tiene paquete de servicio asignado`);
      }

      // Calcular fechas del período de facturación
      const today = new Date();
      const billingDay = billing.billingDay || 1;
      
      let periodStart, periodEnd, nextDueDate;
      
      if (today.getDate() >= billingDay) {
        // El período actual
        periodStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, billingDay - 1);
        nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
      } else {
        // El período anterior
        periodStart = new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
        periodEnd = new Date(today.getFullYear(), today.getMonth(), billingDay - 1);
        nextDueDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
      }

      // Calcular monto base
      let baseAmount = parseFloat(servicePackageData.price);

      // Aplicar descuentos o recargos según el tipo de ciclo
      if (servicePackageData.billingCycle === 'weekly') {
        baseAmount = baseAmount * 4.33; // Aproximadamente un mes
      }

      // Verificar pagos pendientes y multas
      let penaltyAmount = 0;
      const overdueDays = this._calculateOverdueDays(billing.nextDueDate);
      
      if (overdueDays > billing.graceDays) {
        penaltyAmount = parseFloat(billing.penaltyFee) || 0;
      }

      // Verificar facturas pendientes
      const pendingInvoices = await Invoice.findAll({
        where: {
          clientId: clientId,
          status: ['pending', 'overdue']
        },
        order: [['dueDate', 'ASC']]
      });

      const totalPending = pendingInvoices.reduce((sum, invoice) => 
        sum + parseFloat(invoice.totalAmount), 0
      );

      const calculation = {
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        ServicePackage : {
          id: servicePackageData.id,
          name: servicePackageData.name,
          price: servicePackageData.price,
          billingCycle: servicePackageData.billingCycle
        },
        billingPeriod: {
          start: periodStart,
          end: periodEnd,
          nextDueDate
        },
        amounts: {
          baseAmount,
          penaltyAmount,
          totalPending,
          totalDue: baseAmount + penaltyAmount + totalPending
        },
        paymentStatus: {
          status: billing.clientStatus,
          overdueDays,
          graceDaysRemaining: Math.max(0, billing.graceDays - overdueDays),
          lastPaymentDate: billing.lastPaymentDate
        },
        pendingInvoices: pendingInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount,
          dueDate: inv.dueDate,
          daysPastDue: this._calculateOverdueDays(inv.dueDate)
        }))
      };

      return {
        success: true,
        data: calculation,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error calculando facturación mensual para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa la facturación de todos los clientes para una fecha específica
   * @param {Date} date - Fecha de procesamiento (default: hoy)
   * @returns {Promise<Object>} Resultado del procesamiento masivo
   */
  async processAllClientsBilling(date = new Date()) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Iniciando procesamiento masivo de facturación para ${date.toISOString().split('T')[0]}`);

      const billingDay = date.getDate();
      const processKey = `${date.getFullYear()}-${date.getMonth()}-${billingDay}`;

      // Evitar procesamiento duplicado
      if (this.processedToday.has(processKey)) {
        logger.warn(`Facturación ya procesada para ${processKey}`);
        return {
          success: true,
          message: 'Facturación ya procesada para esta fecha',
          data: { processed: 0, skipped: 0 }
        };
      }

      // Obtener clientes que deben ser facturados hoy
      const clientsToProcess = await ClientBilling.findAll({
        where: {
          billingDay: billingDay
        },
        include: [
          {
            model: Client,
            where: { active: true }
          },
          {
            model: ServicePackage ,
            where: { active: true }
          }
        ],
        transaction
      });

      let results = {
        processed: 0,
        skipped: 0,
        errors: [],
        invoicesGenerated: 0,
        statusChanges: 0
      };

      for (const billing of clientsToProcess) {
        try {
          // Procesar cliente individual
          const clientResult = await this._processIndividualClientBilling(
            billing.clientId, 
            date, 
            transaction
          );

          if (clientResult.processed) {
            results.processed++;
            if (clientResult.invoiceGenerated) results.invoicesGenerated++;
            if (clientResult.statusChanged) results.statusChanges++;
          } else {
            results.skipped++;
          }

        } catch (clientError) {
          logger.error(`Error procesando cliente ${billing.clientId}: ${clientError.message}`);
          results.errors.push({
            clientId: billing.clientId,
            clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
            error: clientError.message
          });
        }
      }

      // Marcar como procesado
      this.processedToday.add(processKey);

      await transaction.commit();

      logger.info(`Procesamiento masivo completado: ${results.processed} procesados, ${results.skipped} omitidos, ${results.errors.length} errores`);

      return {
        success: true,
        data: results,
        message: `Procesados ${results.processed} clientes, generadas ${results.invoicesGenerated} facturas`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error en procesamiento masivo de facturación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera una factura para un cliente y período específico
   * @param {number} clientId - ID del cliente
   * @param {Object} period - Período de facturación
   * @returns {Promise<Object>} Factura generada
   */
  async generateInvoice(clientId, period) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Generando factura para cliente ${clientId}`);

      const calculation = await this.calculateMonthlyBilling(clientId);
      const billingData = calculation.data;

      // Verificar si ya existe factura para este período
      const existingInvoice = await Invoice.findOne({
        where: {
          clientId: clientId,
          billingPeriodStart: period.start,
          billingPeriodEnd: period.end
        },
        transaction
      });

      if (existingInvoice) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Ya existe una factura para este período',
          data: { existingInvoice: existingInvoice.invoiceNumber }
        };
      }

      // Generar número de factura único
      const invoiceNumber = await this._generateInvoiceNumber();

      // Crear factura
      const invoice = await Invoice.create({
        clientId: clientId,
        invoiceNumber: invoiceNumber,
        billingPeriodStart: period.start,
        billingPeriodEnd: period.end,
        amount: billingData.amounts.baseAmount,
        taxAmount: 0, // Por ahora sin impuestos, se puede calcular después
        totalAmount: billingData.amounts.totalDue,
        dueDate: billingData.billingPeriod.nextDueDate,
        status: 'pending',
        invoiceData: {
          client: {
            name: billingData.clientName,
            ServicePackage : billingData.servicePackage
          },
          billing: {
            period: billingData.billingPeriod,
            amounts: billingData.amounts
          },
          generatedAt: new Date().toISOString()
        }
      }, { transaction });

      // Actualizar próxima fecha de vencimiento en la configuración del cliente
      await ClientBilling.update({
        nextDueDate: billingData.billingPeriod.nextDueDate
      }, {
        where: { clientId: clientId },
        transaction
      });

      await transaction.commit();

      logger.info(`Factura ${invoiceNumber} generada exitosamente para cliente ${clientId}`);

      return {
        success: true,
        data: {
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            status: invoice.status
          },
          client: billingData.clientName,
          period: billingData.billingPeriod
        },
        message: `Factura ${invoiceNumber} generada exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error generando factura para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un cliente y maneja el movimiento entre pools
   * @param {number} clientId - ID del cliente
   * @param {string} status - Nuevo estado ('active', 'suspended', 'cut_service')
   * @param {string} reason - Razón del cambio de estado
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateClientStatus(clientId, status, reason = 'Actualización manual') {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Actualizando estado del cliente ${clientId} a ${status}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [{ model: IpPool, as: 'currentPool' }]
          }
        ],
        transaction
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      if (!client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no tiene configuración de facturación`);
      }

      const billing = client.ClientBilling;
      const currentPoolType = billing.currentPool?.poolType;
      const targetPoolType = this._getPoolTypeForStatus(status);

      // Actualizar estado en la configuración de facturación
      await billing.update({
        clientStatus: status
      }, { transaction });

      let poolMovement = null;

      // Mover cliente entre pools si es necesario
      if (currentPoolType !== targetPoolType) {
        try {
          await transaction.commit(); // Commit antes de llamar al servicio externo
          
          poolMovement = await MikrotikService.moveClientBetweenPools(
            clientId, 
            currentPoolType, 
            targetPoolType
          );

        } catch (poolError) {
          logger.error(`Error moviendo cliente entre pools: ${poolError.message}`);
          // No fallar la operación completa por error de pool
          poolMovement = {
            success: false,
            error: poolError.message
          };
        }
      } else {
        await transaction.commit();
      }

      // Registrar el cambio de estado en las notas
      const statusHistory = billing.notes ? JSON.parse(billing.notes) : [];
      statusHistory.push({
        date: new Date().toISOString(),
        status,
        reason,
        previousStatus: billing.clientStatus,
        poolMovement: poolMovement?.success || false
      });

      // Actualizar notas con el historial
      await ClientBilling.update({
        notes: JSON.stringify(statusHistory.slice(-10)) // Mantener solo los últimos 10 cambios
      }, {
        where: { clientId: clientId }
      });

      // Programar recordatorios si es necesario
      if (status === 'suspended') {
        await this._schedulePaymentReminders(clientId);
      }

      return {
        success: true,
        data: {
          clientId,
          newStatus: status,
          reason,
          poolMovement,
          timestamp: new Date().toISOString()
        },
        message: `Estado del cliente actualizado a ${status}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error actualizando estado del cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa el período de gracia para un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processGracePeriod(clientId) {
    try {
      logger.info(`Procesando período de gracia para cliente ${clientId}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [{ model: ServicePackage  }]
          }
        ]
      });

      if (!client || !client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no encontrado o sin configuración de facturación`);
      }

      const billing = client.ClientBilling;
      const overdueDays = this._calculateOverdueDays(billing.nextDueDate);
      const graceDaysRemaining = Math.max(0, billing.graceDays - overdueDays);

      let action = null;
      let newStatus = billing.clientStatus;

      if (overdueDays > 0 && graceDaysRemaining > 0) {
        // En período de gracia
        if (billing.clientStatus === 'active') {
          newStatus = 'suspended';
          action = 'suspended_grace_period';
          
          // Mover a pool de suspendidos
          await this.updateClientStatus(clientId, 'suspended', 'Período de gracia iniciado');
        }
      } else if (overdueDays > billing.graceDays) {
        // Período de gracia vencido
        if (billing.clientStatus !== 'cutService') {
          newStatus = 'cutService';
          action = 'cut_service_grace_expired';
          
          // Aplicar multa y cortar servicio
          await this.applyPenaltyFee(clientId);
          await this.updateClientStatus(clientId, 'cutService', 'Período de gracia vencido');
        }
      }

      return {
        success: true,
        data: {
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          overdueDays,
          graceDaysRemaining,
          currentStatus: billing.clientStatus,
          newStatus,
          action,
          nextDueDate: billing.nextDueDate
        },
        message: action ? `Acción ejecutada: ${action}` : 'Sin acciones requeridas'
      };

    } catch (error) {
      logger.error(`Error procesando período de gracia para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aplica multa por pago tardío a un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado de la aplicación de multa
   */
  async applyPenaltyFee(clientId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Aplicando multa por pago tardío a cliente ${clientId}`);

      const billing = await ClientBilling.findOne({
        where: { clientId: clientId },
        include: [{ model: ServicePackage  }],
        transaction
      });

      if (!billing) {
        throw new Error(`Configuración de facturación no encontrada para cliente ${clientId}`);
      }

      const penaltyAmount = parseFloat(billing.penaltyFee) || 0;

      if (penaltyAmount <= 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No hay multa configurada para este cliente'
        };
      }

      // Verificar si ya se aplicó multa este mes
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const existingPenalty = await Invoice.findOne({
        where: {
          clientId: clientId,
          invoiceData: {
            type: 'penaltyFee'
          },
          createdAt: {
            [db.Sequelize.Op.gte]: monthStart
          }
        },
        transaction
      });

      if (existingPenalty) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Multa ya aplicada este mes'
        };
      }

      // Generar factura de multa
      const invoiceNumber = await this._generateInvoiceNumber();
      
      const penaltyInvoice = await Invoice.create({
        clientId: clientId,
        invoiceNumber: invoiceNumber,
        billingPeriodStart: today,
        billingPeriodEnd: today,
        amount: penaltyAmount,
        taxAmount: 0,
        totalAmount: penaltyAmount,
        dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días
        status: 'pending',
        invoiceData: {
          type: 'penaltyFee',
          reason: 'Pago tardío',
          originalDueDate: billing.nextDueDate,
          penaltyRate: penaltyAmount,
          appliedAt: new Date().toISOString()
        }
      }, { transaction });

      await transaction.commit();

      logger.info(`Multa de $${penaltyAmount} aplicada al cliente ${clientId} - Factura: ${invoiceNumber}`);

      return {
        success: true,
        data: {
          clientId,
          penaltyAmount,
          invoiceNumber,
          dueDate: penaltyInvoice.dueDate
        },
        message: `Multa de $${penaltyAmount} aplicada exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error aplicando multa a cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mueve cliente basado en su estado de pago
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado del movimiento
   */
  async moveClientByPaymentStatus(clientId) {
    try {
      logger.info(`Evaluando movimiento de cliente ${clientId} por estado de pago`);

      const calculation = await this.calculateMonthlyBilling(clientId);
      const billingData = calculation.data;

      let targetStatus = 'active';

      // Determinar estado objetivo basado en el estado de pago
      if (billingData.paymentStatus.overdueDays > 0) {
        if (billingData.paymentStatus.graceDaysRemaining > 0) {
          targetStatus = 'suspended';
        } else {
          targetStatus = 'cutService';
        }
      }

      // Si el estado actual es diferente al objetivo, actualizar
      if (billingData.paymentStatus.status !== targetStatus) {
        const reason = `Movimiento automático: ${billingData.paymentStatus.overdueDays} días de atraso`;
        return await this.updateClientStatus(clientId, targetStatus, reason);
      }

      return {
        success: true,
        data: {
          clientId,
          currentStatus: billingData.paymentStatus.status,
          noChangeRequired: true
        },
        message: 'Cliente ya está en el estado correcto'
      };

    } catch (error) {
      logger.error(`Error moviendo cliente ${clientId} por estado de pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene clientes que deben ser movidos a un pool específico
   * @param {string} status - Estado objetivo ('active', 'suspended', 'cutService')
   * @returns {Promise<Object>} Lista de clientes
   */
  async getClientsForPoolMove(status) {
    try {
      logger.info(`Obteniendo clientes para mover a estado ${status}`);

      const poolType = this._getPoolTypeForStatus(status);
      
      // Obtener clientes que no están en el pool correcto según su estado
      const clients = await ClientBilling.findAll({
        where: {
          clientStatus: status
        },
        include: [
          {
            model: Client,
            where: { active: true }
          },
          {
            model: IpPool,
            as: 'currentPool',
            where: {
              poolType: { [db.Sequelize.Op.ne]: poolType }
            }
          },
          {
            model: ServicePackage 
          }
        ]
      });

      const clientList = clients.map(billing => ({
        clientId: billing.clientId,
        clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
        currentStatus: billing.clientStatus,
        currentPool: billing.currentPool?.poolName,
        currentPoolType: billing.currentPool?.poolType,
        targetPoolType: poolType,
        ServicePackage : billing.servicePackage?.name,
        lastPaymentDate: billing.lastPaymentDate,
        nextDueDate: billing.nextDueDate
      }));

      return {
        success: true,
        data: {
          targetStatus: status,
          targetPoolType: poolType,
          clientsToMove: clientList,
          totalClients: clientList.length
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo clientes para pool ${status}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera reporte de facturación para un período
   * @param {Date} startDate - Fecha inicial
   * @param {Date} endDate - Fecha final
   * @returns {Promise<Object>} Reporte de facturación
   */
  async getBillingReport(startDate, endDate) {
    try {
      logger.info(`Generando reporte de facturación del ${startDate.toISOString().split('T')[0]} al ${endDate.toISOString().split('T')[0]}`);

      // Obtener facturas del período
      const invoices = await Invoice.findAll({
        where: {
          createdAt: {
            [db.Sequelize.Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Obtener pagos del período
      const payments = await Payment.findAll({
        where: {
          paymentDate: {
            [db.Sequelize.Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Invoice,
            attributes: ['invoiceNumber']
          }
        ]
      });

      // Calcular estadísticas
      const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const totalPaid = payments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
      const pendingAmount = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      // Agrupar por estado
      const invoicesByStatus = invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {});

      // Top clientes por facturación
      const clientTotals = {};
      invoices.forEach(inv => {
        const clientKey = inv.Client.id;
        if (!clientTotals[clientKey]) {
          clientTotals[clientKey] = {
            clientId: inv.Client.id,
            clientName: `${inv.Client.firstName} ${inv.Client.lastName}`,
            totalInvoiced: 0,
            invoiceCount: 0
          };
        }
        clientTotals[clientKey].totalInvoiced += parseFloat(inv.totalAmount);
        clientTotals[clientKey].invoiceCount++;
      });

      const topClients = Object.values(clientTotals)
        .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
        .slice(0, 10);

      return {
        success: true,
        data: {
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalInvoices: invoices.length,
            totalInvoiced: totalInvoiced.toFixed(2),
            totalPayments: payments.length,
            totalPaid: totalPaid.toFixed(2),
            pendingAmount: pendingAmount.toFixed(2),
            collectionRate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(2) : '0.00'
          },
          invoicesByStatus,
          topClients,
          recentInvoices: invoices.slice(0, 20).map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: `${inv.Client.firstName} ${inv.Client.lastName}`,
            amount: inv.totalAmount,
            status: inv.status,
            dueDate: inv.dueDate,
            createdAt: inv.createdAt
          })),
          recentPayments: payments.slice(0, 20).map(pay => ({
            id: pay.id,
            clientName: `${pay.Client.firstName} ${pay.Client.lastName}`,
            amount: pay.amount,
            method: pay.paymentMethod,
            paymentDate: pay.paymentDate,
            invoiceNumber: pay.Invoice?.invoiceNumber
          }))
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error generando reporte de facturación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene clientes con pagos atrasados
   * @returns {Promise<Object>} Lista de clientes morosos
   */
  async getOverdueClients() {
    try {
      logger.info('Obteniendo clientes con pagos atrasados');

      const today = new Date();
      
      const overdueClients = await ClientBilling.findAll({
        where: {
          nextDueDate: {
            [db.Sequelize.Op.lt]: today
          },
          clientStatus: {
            [db.Sequelize.Op.in]: ['active', 'suspended', 'cutService']
          }
        },
        include: [
          {
            model: Client,
            where: { active: true }
          },
          {
            model: ServicePackage 
          },
          {
            model: IpPool,
            as: 'currentPool'
          }
        ],
        order: [['nextDueDate', 'ASC']]
      });

      const overdueList = overdueClients.map(billing => {
const overdueDays = this._calculateOverdueDays(billing.nextDueDate);
       const graceDaysRemaining = Math.max(0, billing.graceDays - overdueDays);
       
       return {
         clientId: billing.clientId,
         clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
         ServicePackage : billing.servicePackage?.name,
         monthlyFee: billing.monthlyFee,
         nextDueDate: billing.nextDueDate,
         overdueDays,
         graceDaysRemaining,
         currentStatus: billing.clientStatus,
         currentPool: billing.currentPool?.poolName,
         lastPaymentDate: billing.lastPaymentDate,
         penaltyFee: billing.penaltyFee,
         riskLevel: this._calculateRiskLevel(overdueDays, graceDaysRemaining)
       };
     });

     // Agrupar por nivel de riesgo
     const riskGroups = overdueList.reduce((acc, client) => {
       acc[client.riskLevel] = (acc[client.riskLevel] || []);
       acc[client.riskLevel].push(client);
       return acc;
     }, {});

     return {
       success: true,
       data: {
         totalOverdue: overdueList.length,
         riskGroups,
         clients: overdueList,
         summary: {
           critical: riskGroups.critical?.length || 0,
           high: riskGroups.high?.length || 0,
           medium: riskGroups.medium?.length || 0,
           low: riskGroups.low?.length || 0
         }
       },
       timestamp: new Date().toISOString()
     };

   } catch (error) {
     logger.error(`Error obteniendo clientes morosos: ${error.message}`);
     throw error;
   }
 }

 /**
  * Obtiene proyección de ingresos para los próximos meses
  * @param {number} months - Número de meses a proyectar
  * @returns {Promise<Object>} Proyección de ingresos
  */
 async getRevenueProjection(months = 6) {
   try {
     logger.info(`Generando proyección de ingresos para ${months} meses`);

     // Obtener clientes activos con sus paquetes
     const activeClients = await ClientBilling.findAll({
       where: {
         clientStatus: 'active'
       },
       include: [
         {
           model: Client,
           where: { active: true }
         },
         {
           model: ServicePackage ,
           where: { active: true }
         }
       ]
     });

     // Calcular ingresos mensuales base
     const monthlyRevenue = activeClients.reduce((sum, billing) => {
       const packagePrice = parseFloat(billing.servicePackage.price);
       // Ajustar por ciclo de facturación
       if (billing.servicePackage.billingCycle === 'weekly') {
         return sum + (packagePrice * 4.33); // ~1 mes
       }
       return sum + packagePrice;
     }, 0);

     // Obtener historial de pagos de los últimos 6 meses para calcular tasa de cobro
     const sixMonthsAgo = new Date();
     sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

     const historicalPayments = await Payment.findAll({
       where: {
         paymentDate: {
           [db.Sequelize.Op.gte]: sixMonthsAgo
         },
         status: 'completed'
       }
     });

     const historicalInvoices = await Invoice.findAll({
       where: {
         createdAt: {
           [db.Sequelize.Op.gte]: sixMonthsAgo
         }
       }
     });

     // Calcular tasa de cobro histórica
     const totalInvoiced = historicalInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
     const totalCollected = historicalPayments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
     const collectionRate = totalInvoiced > 0 ? totalCollected / totalInvoiced : 0.85; // Default 85%

     // Generar proyección mensual
     const projection = [];
     const today = new Date();

     for (let i = 0; i < months; i++) {
       const projectionDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
       
       // Aplicar factores estacionales (opcional)
       let seasonalFactor = 1.0;
       const month = projectionDate.getMonth();
       
       // Ejemplo: diciembre y enero pueden tener menor cobro
       if (month === 11 || month === 0) {
         seasonalFactor = 0.9;
       }

       // Proyectar crecimiento (opcional, 2% mensual)
       const growthFactor = Math.pow(1.02, i);

       const projectedRevenue = monthlyRevenue * collectionRate * seasonalFactor * growthFactor;

       projection.push({
         month: projectionDate.toISOString().substring(0, 7), // YYYY-MM
         projectedInvoiced: (monthlyRevenue * growthFactor).toFixed(2),
         expectedCollected: projectedRevenue.toFixed(2),
         collectionRate: (collectionRate * 100).toFixed(1),
         seasonalFactor,
         growthFactor: growthFactor.toFixed(3),
         activeClientsProjected: Math.round(activeClients.length * growthFactor)
       });
     }

     // Calcular totales
     const totalProjectedInvoiced = projection.reduce((sum, p) => sum + parseFloat(p.projectedInvoiced), 0);
     const totalExpectedCollected = projection.reduce((sum, p) => sum + parseFloat(p.expectedCollected), 0);

     return {
       success: true,
       data: {
         currentMetrics: {
           activeClients: activeClients.length,
           monthlyRevenue: monthlyRevenue.toFixed(2),
           historicalCollectionRate: (collectionRate * 100).toFixed(1)
         },
         projection,
         summary: {
           totalProjectedInvoiced: totalProjectedInvoiced.toFixed(2),
           totalExpectedCollected: totalExpectedCollected.toFixed(2),
           averageMonthlyRevenue: (totalExpectedCollected / months).toFixed(2)
         }
       },
       timestamp: new Date().toISOString()
     };

   } catch (error) {
     logger.error(`Error generando proyección de ingresos: ${error.message}`);
     throw error;
   }
 }

 /**
  * Reactiva servicio de cliente después de pago
  */
 async reactivateClientAfterPayment(clientId, paymentReference) {
   try {
     logger.info(`Reactivando servicio para cliente ${clientId} - Pago: ${paymentReference}`);
     
     return await this.updateClientStatus(
       clientId, 
       'active', 
       `Servicio reactivado - Pago confirmado: ${paymentReference}`
     );
   } catch (error) {
     logger.error(`Error reactivando servicio para cliente ${clientId}: ${error.message}`);
     throw error;
   }
 }

 /**
  * Suspende cliente por falta de pago
  */
 async suspendClientForNonPayment(clientId, reason) {
   try {
     logger.info(`Suspendiendo servicio cliente ${clientId} - Razón: ${reason}`);
     
     return await this.updateClientStatus(clientId, 'suspended', reason);
   } catch (error) {
     logger.error(`Error suspendiendo cliente ${clientId}: ${error.message}`);
     throw error;
   }
 }

 /**
  * Calcula próxima fecha de vencimiento
  */
 async calculateNextDueDate(clientId, billingDay) {
   try {
     const today = new Date();
     const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
     
     // Si el día de facturación es mayor que los días del próximo mes
     const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
     if (billingDay > lastDayOfNextMonth) {
       nextDueDate.setDate(lastDayOfNextMonth);
     }
     
     return {
       success: true,
       data: { nextDueDate },
       message: 'Próxima fecha calculada'
     };
   } catch (error) {
     logger.error(`Error calculando próxima fecha para cliente ${clientId}: ${error.message}`);
     throw error;
   }
 }

 /**
  * Genera facturas automáticas para todos los clientes
  */
 async generateAutomaticInvoices() {
   try {
     logger.info('Iniciando generación automática de facturas');
     
     const today = new Date();
     return await this.processAllClientsBilling(today);
   } catch (error) {
     logger.error(`Error en generación automática de facturas: ${error.message}`);
     throw error;
   }
 }

 /**
  * Mueve cliente entre pools de IP
  */
 async moveClientBetweenPools(clientId, newPoolType) {
   try {
     logger.info(`Moviendo cliente ${clientId} a pool tipo ${newPoolType}`);
     
     // Determinar estado según pool type
     let targetStatus = 'active';
     if (newPoolType === 'suspended') targetStatus = 'suspended';
     if (newPoolType === 'cutService') targetStatus = 'cutService';
     
     return await this.updateClientStatus(
       clientId, 
       targetStatus, 
       `Movimiento manual a pool ${newPoolType}`
     );
   } catch (error) {
     logger.error(`Error moviendo cliente ${clientId} a pool ${newPoolType}: ${error.message}`);
     throw error;
   }
 }

 /**
  * Obtiene resumen financiero completo de un cliente
  */
 async getClientFinancialSummary(clientId) {
   try {
     const [billing, invoices, payments] = await Promise.all([
       this.calculateMonthlyBilling(clientId),
       Invoice.findAll({
         where: { clientId },
         order: [['createdAt', 'DESC']],
         limit: 12
       }),
       Payment.findAll({
         where: { clientId },
         order: [['paymentDate', 'DESC']],
         limit: 12
       })
     ]);

     return {
       success: true,
       data: {
         currentBilling: billing.data,
         recentInvoices: invoices,
         recentPayments: payments,
         totalPaid: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
         totalInvoiced: invoices.reduce((sum, i) => sum + parseFloat(i.totalAmount), 0)
       }
     };
   } catch (error) {
     logger.error(`Error obteniendo resumen financiero cliente ${clientId}: ${error.message}`);
     throw error;
   }
 }

 // ==================== MÉTODOS PRIVADOS ====================

 /**
  * Procesa la facturación individual de un cliente
  * @private
  */
 async _processIndividualClientBilling(clientId, date, transaction) {
   try {
     const billing = await ClientBilling.findOne({
       where: { clientId: clientId },
       include: [{ model: ServicePackage  }],
       transaction
     });

     if (!billing || !billing.servicePackage) {
       return { processed: false, reason: 'Sin configuración válida' };
     }

     // Verificar si ya hay factura para este período
     const periodStart = new Date(date.getFullYear(), date.getMonth(), billing.billingDay);
     const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, billing.billingDay - 1);

     const existingInvoice = await Invoice.findOne({
       where: {
         clientId: clientId,
         billingPeriodStart: periodStart,
         billingPeriodEnd: periodEnd
       },
       transaction
     });

     if (existingInvoice) {
       return { processed: false, reason: 'Factura ya existe' };
     }

     // Generar factura
     await this.generateInvoice(clientId, { start: periodStart, end: periodEnd });

     // Evaluar estado de pago y mover si es necesario
     const overdueDays = this._calculateOverdueDays(billing.nextDueDate);
     let statusChanged = false;

     if (overdueDays > billing.graceDays && billing.clientStatus !== 'cutService') {
       await this.updateClientStatus(clientId, 'cutService', 'Procesamiento automático - período vencido');
       statusChanged = true;
     } else if (overdueDays > 0 && billing.clientStatus === 'active') {
       await this.updateClientStatus(clientId, 'suspended', 'Procesamiento automático - pago pendiente');
       statusChanged = true;
     }

     return {
       processed: true,
       invoiceGenerated: true,
       statusChanged
     };

   } catch (error) {
     logger.error(`Error procesando cliente individual ${clientId}: ${error.message}`);
     throw error;
   }
 }

 /**
  * Genera un número de factura único
  * @private
  */
 async _generateInvoiceNumber() {
   const today = new Date();
   const year = today.getFullYear();
   const month = String(today.getMonth() + 1).padStart(2, '0');
   
   // Obtener el último número de factura del mes
   const lastInvoice = await Invoice.findOne({
     where: {
       invoiceNumber: {
         [db.Sequelize.Op.like]: `${year}${month}%`
       }
     },
     order: [['invoiceNumber', 'DESC']]
   });

   let sequence = 1;
   if (lastInvoice) {
     const lastSequence = parseInt(lastInvoice.invoiceNumber.substring(6)) || 0;
     sequence = lastSequence + 1;
   }

   return `${year}${month}${String(sequence).padStart(4, '0')}`;
 }

 /**
  * Calcula días de atraso
  * @private
  */
 _calculateOverdueDays(dueDate) {
   if (!dueDate) return 0;
   
   const today = new Date();
   const due = new Date(dueDate);
   const diffTime = today - due;
   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   
   return Math.max(0, diffDays);
 }

 /**
  * Obtiene el tipo de pool según el estado
  * @private
  */
 _getPoolTypeForStatus(status) {
   switch (status) {
     case 'active': return 'active';
     case 'suspended': return 'suspended';
     case 'cutService': return 'cutService';
     default: return 'suspended';
   }
 }

 /**
  * Calcula el nivel de riesgo de un cliente
  * @private
  */
 _calculateRiskLevel(overdueDays, graceDaysRemaining) {
   if (overdueDays > 30) return 'critical';
   if (overdueDays > 15 || graceDaysRemaining === 0) return 'high';
   if (overdueDays > 7) return 'medium';
   return 'low';
 }

 /**
  * Programa recordatorios de pago para un cliente
  * @private
  */
 async _schedulePaymentReminders(clientId) {
   try {
     // Verificar si ya hay recordatorios pendientes
     const existingReminders = await PaymentReminder.findAll({
       where: {
         clientId: clientId,
         status: 'pending'
       }
     });

     if (existingReminders.length > 0) {
       logger.info(`Cliente ${clientId} ya tiene recordatorios pendientes`);
       return;
     }

     const client = await Client.findByPk(clientId, {
       include: [{ model: ClientBilling }]
     });

     if (!client || !client.ClientBilling) return;

     const overdueDays = this._calculateOverdueDays(client.ClientBilling.nextDueDate);
     
     // Programar recordatorios según días de atraso
     const reminders = [];
     
     if (overdueDays >= 1 && overdueDays < 3) {
       reminders.push({
         clientId: clientId,
         reminderType: 'email',
         daysOverdue: overdueDays,
         status: 'pending',
         messageSent: `Recordatorio de pago - ${overdueDays} día(s) de atraso`
       });
     }
     
     if (overdueDays >= 3 && overdueDays < 7) {
       reminders.push({
         clientId: clientId,
         reminderType: 'whatsapp',
         daysOverdue: overdueDays,
         status: 'pending',
         messageSent: `Recordatorio urgente de pago - ${overdueDays} días de atraso`
       });
     }
     
     if (overdueDays >= 7) {
       reminders.push({
         clientId: clientId,
         reminderType: 'sms',
         daysOverdue: overdueDays,
         status: 'pending',
         messageSent: `Notificación final - Su servicio será suspendido`
       });
     }

     // Crear recordatorios en la base de datos
     if (reminders.length > 0) {
       await PaymentReminder.bulkCreate(reminders);
       
       // Integrar con sistema de comunicaciones si está disponible
       if (communicationService) {
         for (const reminder of reminders) {
           try {
             await communicationService.sendPaymentReminder(
               clientId, 
               reminder.reminderType, 
               reminder.daysOverdue
             );
           } catch (commError) {
             logger.warn(`Error enviando recordatorio: ${commError.message}`);
           }
         }
       }
       
       logger.info(`${reminders.length} recordatorios programados para cliente ${clientId}`);
     }

   } catch (error) {
     logger.error(`Error programando recordatorios para cliente ${clientId}: ${error.message}`);
   }
 }
}

module.exports = new ClientBillingService();