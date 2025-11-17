// backend/src/controllers/invoice.controller.js
const db = require('../models');
const logger = require('../utils/logger');
const invoiceService = require('../services/invoice.service');
const clientBillingService = require('../services/client.billing.service');

// Modelos necesarios
const Invoice = db.Invoice;
const Client = db.Client;
const Subscription = db.Subscription;
const ServicePackage = db.ServicePackage;
const Payment = db.Payment;
const PaymentReminder = db.PaymentReminder;

/**
 * Obtener todas las facturas con filtros y paginación
 * GET /api/invoices
 */
exports.getAllInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      clientId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    const clientWhereClause = {};

    // Filtros
    if (status) {
      whereClause.status = status;
    }

    if (clientId) {
      whereClause.clientId = parseInt(clientId);
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (search) {
      const searchClause = {
        [db.Sequelize.Op.or]: [
          { invoiceNumber: { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { '$Client.firstName$': { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { '$Client.lastName$': { [db.Sequelize.Op.iLike]: `%${search}%` } }
        ]
      };
      Object.assign(whereClause, searchClause);
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          where: Object.keys(clientWhereClause).length > 0 ? clientWhereClause : undefined
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage, as: 'ServicePackage',
              attributes: ['id', 'name', 'price']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    // Calcular estadísticas rápidas
    const stats = {
      total: count,
      pending: await Invoice.count({ where: { status: 'pending' } }),
      paid: await Invoice.count({ where: { status: 'paid' } }),
      overdue: await Invoice.count({ where: { status: 'overdue' } }),
      cancelled: await Invoice.count({ where: { status: 'cancelled' } })
    };

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        stats
      },
      message: `${count} factura(s) encontrada(s)`
    });

  } catch (error) {
    logger.error(`Error obteniendo facturas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener facturas'
    });
  }
};

/**
 * Obtener factura por ID
 * GET /api/invoices/:id
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id), {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage, as: 'ServicePackage',
              attributes: ['id', 'name', 'price', 'downloadSpeedMbps', 'uploadSpeedMbps']
            }
          ]
        },
        {
          model: Payment,
          attributes: ['id', 'amount', 'paymentMethod', 'status', 'paymentDate', 'paymentReference']
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Calcular días vencidos si aplica
    let daysOverdue = 0;
    if (invoice.status === 'overdue' || (invoice.status === 'pending' && new Date() > new Date(invoice.dueDate))) {
      const diffTime = Math.abs(new Date() - new Date(invoice.dueDate));
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Agregar información calculada
    const invoiceData = invoice.toJSON();
    invoiceData.daysOverdue = daysOverdue;
    invoiceData.isPastDue = new Date() > new Date(invoice.dueDate) && invoice.status !== 'paid';

    return res.status(200).json({
      success: true,
      data: invoiceData,
      message: 'Factura obtenida exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nueva factura
 * POST /api/invoices
 */
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientId,
      subscriptionId,
      amount,
      taxAmount = 0,
      dueDate,
      description,
      billingPeriodStart,
      billingPeriodEnd,
      customData = {}
    } = req.body;

    // Validaciones básicas
    if (!clientId || !subscriptionId || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'clientId, subscriptionId, amount y dueDate son requeridos'
      });
    }

    // Verificar que cliente y suscripción existan
    const [client, subscription] = await Promise.all([
      Client.findByPk(clientId),
      Subscription.findByPk(subscriptionId, {
        include: [{ model: ServicePackage }]
      })
    ]);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    // Generar número de factura usando el servicio
    const invoiceNumber = await invoiceService.generateInvoiceNumber();

    // Calcular monto total
    const totalAmount = parseFloat(amount) + parseFloat(taxAmount);

    // Crear factura
    const invoice = await Invoice.create({
      clientId: parseInt(clientId),
      subscriptionId: parseInt(subscriptionId),
      invoiceNumber,
      billingPeriodStart: billingPeriodStart || new Date(),
      billingPeriodEnd: billingPeriodEnd || new Date(),
      amount: parseFloat(amount),
      taxAmount: parseFloat(taxAmount),
      totalAmount,
      dueDate: new Date(dueDate),
      status: 'pending',
      invoiceData: {
        client: {
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
          phone: client.phone,
          address: client.address
        },
        service: {
          packageName: subscription.ServicePackage?.name,
          price: subscription.ServicePackage?.price
        },
        description: description || `Servicio de Internet - ${subscription.ServicePackage?.name}`,
        customData,
        generatedAt: new Date().toISOString()
      }
    });

    // Cargar factura con relaciones para respuesta
    const invoiceWithRelations = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [{ model: ServicePackage, as: 'ServicePackage',attributes: ['name', 'price'] }]
        }
      ]
    });

    logger.info(`Factura ${invoiceNumber} creada para cliente ${clientId}`);

    return res.status(201).json({
      success: true,
      data: invoiceWithRelations,
      message: `Factura ${invoiceNumber} creada exitosamente`
    });

  } catch (error) {
    logger.error(`Error creando factura: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear factura'
    });
  }
};

/**
 * Actualizar factura
 * PUT /api/invoices/:id
 */
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      taxAmount,
      dueDate,
      status,
      description,
      invoiceData
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id));

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Validar que no se actualice una factura pagada
    if (invoice.status === 'paid' && status && status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar el estado de una factura pagada'
      });
    }

    // Preparar datos para actualización
    const updateData = {};

    if (amount !== undefined) {
      updateData.amount = parseFloat(amount);
      updateData.totalAmount = parseFloat(amount) + parseFloat(taxAmount || invoice.taxAmount);
    }

    if (taxAmount !== undefined) {
      updateData.taxAmount = parseFloat(taxAmount);
      updateData.totalAmount = parseFloat(amount || invoice.amount) + parseFloat(taxAmount);
    }

    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) updateData.status = status;

    if (invoiceData) {
      updateData.invoiceData = {
        ...invoice.invoiceData,
        ...invoiceData,
        lastModified: new Date().toISOString()
      };
    }

    // Actualizar factura
    await invoice.update(updateData);

    // Si se marcó como vencida, verificar recordatorios
    if (status === 'overdue') {
      try {
        await this._schedulePaymentReminders(invoice.clientId, invoice.id);
      } catch (reminderError) {
        logger.warn(`Error programando recordatorios para factura ${id}: ${reminderError.message}`);
      }
    }

    logger.info(`Factura ${id} actualizada`);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Factura actualizada exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// backend/src/controllers/invoice.controller.js

/**
 * Marcar factura como pagada
 * POST /api/invoices/:id/mark-paid
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    // Datos que vienen del frontend (InvoiceDetail.vue / InvoiceList.vue)
    const {
      paymentReference,
      paymentMethod = 'manual',
      notes,
      gatewayId = 1, // Usar un ID de gateway por defecto si no se provee
      amount,
      paymentDate
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id));

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está marcada como pagada'
      });
    }

    // Iniciar transacción para asegurar consistencia
    const transaction = await db.sequelize.transaction();

    try {
      // 1. Actualizar el estado de la factura
      await invoice.update({
        status: 'paid'
      }, { transaction });

      // 2. Crear el registro de pago correspondiente
      const payment = await Payment.create({
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        gatewayId: parseInt(gatewayId),
        amount: amount ? parseFloat(amount) : invoice.totalAmount, // Usar monto del body o el total de la factura
        paymentMethod: paymentMethod,
        paymentReference: paymentReference || `MANUAL-PAY-${Date.now()}`,
        status: 'completed', // El pago es exitoso
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentData: JSON.stringify({ // Guardar metadatos útiles
          type: 'manual_confirmation',
          notes: notes || 'Pago registrado manualmente desde UI',
          processedBy: req.user?.id || 'system',
          processedAt: new Date().toISOString()
        })
      }, { transaction });

      // Confirmar la transacción si todo salió bien
      await transaction.commit();

      // 3. (Opcional) Intentar reactivar el servicio del cliente
      try {
        await clientBillingService.reactivateClientAfterPayment(
          invoice.clientId,
          payment.paymentReference
        );
        logger.info(`Servicio reactivado automáticamente para cliente ${invoice.clientId}`);
      } catch (reactivationError) {
        logger.warn(`Error reactivando servicio para cliente ${invoice.clientId}: ${reactivationError.message}`);
      }

      logger.info(`Factura ${id} marcada como pagada exitosamente`);

      return res.status(200).json({
        success: true,
        data: {
          invoice,
          payment
        },
        message: 'Factura marcada como pagada exitosamente'
      });

    } catch (error) {
      // Si algo falla, revertir todos los cambios
      await transaction.rollback();
      throw error; // Propagar el error para que lo capture el catch principal
    }

  } catch (error) {
    logger.error(`Error marcando factura como pagada ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};



/**
 * Generar PDF de factura
 * GET /api/invoices/:id/pdf
 */
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id), {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage, as: 'ServicePackage',
              attributes: ['name', 'price', 'downloadSpeedMbps', 'uploadSpeedMbps']
            }
          ]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Generar PDF usando el servicio
    const pdfBuffer = await invoiceService.generateInvoicePDF(invoice);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Error generando PDF de factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generando PDF de la factura'
    });
  }
};


// backend/src/controllers/invoice.controller.js

/**
 * Cancelar factura
 * POST /api/invoices/:id/cancel
 */
exports.cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id));

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una factura pagada'
      });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está cancelada'
      });
    }

    // Iniciar transacción para asegurar consistencia
    const transaction = await db.sequelize.transaction();

    try {
      // 1. Actualizar el estado de la factura a 'cancelled'
      const invoiceUpdateData = {
        status: 'cancelled',
        invoiceData: {
          ...invoice.invoiceData,
          cancellation: {
            reason: reason || 'Cancelada por administrador',
            cancelledAt: new Date().toISOString(),
            cancelledBy: req.user?.id || 'system'
          }
        }
      };
      await invoice.update(invoiceUpdateData, { transaction });

      // 2. Crear un registro de "pago nulo" para auditoría
      const cancellationPayment = await Payment.create({
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        gatewayId: null, // No hay pasarela
        amount: 0.00, // El monto es CERO
        paymentMethod: 'other', // Método especial para registros internos
        paymentReference: `CANCEL-${invoice.invoiceNumber}`,
        status: 'cancelled', // El estado del pago es 'cancelado'
        paymentDate: new Date(),
        paymentData: JSON.stringify({
          type: 'cancellation_record',
          notes: `Anulación de factura: ${reason || 'N/A'}`,
          processedBy: req.user?.id || 'system'
        })
      }, { transaction });

      // Confirmar la transacción
      await transaction.commit();

      logger.info(`Factura ${id} cancelada y registro de anulación creado. Razón: ${reason}`);

      return res.status(200).json({
        success: true,
        data: {
            invoice,
            cancellationPayment
        },
        message: 'Factura cancelada exitosamente'
      });

    } catch (error) {
        // Si algo falla, revertir todos los cambios
        await transaction.rollback();
        throw error;
    }

  } catch (error) {
    logger.error(`Error cancelando factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};


/**
 * Obtener estadísticas de facturación
 * GET /api/invoices/statistics
 */
exports.getInvoiceStatistics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    } else {
      // Filtros por período predefinido
      const now = new Date();
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { [db.Sequelize.Op.gte]: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateFilter.createdAt = { [db.Sequelize.Op.gte]: monthAgo };
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          dateFilter.createdAt = { [db.Sequelize.Op.gte]: yearAgo };
          break;
      }
    }

    // Obtener estadísticas
    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalAmount,
      paidAmount
    ] = await Promise.all([
      Invoice.count({ where: dateFilter }),
      Invoice.count({ where: { ...dateFilter, status: 'paid' } }),
      Invoice.count({ where: { ...dateFilter, status: 'pending' } }),
      Invoice.count({ where: { ...dateFilter, status: 'overdue' } }),
      Invoice.count({ where: { ...dateFilter, status: 'cancelled' } }),
      Invoice.sum('totalAmount', { where: dateFilter }) || 0,
      Invoice.sum('totalAmount', { where: { ...dateFilter, status: 'paid' } }) || 0
    ]);

    // Calcular métricas
    const collectionRate = totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : 0;
    const pendingAmount = totalAmount - paidAmount;

    // Top 10 clientes por facturación
    const topClients = await Invoice.findAll({
      attributes: [
        'clientId',
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'totalBilled'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('Invoice.id')), 'invoiceCount']
      ],
      include: [
        {
          model: Client,
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      where: dateFilter,
      group: ['Invoice.clientId', 'Client.id'],
      order: [[db.Sequelize.col('totalBilled'), 'DESC']],
      limit: 10
    });

    return res.status(200).json({
      success: true,
      data: {
        period: {
          type: period,
          startDate: startDate || 'auto',
          endDate: endDate || 'now'
        },
        summary: {
          totalInvoices,
          totalAmount: parseFloat(totalAmount).toFixed(2),
          paidAmount: parseFloat(paidAmount).toFixed(2),
          pendingAmount: parseFloat(pendingAmount).toFixed(2),
          collectionRate: parseFloat(collectionRate)
        },
        byStatus: {
          paid: paidInvoices,
          pending: pendingInvoices,
          overdue: overdueInvoices,
          cancelled: cancelledInvoices
        },
        topClients: topClients.map(client => ({
          clientId: client.clientId,
          clientName: `${client.Client.firstName} ${client.Client.lastName}`,
          totalBilled: parseFloat(client.dataValues.totalBilled).toFixed(2),
          invoiceCount: parseInt(client.dataValues.invoiceCount)
        }))
      },
      message: 'Estadísticas obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de facturación: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Buscar facturas vencidas
 * GET /api/invoices/overdue
 */
exports.getOverdueInvoices = async (req, res) => {
  try {
    const { days = 30, limit = 50 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const overdueInvoices = await Invoice.findAll({
      where: {
        status: ['pending', 'overdue'],
        dueDate: {
          [db.Sequelize.Op.lt]: new Date()
        }
      },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage, as: 'ServicePackage',
              attributes: ['name', 'price']
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: parseInt(limit)
    });

    // Calcular días vencidos para cada factura
    const invoicesWithDays = overdueInvoices.map(invoice => {
      const diffTime = Math.abs(new Date() - new Date(invoice.dueDate));
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...invoice.toJSON(),
        daysOverdue,
        urgencyLevel: daysOverdue > 30 ? 'critical' : daysOverdue > 15 ? 'high' : 'medium'
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        invoices: invoicesWithDays,
        totalOverdue: overdueInvoices.length,
        summary: {
          critical: invoicesWithDays.filter(inv => inv.urgencyLevel === 'critical').length,
          high: invoicesWithDays.filter(inv => inv.urgencyLevel === 'high').length,
          medium: invoicesWithDays.filter(inv => inv.urgencyLevel === 'medium').length
        }
      },
      message: `${overdueInvoices.length} factura(s) vencida(s) encontrada(s)`
    });

  } catch (error) {
    logger.error(`Error obteniendo facturas vencidas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Procesar facturas vencidas (marcar como overdue y enviar recordatorios)
 * POST /api/invoices/process-overdue
 */
exports.processOverdueInvoices = async (req, res) => {
  try {
    const { dryRun = false, sendReminders = true } = req.body;

    // Buscar facturas pendientes que ya vencieron
    const today = new Date();
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: 'pending',
        dueDate: {
          [db.Sequelize.Op.lt]: today
        }
      },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    let processed = 0;
    const results = [];

    if (!dryRun) {
      for (const invoice of overdueInvoices) {
        try {
          // Marcar como vencida
          await invoice.update({ status: 'overdue' });

          // Programar recordatorios si está habilitado
          if (sendReminders) {
            await this._schedulePaymentReminders(invoice.clientId, invoice.id);
          }

          processed++;
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientName: `${invoice.Client.firstName} ${invoice.Client.lastName}`,
            amount: invoice.totalAmount,
            daysOverdue: Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
            action: 'marked_overdue',
            reminderScheduled: sendReminders
          });

        } catch (error) {
          logger.error(`Error procesando factura vencida ${invoice.id}: ${error.message}`);
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
            action: 'failed'
          });
        }
      }
    } else {
      // Modo dry-run: solo simular
      overdueInvoices.forEach(invoice => {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: `${invoice.Client.firstName} ${invoice.Client.lastName}`,
          amount: invoice.totalAmount,
          daysOverdue: Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
          action: 'would_mark_overdue',
          reminderScheduled: sendReminders
        });
      });
    }

    logger.info(`Procesamiento de facturas vencidas completado: ${processed} procesadas de ${overdueInvoices.length} encontradas`);

    return res.status(200).json({
      success: true,
      data: {
        totalFound: overdueInvoices.length,
        processed,
        dryRun,
        results
      },
              message: dryRun 
        ? `${overdueInvoices.length} facturas vencidas encontradas (simulación)`
        : `${processed} facturas procesadas como vencidas`
    });

  } catch (error) {
    logger.error(`Error procesando facturas vencidas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Duplicar factura (crear copia)
 * POST /api/invoices/:id/duplicate
 */
exports.duplicateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustDueDate = true, newDueDate } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const originalInvoice = await Invoice.findByPk(parseInt(id), {
      include: [
        { model: Client },
        { model: Subscription, as: 'subscription', include: [{ model: ServicePackage }] }
      ]
    });

    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura original no encontrada'
      });
    }

    // Generar nuevo número de factura
    const newInvoiceNumber = await invoiceService.generateInvoiceNumber();

    // Calcular nueva fecha de vencimiento
    let calculatedDueDate;
    if (newDueDate) {
      calculatedDueDate = new Date(newDueDate);
    } else if (adjustDueDate) {
      calculatedDueDate = new Date();
      calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 1);
    } else {
      calculatedDueDate = originalInvoice.dueDate;
    }

    // Crear factura duplicada
    const duplicatedInvoice = await Invoice.create({
      clientId: originalInvoice.clientId,
      subscriptionId: originalInvoice.subscriptionId,
      invoiceNumber: newInvoiceNumber,
      billingPeriodStart: new Date(),
      billingPeriodEnd: calculatedDueDate,
      amount: originalInvoice.amount,
      taxAmount: originalInvoice.taxAmount,
      totalAmount: originalInvoice.totalAmount,
      dueDate: calculatedDueDate,
      status: 'pending',
      invoiceData: {
        ...originalInvoice.invoiceData,
        duplicatedFrom: originalInvoice.invoiceNumber,
        duplicatedAt: new Date().toISOString()
      }
    });

    // Cargar factura con relaciones
    const duplicatedWithRelations = await Invoice.findByPk(duplicatedInvoice.id, {
      include: [
        { model: Client, attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Subscription, as: 'subscription', include: [{ model: ServicePackage }] }
      ]
    });

    logger.info(`Factura ${originalInvoice.invoiceNumber} duplicada como ${newInvoiceNumber}`);

    return res.status(201).json({
      success: true,
      data: duplicatedWithRelations,
      message: `Factura duplicada exitosamente como ${newInvoiceNumber}`
    });

  } catch (error) {
    logger.error(`Error duplicando factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar factura
 * DELETE /api/invoices/:id
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const invoice = await Invoice.findByPk(parseInt(id), {
      include: [{ model: Payment }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Verificar si la factura tiene pagos asociados
    if (invoice.Payments && invoice.Payments.length > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una factura con pagos asociados. Use force=true para forzar la eliminación.'
      });
    }

    // Verificar si la factura está pagada
    if (invoice.status === 'paid' && !force) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una factura pagada. Use force=true para forzar la eliminación.'
      });
    }

    const transaction = await db.sequelize.transaction();

    try {
      // Eliminar pagos asociados si force=true
      if (force && invoice.Payments && invoice.Payments.length > 0) {
        await Payment.destroy({
          where: { invoiceId: invoice.id },
          transaction
        });
      }

      // Eliminar recordatorios asociados
      await PaymentReminder.destroy({
        where: { invoiceId: invoice.id },
        transaction
      });

      // Eliminar factura
      await invoice.destroy({ transaction });

      await transaction.commit();

      logger.info(`Factura ${id} eliminada${force ? ' (forzado)' : ''}`);

      return res.status(200).json({
        success: true,
        message: 'Factura eliminada exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error(`Error eliminando factura ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener facturas de un cliente específico
 * GET /api/invoices/client/:clientId
 */
exports.getClientInvoices = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status, limit = 20, page = 1 } = req.query;

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    const whereClause = { clientId: parseInt(clientId) };
    if (status) {
      whereClause.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{ model: ServicePackage, as: 'ServicePackage', attributes: ['name', 'price'] }]
        },
        {
          model: Payment,
          attributes: ['id', 'amount', 'paymentMethod', 'status', 'paymentDate']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calcular totales para el cliente
    const totals = await Invoice.findOne({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'totalAmount'],
        [db.Sequelize.fn('SUM', 
          db.Sequelize.literal(`CASE WHEN status = 'paid' THEN "totalAmount" ELSE 0 END`)
        ), 'paidAmount'],
        [db.Sequelize.fn('SUM', 
          db.Sequelize.literal(`CASE WHEN status IN ('pending', 'overdue') THEN "totalAmount" ELSE 0 END`)
        ), 'pendingAmount']
      ],
      where: { clientId: parseInt(clientId) },
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        totals: {
          totalAmount: parseFloat(totals.totalAmount || 0).toFixed(2),
          paidAmount: parseFloat(totals.paidAmount || 0).toFixed(2),
          pendingAmount: parseFloat(totals.pendingAmount || 0).toFixed(2)
        }
      },
      message: `${count} factura(s) encontrada(s) para el cliente`
    });

  } catch (error) {
    logger.error(`Error obteniendo facturas del cliente ${req.params.clientId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== MÉTODOS PRIVADOS ====================

/**
 * Programa recordatorios de pago para una factura vencida
 * @private
 */
exports._schedulePaymentReminders = async (clientId, invoiceId) => {
  try {
    const client = await Client.findByPk(clientId);
    const invoice = await Invoice.findByPk(invoiceId);

    if (!client || !invoice) return;

    // Verificar si ya existen recordatorios pendientes
    const existingReminders = await PaymentReminder.count({
      where: {
        clientId,
        invoiceId,
        status: 'pending'
      }
    });

    if (existingReminders > 0) {
      logger.info(`Cliente ${clientId} ya tiene recordatorios pendientes para factura ${invoiceId}`);
      return;
    }

    // Calcular días vencidos
    const today = new Date();
    const daysOverdue = Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));

    const reminders = [];

    // Programar recordatorios según días de atraso
    if (daysOverdue >= 1 && daysOverdue <= 7) {
      reminders.push({
        clientId,
        invoiceId,
        reminderType: 'email',
        daysOverdue,
        status: 'pending',
        messageSent: `Recordatorio amigable de pago - Factura ${invoice.invoiceNumber}`
      });
    }

    if (daysOverdue >= 8 && daysOverdue <= 15) {
      reminders.push({
        clientId,
        invoiceId,
        reminderType: 'whatsapp',
        daysOverdue,
        status: 'pending',
        messageSent: `Recordatorio urgente - Su factura tiene ${daysOverdue} días de atraso`
      });
    }

    if (daysOverdue > 15) {
      reminders.push({
        clientId,
        invoiceId,
        reminderType: 'sms',
        daysOverdue,
        status: 'pending',
        messageSent: `AVISO FINAL - Su servicio será suspendido. ${daysOverdue} días de atraso`
      });
    }

    if (reminders.length > 0) {
      await PaymentReminder.bulkCreate(reminders);
      logger.info(`${reminders.length} recordatorio(s) programado(s) para cliente ${clientId}, factura ${invoiceId}`);
    }

  } catch (error) {
    logger.error(`Error programando recordatorios para cliente ${clientId}: ${error.message}`);
    throw error;
  }
};