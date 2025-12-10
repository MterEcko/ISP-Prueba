// backend/src/services/invoice.service.js - VERSIÓN CORREGIDA
const db = require('../models');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Modelos
const Invoice = db.Invoice;
const Client = db.Client;
const ClientBilling = db.ClientBilling;
const ServicePackage = db.ServicePackage;
const Subscription = db.Subscription;
const Payment = db.Payment;
const PaymentReminder = db.PaymentReminder;

class InvoiceService {
  constructor() {
    this.invoiceCache = new Map();
    this.pdfTemplates = new Map();
  }

  /**
   * Genera una nueva factura para un cliente
   * @param {Object} invoiceData - Datos de la factura
   * @returns {Promise<Object>} Factura generada
   */
  async generateInvoice(invoiceData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Generando factura para cliente ${invoiceData.clientId}`);

      const {
        clientId,
        subscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        serviceItems = [],
        customItems = [],
        discounts = [],
        taxes = [],
        notes = '',
        userId = 'system'
      } = invoiceData;

      // Validaciones
      if (!clientId || !billingPeriodStart || !billingPeriodEnd) {
        throw new Error('clientId, billingPeriodStart y billingPeriodEnd son requeridos');
      }

      // Obtener cliente con información de facturación
      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [{ model: ServicePackage }]
          }
        ],
        transaction
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // Obtener suscripción si se proporciona
      let subscription = null;
      if (subscriptionId) {
        subscription = await Subscription.findByPk(subscriptionId, {
          include: [{ model: ServicePackage }],
          transaction
        });
      }

      // Verificar si ya existe factura para este período
      const existingInvoice = await Invoice.findOne({
        where: {
          clientId,
          billingPeriodStart: new Date(billingPeriodStart),
          billingPeriodEnd: new Date(billingPeriodEnd)
        },
        transaction
      });

      if (existingInvoice) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Ya existe una factura para este período',
          data: { existingInvoice }
        };
      }

      // Generar número de factura
      const invoiceNumber = await this._generateInvoiceNumber(transaction);

      // Calcular montos
      const calculation = await this._calculateInvoiceAmounts({
        client,
        subscription,
        serviceItems,
        customItems,
        discounts,
        taxes,
        billingPeriodStart,
        billingPeriodEnd
      });

      // Calcular fecha de vencimiento
      const dueDate = this._calculateDueDate(billingPeriodEnd, client.ClientBilling);

      // Crear factura
      const invoice = await Invoice.create({
        clientId,
        subscriptionId,
        invoiceNumber,
        billingPeriodStart: new Date(billingPeriodStart),
        billingPeriodEnd: new Date(billingPeriodEnd),
        amount: calculation.subtotal,
        taxAmount: calculation.totalTax,
        totalAmount: calculation.total,
        dueDate,
        status: 'pending',
        invoiceData: {
          client: {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            phone: client.phone,
            address: client.address
          },
          billing: client.ClientBilling ? {
            servicePackage: client.ClientBilling.ServicePackage?.name,
            billingDay: client.ClientBilling.billingDay,
            paymentMethod: client.ClientBilling.paymentMethod
          } : null,
          subscription: subscription ? {
            id: subscription.id,
            packageName: subscription.ServicePackage?.name,
            monthlyFee: subscription.monthlyFee
          } : null,
          items: {
            services: serviceItems,
            custom: customItems,
            discounts,
            taxes
          },
          calculation,
          period: {
            start: billingPeriodStart,
            end: billingPeriodEnd
          },
          notes,
          generatedAt: new Date().toISOString(),
          generatedBy: userId
        }
      }, { transaction });

      // Actualizar próxima fecha de facturación si aplica
      if (client.ClientBilling) {
        const nextDueDate = moment(dueDate).add(1, 'month').toDate();
        await ClientBilling.update({
          nextDueDate
        }, {
          where: { clientId },
          transaction
        });
      }

      await transaction.commit();

      logger.info(`Factura ${invoiceNumber} generada exitosamente para cliente ${clientId}`);

      return {
        success: true,
        data: {
          invoice,
          calculation,
          nextDueDate: client.ClientBilling ? 
            moment(dueDate).add(1, 'month').toDate() : null
        },
        message: `Factura ${invoiceNumber} generada exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error generando factura: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera PDF de una factura (overload para compatibilidad)
   * @param {number|Object} invoiceParam - ID de la factura o objeto Invoice completo
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Buffer>} Buffer del PDF
   */
  async generateInvoicePDF(invoiceParam, options = {}) {
    try {
      let invoice;
      
      // Determinar si es ID o objeto Invoice
      if (typeof invoiceParam === 'number') {
        logger.info(`Generando PDF para factura ${invoiceParam}`);
        
        invoice = await Invoice.findByPk(invoiceParam, {
          include: [
            {
              model: Client,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address']
            },
            {
              model: Subscription,
              include: [{ model: ServicePackage }]
            }
          ]
        });

        if (!invoice) {
          throw new Error(`Factura ${invoiceParam} no encontrada`);
        }
      } else {
        // Es un objeto Invoice completo
        invoice = invoiceParam;
        logger.info(`Generando PDF para factura ${invoice.invoiceNumber}`);
      }

      // Crear documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Factura ${invoice.invoiceNumber}`,
          Author: 'Sistema ISP',
          Subject: `Factura para ${invoice.Client.firstName} ${invoice.Client.lastName}`,
          Keywords: 'factura, isp, internet'
        }
      });

      // Configurar fuentes
      const regularFont = 'Helvetica';
      const boldFont = 'Helvetica-Bold';

      // Header de la empresa
      await this._addCompanyHeader(doc, regularFont, boldFont);

      // Información de la factura
      await this._addInvoiceInfo(doc, invoice, regularFont, boldFont);

      // Información del cliente
      await this._addClientInfo(doc, invoice.Client, regularFont, boldFont);

      // Línea separadora
      doc.moveTo(50, doc.y + 20)
         .lineTo(550, doc.y)
         .stroke();

      // Detalles de facturación
      await this._addInvoiceDetails(doc, invoice, regularFont, boldFont);

      // Totales
      await this._addInvoiceTotals(doc, invoice, regularFont, boldFont);

      // Footer
      await this._addInvoiceFooter(doc, invoice, regularFont, boldFont);

      // Finalizar documento
      doc.end();

      // Convertir a buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logger.info(`PDF generado exitosamente para factura ${invoice.invoiceNumber}`);
          resolve(pdfBuffer);
        });
        
        doc.on('error', (error) => {
          logger.error(`Error generando PDF: ${error.message}`);
          reject(error);
        });
      });

    } catch (error) {
      logger.error(`Error generando PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera número de factura único (método público)
   * @returns {Promise<string>} Número de factura
   */
  async generateInvoiceNumber() {
    return await this._generateInvoiceNumber();
  }

  /**
   * Calcula impuestos para un monto dado
   * @param {number} amount - Monto base
   * @param {string} clientLocation - Ubicación del cliente (para determinar impuestos)
   * @returns {Promise<Object>} Cálculo de impuestos
   */
  async calculateTaxes(amount, clientLocation = 'MX') {
    try {
      const baseAmount = parseFloat(amount);
      let taxes = [];
      let totalTax = 0;

      // Configuración de impuestos por país/región
      switch (clientLocation) {
        case 'MX':
          // IVA México 16%
          const iva = baseAmount * 0.16;
          taxes.push({
            name: 'IVA',
            rate: 16,
            amount: iva.toFixed(2)
          });
          totalTax += iva;
          break;
        
        case 'US':
          // Sales Tax promedio 7%
          const salesTax = baseAmount * 0.07;
          taxes.push({
            name: 'Sales Tax',
            rate: 7,
            amount: salesTax.toFixed(2)
          });
          totalTax += salesTax;
          break;
        
        default:
          // Sin impuestos por defecto
          break;
      }

      return {
        success: true,
        data: {
          baseAmount: baseAmount.toFixed(2),
          taxes,
          totalTax: totalTax.toFixed(2),
          totalWithTax: (baseAmount + totalTax).toFixed(2)
        }
      };

    } catch (error) {
      logger.error(`Error calculando impuestos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa facturación automática para la fecha actual
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processAutomaticBilling() {
    try {
      logger.info('Iniciando procesamiento automático de facturación');

      const today = new Date();
      const billingDay = today.getDate();

      // Obtener clientes que deben ser facturados hoy
      const clientsToProcess = await ClientBilling.findAll({
        where: {
          billingDay: billingDay,
          clientStatus: 'active'
        },
        include: [
          {
            model: Client,
            where: { active: true }
          },
          {
            model: ServicePackage,
            where: { active: true }
          }
        ]
      });

      let processed = 0;
      let errors = [];

      for (const billing of clientsToProcess) {
        try {
          // Calcular período de facturación
          const periodStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
          const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, billingDay - 1);

          // Generar factura automática
          const result = await this.generateInvoice({
            clientId: billing.clientId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            userId: 'auto-billing-system'
          });

          if (result.success) {
            processed++;
          }

        } catch (clientError) {
          logger.error(`Error procesando cliente ${billing.clientId}: ${clientError.message}`);
          errors.push({
            clientId: billing.clientId,
            clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
            error: clientError.message
          });
        }
      }

      return {
        success: true,
        data: {
          totalClients: clientsToProcess.length,
          processed,
          errors: errors.length,
          errorDetails: errors
        },
        message: `Facturación automática completada: ${processed} facturas generadas`
      };

    } catch (error) {
      logger.error(`Error en procesamiento automático de facturación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marca una factura como pagada
   * @param {number} invoiceId - ID de la factura
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado
   */
  async markInvoiceAsPaid(invoiceId, paymentData = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Marcando factura ${invoiceId} como pagada`);

      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      
      if (!invoice) {
        await transaction.rollback();
        throw new Error(`Factura ${invoiceId} no encontrada`);
      }

      if (invoice.status === 'paid') {
        await transaction.rollback();
        return {
          success: false,
          message: 'La factura ya está marcada como pagada'
        };
      }

      // Actualizar estado de la factura
      await invoice.update({
        status: 'paid'
      }, { transaction });

      // Crear registro de pago si se proporcionan datos
      let payment = null;
      if (paymentData.amount || paymentData.paymentMethod) {
        payment = await Payment.create({
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          gatewayId: paymentData.gatewayId || null,
          paymentReference: paymentData.reference || `MANUAL-${Date.now()}`,
          amount: paymentData.amount || invoice.totalAmount,
          paymentMethod: paymentData.paymentMethod || 'cash',
          status: 'completed',
          paymentDate: paymentData.paymentDate || new Date(),
          paymentData: JSON.stringify({
            ...paymentData,
            markedAsPaidAt: new Date().toISOString(),
            markedBy: paymentData.userId || 'system'
          }),
          processedAt: new Date()
        }, { transaction });
      }

      await transaction.commit();

      // Intentar reactivar servicio del cliente
      try {
        const clientBillingService = require('./client.billing.service');
        await clientBillingService.reactivateClientAfterPayment(
          invoice.clientId,
          payment?.paymentReference || 'MANUAL-PAYMENT'
        );
      } catch (reactivationError) {
        logger.warn(`Error reactivando servicio: ${reactivationError.message}`);
      }

      logger.info(`Factura ${invoice.invoiceNumber} marcada como pagada exitosamente`);

      return {
        success: true,
        data: {
          invoice,
          payment
        },
        message: 'Factura marcada como pagada exitosamente'
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error marcando factura como pagada: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancela una factura
   * @param {number} invoiceId - ID de la factura
   * @param {string} reason - Razón de cancelación
   * @param {string} userId - Usuario que cancela
   * @returns {Promise<Object>} Resultado
   */
  async cancelInvoice(invoiceId, reason = 'Cancelación manual', userId = 'system') {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Cancelando factura ${invoiceId}`);

      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      
      if (!invoice) {
        await transaction.rollback();
        throw new Error(`Factura ${invoiceId} no encontrada`);
      }

      if (invoice.status === 'paid') {
        await transaction.rollback();
        return {
          success: false,
          message: 'No se puede cancelar una factura pagada'
        };
      }

      if (invoice.status === 'cancelled') {
        await transaction.rollback();
        return {
          success: false,
          message: 'La factura ya está cancelada'
        };
      }

      // Actualizar estado y datos de cancelación
      const currentData = invoice.invoiceData || {};
      await invoice.update({
        status: 'cancelled',
        invoiceData: {
          ...currentData,
          cancellation: {
            reason,
            cancelledAt: new Date().toISOString(),
            cancelledBy: userId
          }
        }
      }, { transaction });

      await transaction.commit();

      logger.info(`Factura ${invoice.invoiceNumber} cancelada exitosamente`);

      return {
        success: true,
        data: invoice,
        message: 'Factura cancelada exitosamente'
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error cancelando factura: ${error.message}`);
      throw error;
    }
  }

  /**
   * Duplica una factura
   * @param {number} invoiceId - ID de la factura a duplicar
   * @param {Object} modifications - Modificaciones a aplicar
   * @returns {Promise<Object>} Nueva factura
   */
  async duplicateInvoice(invoiceId, modifications = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Duplicando factura ${invoiceId}`);

      const originalInvoice = await Invoice.findByPk(invoiceId, { transaction });
      
      if (!originalInvoice) {
        await transaction.rollback();
        throw new Error(`Factura ${invoiceId} no encontrada`);
      }

      // Generar nuevo número de factura
      const newInvoiceNumber = await this._generateInvoiceNumber(transaction);

      // Calcular nuevas fechas si no se especifican
      const today = new Date();
      const newBillingStart = modifications.billingPeriodStart || 
        moment(originalInvoice.billingPeriodStart).add(1, 'month').toDate();
      const newBillingEnd = modifications.billingPeriodEnd || 
        moment(originalInvoice.billingPeriodEnd).add(1, 'month').toDate();
      const newDueDate = modifications.dueDate || 
        moment(newBillingEnd).add(15, 'days').toDate();

      // Crear nueva factura
      const duplicatedInvoice = await Invoice.create({
        clientId: modifications.clientId || originalInvoice.clientId,
        subscriptionId: modifications.subscriptionId || originalInvoice.subscriptionId,
        invoiceNumber: newInvoiceNumber,
        billingPeriodStart: newBillingStart,
        billingPeriodEnd: newBillingEnd,
        amount: modifications.amount || originalInvoice.amount,
        taxAmount: modifications.taxAmount || originalInvoice.taxAmount,
        totalAmount: modifications.totalAmount || originalInvoice.totalAmount,
        dueDate: newDueDate,
        status: 'pending',
        invoiceData: {
          ...originalInvoice.invoiceData,
          duplicatedFrom: {
            originalInvoiceId: originalInvoice.id,
            originalInvoiceNumber: originalInvoice.invoiceNumber,
            duplicatedAt: new Date().toISOString(),
            duplicatedBy: modifications.userId || 'system'
          },
          modifications: modifications
        }
      }, { transaction });

      await transaction.commit();

      logger.info(`Factura ${newInvoiceNumber} duplicada exitosamente de ${originalInvoice.invoiceNumber}`);

      return {
        success: true,
        data: {
          originalInvoice,
          duplicatedInvoice
        },
        message: `Factura duplicada exitosamente como ${newInvoiceNumber}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error duplicando factura: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa facturas vencidas
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processOverdueInvoices(options = {}) {
    try {
      const { dryRun = false, graceDays = 5 } = options;
      
      logger.info(`Procesando facturas vencidas (dryRun: ${dryRun})`);

      const cutoffDate = moment().subtract(graceDays, 'days').toDate();

      // Obtener facturas vencidas
      const overdueInvoices = await Invoice.findAll({
        where: {
          status: 'pending',
          dueDate: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        },
        include: [
          {
            model: Client,
            where: { active: true }
          }
        ]
      });

      let processedCount = 0;
      const results = [];

      for (const invoice of overdueInvoices) {
        try {
          const daysOverdue = Math.ceil(
            (new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
          );

          if (!dryRun) {
            // Marcar como vencida
            await invoice.update({
              status: 'overdue'
            });

            // Programar recordatorio si no existe uno reciente
            const recentReminder = await PaymentReminder.findOne({
              where: {
                clientId: invoice.clientId,
                invoiceId: invoice.id,
                createdAt: {
                  [db.Sequelize.Op.gte]: moment().subtract(24, 'hours').toDate()
                }
              }
            });

            if (!recentReminder) {
              await PaymentReminder.create({
                clientId: invoice.clientId,
                invoiceId: invoice.id,
                reminderType: daysOverdue > 15 ? 'sms' : 'email',
                status: 'pending',
                daysOverdue,
                messageSent: `Factura vencida - ${daysOverdue} días de atraso`
              });
            }
          }

          processedCount++;
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            clientName: `${invoice.Client.firstName} ${invoice.Client.lastName}`,
            daysOverdue,
            amount: invoice.totalAmount,
            action: dryRun ? 'would_process' : 'processed'
          });

        } catch (itemError) {
          logger.error(`Error procesando factura ${invoice.id}: ${itemError.message}`);
          results.push({
            invoiceId: invoice.id,
            action: 'error',
            error: itemError.message
          });
        }
      }

      return {
        success: true,
        data: {
          totalFound: overdueInvoices.length,
          processed: processedCount,
          dryRun,
          results
        },
        message: dryRun ? 
          `${processedCount} facturas serían procesadas` :
          `${processedCount} facturas vencidas procesadas`
      };

    } catch (error) {
      logger.error(`Error procesando facturas vencidas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de facturación
   * @param {Object} filters - Filtros para las estadísticas
   * @returns {Promise<Object>} Estadísticas
   */
  async getInvoiceStatistics(filters = {}) {
    try {
      const { startDate, endDate, clientId, status } = filters;
      
      const whereClause = {};
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      if (clientId) whereClause.clientId = clientId;
      if (status) whereClause.status = status;

      // Consultas en paralelo
      const [
        invoices,
        totalCount,
        paidCount,
        pendingCount,
        overdueCount,
        cancelledCount
      ] = await Promise.all([
        Invoice.findAll({
          where: whereClause,
          attributes: ['amount', 'taxAmount', 'totalAmount', 'status', 'createdAt', 'dueDate']
        }),
        Invoice.count({ where: whereClause }),
        Invoice.count({ where: { ...whereClause, status: 'paid' } }),
        Invoice.count({ where: { ...whereClause, status: 'pending' } }),
        Invoice.count({ where: { ...whereClause, status: 'overdue' } }),
        Invoice.count({ where: { ...whereClause, status: 'cancelled' } })
      ]);

      // Calcular montos
      const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const paidAmount = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const pendingAmount = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const overdueAmount = invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      // Estadísticas por mes (últimos 12 meses)
      const monthlyStats = {};
      for (let i = 11; i >= 0; i--) {
        const month = moment().subtract(i, 'months').format('YYYY-MM');
        monthlyStats[month] = {
          invoices: 0,
          amount: 0,
          paid: 0,
          pending: 0
        };
      }

      invoices.forEach(invoice => {
        const month = moment(invoice.createdAt).format('YYYY-MM');
        if (monthlyStats[month]) {
          monthlyStats[month].invoices++;
          monthlyStats[month].amount += parseFloat(invoice.totalAmount);
          
          if (invoice.status === 'paid') {
            monthlyStats[month].paid += parseFloat(invoice.totalAmount);
          } else if (invoice.status === 'pending') {
            monthlyStats[month].pending += parseFloat(invoice.totalAmount);
          }
        }
      });

      return {
        success: true,
        data: {
          summary: {
            totalInvoices: totalCount,
            totalAmount: totalAmount.toFixed(2),
            paidInvoices: paidCount,
            paidAmount: paidAmount.toFixed(2),
            pendingInvoices: pendingCount,
            pendingAmount: pendingAmount.toFixed(2),
            overdueInvoices: overdueCount,
            overdueAmount: overdueAmount.toFixed(2),
            cancelledInvoices: cancelledCount,
            collectionRate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : '0.00',
            averageInvoiceAmount: totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0.00'
          },
          monthlyStats,
          period: {
            startDate: startDate || 'N/A',
            endDate: endDate || 'N/A'
          }
        },
        message: 'Estadísticas obtenidas exitosamente'
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas de facturas: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Genera un número de factura único
   * @private
   */
  async _generateInvoiceNumber(transaction = null) {
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
      order: [['invoiceNumber', 'DESC']],
      transaction
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.substring(6)) || 0;
      sequence = lastSequence + 1;
    }

    return `${year}${month}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Calcula los montos de una factura
   * @private
   */
  async _calculateInvoiceAmounts(data) {
    const { client, subscription, serviceItems, customItems, discounts, taxes } = data;
    
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // Calcular servicios desde suscripción si existe
    if (subscription && subscription.monthlyFee) {
      subtotal += parseFloat(subscription.monthlyFee);
    } else if (client.ClientBilling && client.ClientBilling.ServicePackage) {
      // Fallback a ClientBilling
      subtotal += parseFloat(client.ClientBilling.monthlyFee || client.ClientBilling.ServicePackage.price);
    }

    // Agregar items de servicio adicionales
    serviceItems.forEach(item => {
      subtotal += parseFloat(item.amount || 0);
    });

    // Agregar items personalizados
    customItems.forEach(item => {
      subtotal += parseFloat(item.amount || 0);
    });

    // Aplicar descuentos
    discounts.forEach(discount => {
      if (discount.type === 'percentage') {
        totalDiscount += subtotal * (parseFloat(discount.value) / 100);
      } else {
        totalDiscount += parseFloat(discount.value || 0);
      }
    });

    const subtotalAfterDiscount = subtotal - totalDiscount;

    // Calcular impuestos
    taxes.forEach(tax => {
      if (tax.type === 'percentage') {
        totalTax += subtotalAfterDiscount * (parseFloat(tax.value) / 100);
      } else {
        totalTax += parseFloat(tax.value || 0);
      }
    });

    const total = subtotalAfterDiscount + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      subtotalAfterDiscount: subtotalAfterDiscount.toFixed(2),
      totalTax: totalTax.toFixed(2),
      total: total.toFixed(2)
    };
  }

  /**
   * Calcula la fecha de vencimiento
   * @private
   */
  _calculateDueDate(billingEnd, clientBilling) {
    const graceDays = clientBilling?.graceDays || 15;
    return moment(billingEnd).add(graceDays, 'days').toDate();
  }

  /**
   * Agrega header de la empresa al PDF
   * @private
   */
  async _addCompanyHeader(doc, regularFont, boldFont) {
    doc.fontSize(20)
       .font(boldFont)
       .text('SISTEMA ISP', 50, 50)
       .fontSize(10)
       .font(regularFont)
       .text('Proveedor de Servicios de Internet', 50, 75)
       .text('RFC: ISP123456789', 50, 90)
       .text('Teléfono: (33) 1234-5678', 50, 105)
       .text('Email: contacto@sistemaisp.com', 50, 120);
  }

  /**
   * Agrega información de la factura al PDF
   * @private
   */
  async _addInvoiceInfo(doc, invoice, regularFont, boldFont) {
    doc.fontSize(16)
       .font(boldFont)
       .text('FACTURA', 400, 50)
       .fontSize(10)
       .font(regularFont)
       .text(`Número: ${invoice.invoiceNumber}`, 400, 75)
       .text(`Fecha: ${moment(invoice.createdAt).format('DD/MM/YYYY')}`, 400, 90)
       .text(`Vencimiento: ${moment(invoice.dueDate).format('DD/MM/YYYY')}`, 400, 105)
       .text(`Estado: ${invoice.status.toUpperCase()}`, 400, 120);
  }

  /**
   * Agrega información del cliente al PDF
   * @private
   */
  async _addClientInfo(doc, client, regularFont, boldFont) {
    doc.fontSize(12)
       .font(boldFont)
       .text('FACTURAR A:', 50, 160)
       .fontSize(10)
       .font(regularFont)
       .text(`${client.firstName} ${client.lastName}`, 50, 180)
       .text(`Email: ${client.email}`, 50, 195)
       .text(`Teléfono: ${client.phone}`, 50, 210);
    
    if (client.address) {
      doc.text(`Dirección: ${client.address}`, 50, 225);
    }
  }

  /**
   * Agrega detalles de la factura al PDF
   * @private
   */
  async _addInvoiceDetails(doc, invoice, regularFont, boldFont) {
    let yPosition = 280;
    
    // Headers de tabla
    doc.fontSize(10)
       .font(boldFont)
       .text('DESCRIPCIÓN', 50, yPosition)
       .text('CANTIDAD', 300, yPosition)
       .text('PRECIO', 400, yPosition)
       .text('TOTAL', 500, yPosition);
    
    yPosition += 20;
    
    // Línea separadora
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();
    
    yPosition += 10;
    
    // Items de la factura
    const invoiceData = invoice.invoiceData || {};
    const items = invoiceData.items || {};
    
    // Servicios
    if (items.services && items.services.length > 0) {
      items.services.forEach(item => {
        doc.fontSize(9)
           .font(regularFont)
           .text(item.description || 'Servicio de Internet', 50, yPosition)
           .text('1', 300, yPosition)
           .text(`${parseFloat(item.amount || 0).toFixed(2)}`, 400, yPosition)
           .text(`${parseFloat(item.amount || 0).toFixed(2)}`, 500, yPosition);
        yPosition += 15;
      });
    } else {
      // Servicio básico desde subscription o billing
      const serviceName = invoiceData.subscription?.packageName || 
                          invoiceData.billing?.servicePackage || 
                          'Servicio de Internet Mensual';
      const serviceAmount = invoiceData.subscription?.monthlyFee || 
                           parseFloat(invoice.amount);
      
      doc.fontSize(9)
         .font(regularFont)
         .text(serviceName, 50, yPosition)
         .text('1', 300, yPosition)
         .text(`${serviceAmount.toFixed(2)}`, 400, yPosition)
         .text(`${serviceAmount.toFixed(2)}`, 500, yPosition);
      yPosition += 15;
    }
    
    // Items personalizados
    if (items.custom && items.custom.length > 0) {
      items.custom.forEach(item => {
        doc.text(item.description, 50, yPosition)
           .text(item.quantity || '1', 300, yPosition)
           .text(`${parseFloat(item.price || 0).toFixed(2)}`, 400, yPosition)
           .text(`${parseFloat(item.amount || 0).toFixed(2)}`, 500, yPosition);
        yPosition += 15;
      });
    }

    // Descuentos si existen
    if (items.discounts && items.discounts.length > 0) {
      items.discounts.forEach(discount => {
        const discountAmount = discount.type === 'percentage' ? 
          `${discount.value}%` : 
          parseFloat(discount.value || 0).toFixed(2);
        
        doc.fontSize(9)
           .font(regularFont)
           .text(`Descuento: ${discount.description || 'Descuento aplicado'}`, 50, yPosition)
           .text('1', 300, yPosition)
           .text(`-${discountAmount}`, 400, yPosition)
           .text(`-${parseFloat(discount.calculatedAmount || 0).toFixed(2)}`, 500, yPosition);
        yPosition += 15;
      });
    }
  }

  /**
   * Agrega totales al PDF
   * @private
   */
  async _addInvoiceTotals(doc, invoice, regularFont, boldFont) {
    let yPosition = doc.y + 30;
    
    // Línea separadora
    doc.moveTo(350, yPosition)
       .lineTo(550, yPosition)
       .stroke();
    
    yPosition += 15;
    
    // Subtotal
    doc.fontSize(10)
       .font(regularFont)
       .text('Subtotal:', 400, yPosition)
       .text(`${parseFloat(invoice.amount).toFixed(2)}`, 500, yPosition);
    
    yPosition += 15;
    
    // Impuestos
    if (parseFloat(invoice.taxAmount) > 0) {
      doc.text('Impuestos:', 400, yPosition)
         .text(`${parseFloat(invoice.taxAmount).toFixed(2)}`, 500, yPosition);
      yPosition += 15;
    }
    
    // Total
    doc.fontSize(12)
       .font(boldFont)
       .text('TOTAL:', 400, yPosition)
       .text(`${parseFloat(invoice.totalAmount).toFixed(2)}`, 500, yPosition);
  }

  /**
   * Agrega footer al PDF
   * @private
   */
  async _addInvoiceFooter(doc, invoice, regularFont, boldFont) {
    const yPosition = 700;
    
    doc.fontSize(8)
       .font(regularFont)
       .text('Gracias por su preferencia. Para cualquier aclaración, contacte a soporte técnico.', 50, yPosition)
       .text(`Factura generada el ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 50, yPosition + 15);
    
    // Código QR placeholder (se puede implementar con una librería de QR)
    doc.text('Código de factura para verificación: ' + invoice.invoiceNumber, 50, yPosition + 30);
  }
}

module.exports = new InvoiceService();