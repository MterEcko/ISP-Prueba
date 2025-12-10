// backend/src/controllers/manual.payment.controller.js
const db = require('../models');
const logger = require('../utils/logger');
const clientBillingService = require('../services/client.billing.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Modelos necesarios
const Payment = db.Payment;
const PaymentGateway = db.PaymentGateway;
const Invoice = db.Invoice;
const Client = db.Client;
const User = db.User;

// Configuración de multer para comprobantes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/payment-receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}-${file.originalname}`);
  }
});

const uploadReceipt = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error("Solo se permiten archivos JPG, PNG y PDF"));
  }
}).single('receipt');

/**
 * Registrar pago manual por operador
 * POST /api/manual-payments
 */
exports.submitManualPayment = async (req, res) => {
  try {
    // Manejar upload de archivo
    uploadReceipt(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      const {
        invoiceId,
        clientId,
        amount,
        paymentMethod, // 'cash' o 'transfer'
        bankName,
        paymentDate,
        reference,
        notes
      } = req.body;

      // Validaciones básicas
      if (!invoiceId || !clientId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'invoiceId, clientId, amount y paymentMethod son requeridos'
        });
      }

      if (!['cash', 'transfer'].includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'paymentMethod debe ser "cash" o "transfer"'
        });
      }

      // Verificar que la factura existe
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [{ model: Client }]
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'La factura ya está pagada'
        });
      }

      // Verificar que el cliente existe y coincide
      if (invoice.clientId !== parseInt(clientId)) {
        return res.status(400).json({
          success: false,
          message: 'El cliente no corresponde a la factura'
        });
      }

      // Obtener o crear gateway "Manual"
      let manualGateway = await PaymentGateway.findOne({
        where: { name: 'Manual' }
      });

      if (!manualGateway) {
        manualGateway = await PaymentGateway.create({
          name: 'Manual',
          gatewayType: 'cash',
          active: true,
          isDefault: false,
          configuration: {
            type: 'manual_validation',
            description: 'Pagos registrados manualmente por operadores'
          }
        });
      }

      // Generar referencia única
      const paymentReference = reference || 
        `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();

      // Preparar datos del pago
      const paymentData = {
        type: 'manual_payment',
        paymentMethod,
        bankName: paymentMethod === 'transfer' ? bankName : null,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        receiptFile: req.file ? {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size
        } : null,
        submittedBy: req.userId,
        submittedAt: new Date().toISOString(),
        notes: notes || '',
        clientInfo: {
          id: invoice.Client.id,
          name: `${invoice.Client.firstName} ${invoice.Client.lastName}`
        },
        invoiceInfo: {
          number: invoice.invoiceNumber,
          amount: invoice.totalAmount
        }
      };

      // Crear registro de pago en estado pendiente
      const payment = await Payment.create({
        invoiceId: parseInt(invoiceId),
        clientId: parseInt(clientId),
        gatewayId: manualGateway.id,
        paymentReference,
        amount: parseFloat(amount),
        paymentMethod,
        status: 'pending', // Pendiente de aprobación
        paymentDate: paymentDate || new Date(),
        paymentData: JSON.stringify(paymentData)
      });

      logger.info(`Pago manual registrado: ${paymentReference} por usuario ${req.userId}`);

      return res.status(201).json({
        success: true,
        data: {
          paymentId: payment.id,
          paymentReference,
          status: 'pending',
          clientName: `${invoice.Client.firstName} ${invoice.Client.lastName}`,
          invoiceNumber: invoice.invoiceNumber,
          amount: payment.amount,
          submittedAt: new Date().toISOString()
        },
        message: 'Pago manual registrado exitosamente. Pendiente de aprobación.'
      });
    });

  } catch (error) {
    logger.error(`Error registrando pago manual: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener pagos pendientes de aprobación
 * GET /api/manual-payments/pending
 */
exports.getPendingManualPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      clientId,
      paymentMethod,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {
      status: 'pending'
    };

    // Filtros adicionales
    if (clientId) whereClause.clientId = parseInt(clientId);
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Obtener gateway manual
    const manualGateway = await PaymentGateway.findOne({
      where: { name: 'Manual' }
    });

    if (manualGateway) {
      whereClause.gatewayId = manualGateway.id;
    }

    const { count, rows: pendingPayments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Invoice,
          attributes: ['id', 'invoiceNumber', 'totalAmount', 'dueDate']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'ASC']] // Más antiguos primero
    });

    // Enriquecer datos con información del pago manual
    const enrichedPayments = pendingPayments.map(payment => {
      let paymentData = {};
      try {
        paymentData = JSON.parse(payment.paymentData || '{}');
      } catch (e) {
        logger.warn(`Error parseando paymentData para pago ${payment.id}`);
      }

      return {
        id: payment.id,
        paymentReference: payment.paymentReference,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
        client: {
          id: payment.Client.id,
          name: `${payment.Client.firstName} ${payment.Client.lastName}`,
          email: payment.Client.email,
          phone: payment.Client.phone
        },
        invoice: {
          id: payment.Invoice.id,
          number: payment.Invoice.invoiceNumber,
          amount: payment.Invoice.totalAmount,
          dueDate: payment.Invoice.dueDate
        },
        manualPaymentData: {
          bankName: paymentData.bankName,
          notes: paymentData.notes,
          hasReceipt: !!paymentData.receiptFile,
          receiptFile: paymentData.receiptFile,
          submittedBy: paymentData.submittedBy,
          submittedAt: paymentData.submittedAt
        },
        daysPending: Math.ceil((new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60 * 24))
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        payments: enrichedPayments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          totalPending: count,
          totalAmount: enrichedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)
        }
      },
      message: `${count} pago(s) pendiente(s) de aprobación`
    });

  } catch (error) {
    logger.error(`Error obteniendo pagos pendientes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener detalles de un pago manual específico
 * GET /api/manual-payments/:id
 */
exports.getManualPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address']
        },
        {
          model: Invoice,
          attributes: ['id', 'invoiceNumber', 'totalAmount', 'dueDate', 'status']
        },
        {
          model: PaymentGateway,
          attributes: ['id', 'name', 'gatewayType'],
          required: false
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Verificar que es un pago manual
    if (!payment.PaymentGateway || payment.PaymentGateway.name !== 'Manual') {
      return res.status(400).json({
        success: false,
        message: 'Este no es un pago manual'
      });
    }

    // Parsear datos del pago manual
    let paymentData = {};
    try {
      paymentData = JSON.parse(payment.paymentData || '{}');
    } catch (e) {
      logger.warn(`Error parseando paymentData para pago ${payment.id}`);
    }

    // Obtener información del usuario que registró el pago
    let submittedByUser = null;
    if (paymentData.submittedBy) {
      submittedByUser = await User.findByPk(paymentData.submittedBy, {
        attributes: ['id', 'username', 'fullName']
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          paymentReference: payment.paymentReference,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          status: payment.status,
          createdAt: payment.createdAt,
          processedAt: payment.processedAt
        },
        client: payment.Client,
        invoice: payment.Invoice,
        manualPaymentDetails: {
          bankName: paymentData.bankName,
          notes: paymentData.notes,
          receiptFile: paymentData.receiptFile,
          submittedAt: paymentData.submittedAt,
          submittedBy: submittedByUser
        },
        timeline: {
          submitted: paymentData.submittedAt,
          reviewed: payment.processedAt,
          daysPending: payment.status === 'pending' ? 
            Math.ceil((new Date() - new Date(payment.createdAt)) / (1000 * 60 * 60 * 24)) : 0
        }
      },
      message: 'Detalles del pago obtenidos exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo detalles del pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Aprobar pago manual
 * POST /api/manual-payments/:id/approve
 */
exports.approveManualPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Invoice,
          include: [{ model: Client }]
        },
        { model: PaymentGateway }
      ],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Verificar que es un pago manual pendiente
    if (payment.PaymentGateway.name !== 'Manual') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Este no es un pago manual'
      });
    }

    if (payment.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `El pago ya está en estado: ${payment.status}`
      });
    }

    // Actualizar datos del pago con información de aprobación
    let currentPaymentData = {};
    try {
      currentPaymentData = JSON.parse(payment.paymentData || '{}');
    } catch (e) {
      logger.warn(`Error parseando paymentData para pago ${payment.id}`);
    }

    const updatedPaymentData = {
      ...currentPaymentData,
      approval: {
        approvedBy: req.userId,
        approvedAt: new Date().toISOString(),
        approvalNotes: approvalNotes || '',
        previousStatus: payment.status
      }
    };

    // Actualizar pago como completado
    await payment.update({
      status: 'completed',
      processedAt: new Date(),
      paymentData: JSON.stringify(updatedPaymentData)
    }, { transaction });

    // Marcar factura como pagada
    await payment.Invoice.update({
      status: 'paid'
    }, { transaction });

    await transaction.commit();

    // Reactivar servicio del cliente automáticamente
    try {
      const reactivationResult = await clientBillingService.reactivateClientAfterPayment(
        payment.clientId,
        payment.paymentReference
      );

      logger.info(`Pago manual ${payment.paymentReference} aprobado y servicio reactivado para cliente ${payment.clientId}`);

      return res.status(200).json({
        success: true,
        data: {
          payment: {
            id: payment.id,
            paymentReference: payment.paymentReference,
            status: 'completed',
            amount: payment.amount
          },
          client: {
            id: payment.Invoice.Client.id,
            name: `${payment.Invoice.Client.firstName} ${payment.Invoice.Client.lastName}`
          },
          invoice: {
            id: payment.Invoice.id,
            number: payment.Invoice.invoiceNumber,
            status: 'paid'
          },
          serviceReactivated: reactivationResult.success,
          approvedBy: req.userId,
          approvedAt: new Date().toISOString()
        },
        message: 'Pago manual aprobado exitosamente y servicio reactivado'
      });

    } catch (reactivationError) {
      logger.error(`Error reactivando servicio después de aprobar pago: ${reactivationError.message}`);
      
      return res.status(200).json({
        success: true,
        data: {
          payment: {
            id: payment.id,
            paymentReference: payment.paymentReference,
            status: 'completed'
          },
          serviceReactivated: false,
          reactivationError: reactivationError.message
        },
        message: 'Pago aprobado exitosamente (error en reactivación automática)'
      });
    }

  } catch (error) {
    await transaction.rollback();
    logger.error(`Error aprobando pago manual ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Rechazar pago manual
 * POST /api/manual-payments/:id/reject
 */
exports.rejectManualPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'La razón de rechazo es requerida'
      });
    }

    const payment = await Payment.findByPk(id, {
      include: [
        { model: Client },
        { model: Invoice },
        { model: PaymentGateway }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Verificar que es un pago manual pendiente
    if (payment.PaymentGateway.name !== 'Manual') {
      return res.status(400).json({
        success: false,
        message: 'Este no es un pago manual'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `El pago ya está en estado: ${payment.status}`
      });
    }

    // Actualizar datos del pago con información de rechazo
    let currentPaymentData = {};
    try {
      currentPaymentData = JSON.parse(payment.paymentData || '{}');
    } catch (e) {
      logger.warn(`Error parseando paymentData para pago ${payment.id}`);
    }

    const updatedPaymentData = {
      ...currentPaymentData,
      rejection: {
        rejectedBy: req.userId,
        rejectedAt: new Date().toISOString(),
        rejectionReason,
        previousStatus: payment.status
      }
    };

    // Actualizar pago como rechazado
    await payment.update({
      status: 'failed',
      processedAt: new Date(),
      paymentData: JSON.stringify(updatedPaymentData)
    });

    logger.info(`Pago manual ${payment.paymentReference} rechazado por usuario ${req.userId}: ${rejectionReason}`);

    return res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          paymentReference: payment.paymentReference,
          status: 'failed',
          amount: payment.amount
        },
        client: {
          id: payment.Client.id,
          name: `${payment.Client.firstName} ${payment.Client.lastName}`
        },
        rejection: {
          reason: rejectionReason,
          rejectedBy: req.userId,
          rejectedAt: new Date().toISOString()
        }
      },
      message: 'Pago manual rechazado exitosamente'
    });

  } catch (error) {
    logger.error(`Error rechazando pago manual ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Descargar comprobante de pago
 * GET /api/manual-payments/:id/receipt
 */
exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [{ model: PaymentGateway }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Verificar que es un pago manual
    if (payment.PaymentGateway.name !== 'Manual') {
      return res.status(400).json({
        success: false,
        message: 'Este no es un pago manual'
      });
    }

    // Obtener información del archivo
    let paymentData = {};
    try {
      paymentData = JSON.parse(payment.paymentData || '{}');
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Error obteniendo datos del pago'
      });
    }

    const receiptFile = paymentData.receiptFile;
    if (!receiptFile) {
      return res.status(404).json({
        success: false,
        message: 'No hay comprobante disponible para este pago'
      });
    }

    const filePath = receiptFile.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de comprobante no encontrado'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${receiptFile.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Enviar archivo
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    logger.error(`Error descargando comprobante del pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de pagos manuales
 * GET /api/manual-payments/statistics
 */
exports.getManualPaymentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Obtener gateway manual
    const manualGateway = await PaymentGateway.findOne({
      where: { name: 'Manual' }
    });

    if (!manualGateway) {
      return res.status(200).json({
        success: true,
        data: {
          totalManualPayments: 0,
          pendingApproval: 0,
          approved: 0,
          rejected: 0,
          totalAmount: '0.00'
        },
        message: 'No hay pagos manuales registrados'
      });
    }

    const whereClause = {
      gatewayId: manualGateway.id,
      ...dateFilter
    };

    // Obtener estadísticas
    const [
      totalPayments,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      payments
    ] = await Promise.all([
      Payment.count({ where: whereClause }),
      Payment.count({ where: { ...whereClause, status: 'pending' } }),
      Payment.count({ where: { ...whereClause, status: 'completed' } }),
      Payment.count({ where: { ...whereClause, status: 'failed' } }),
      Payment.findAll({
        where: whereClause,
        attributes: ['amount', 'status', 'paymentMethod', 'createdAt']
      })
    ]);

    // Calcular montos
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const approvedAmount = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Agrupar por método de pago
    const paymentMethods = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count++;
      acc[method].amount += parseFloat(payment.amount);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalManualPayments: totalPayments,
          pendingApproval: pendingPayments,
          approved: approvedPayments,
          rejected: rejectedPayments,
          totalAmount: totalAmount.toFixed(2),
          approvedAmount: approvedAmount.toFixed(2),
          approvalRate: totalPayments > 0 ? ((approvedPayments / totalPayments) * 100).toFixed(2) : '0.00'
        },
        paymentMethods,
        period: {
          startDate: startDate || 'N/A',
          endDate: endDate || 'N/A'
        }
      },
      message: 'Estadísticas de pagos manuales obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de pagos manuales: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Buscar clientes para operadores
 * GET /api/manual-payments/client/search
 */
exports.searchClients = async (req, res) => {
  try {
    const { q } = req.query; // query search term
    
    if (!q || q.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 3 caracteres'
      });
    }
    
    const clients = await Client.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { firstName: { [db.Sequelize.Op.iLike]: `%${q}%` } },
          { lastName: { [db.Sequelize.Op.iLike]: `%${q}%` } },
          { phone: { [db.Sequelize.Op.iLike]: `%${q}%` } },
          { email: { [db.Sequelize.Op.iLike]: `%${q}%` } }
        ],
        active: true
      },
      attributes: ['id', 'firstName', 'lastName', 'phone', 'email'],
      limit: 10,
      order: [['firstName', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        searchTerm: q,
        clients: clients.map(client => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          phone: client.phone,
          email: client.email
        }))
      },
      message: `${clients.length} cliente(s) encontrado(s)`
    });

  } catch (error) {
    logger.error(`Error buscando clientes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error buscando clientes'
    });
  }
};

/**
 * Obtener facturas pendientes de un cliente
 * GET /api/manual-payments/client/:clientId/invoices
 */
exports.getClientPendingInvoices = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const pendingInvoices = await Invoice.findAll({
      where: {
        clientId: parseInt(clientId),
        status: ['pending', 'overdue']
      },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        clientId: parseInt(clientId),
        pendingInvoices: pendingInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount,
          dueDate: inv.dueDate,
          status: inv.status,
          daysPastDue: inv.status === 'overdue' ? 
            Math.ceil((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)) : 0
        }))
      },
      message: `${pendingInvoices.length} factura(s) pendiente(s) encontrada(s)`
    });

  } catch (error) {
    logger.error(`Error obteniendo facturas del cliente ${req.params.clientId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo facturas del cliente'
    });
  }
};

/**
 * Resumen administrativo para dashboard
 * GET /api/manual-payments/admin/summary
 */
exports.getAdminSummary = async (req, res) => {
  try {
    // Obtener gateway manual
    const manualGateway = await PaymentGateway.findOne({
      where: { name: 'Manual' }
    });

    if (!manualGateway) {
      return res.status(200).json({
        success: true,
        data: {
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          totalPendingAmount: '0.00'
        },
        message: 'No hay actividad de pagos manuales'
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [
      pendingCount,
      approvedToday,
      rejectedToday,
      pendingPayments
    ] = await Promise.all([
      Payment.count({
        where: { gatewayId: manualGateway.id, status: 'pending' }
      }),
      Payment.count({
        where: {
          gatewayId: manualGateway.id,
          status: 'completed',
          processedAt: { [db.Sequelize.Op.between]: [startOfDay, endOfDay] }
        }
      }),
      Payment.count({
        where: {
          gatewayId: manualGateway.id,
          status: 'failed',
          processedAt: { [db.Sequelize.Op.between]: [startOfDay, endOfDay] }
        }
      }),
      Payment.findAll({
        where: { gatewayId: manualGateway.id, status: 'pending' },
        attributes: ['amount']
      })
    ]);

    const totalPendingAmount = pendingPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount), 0
    );

    return res.status(200).json({
      success: true,
      data: {
        pending: pendingCount,
        approvedToday,
        rejectedToday,
        totalPendingAmount: totalPendingAmount.toFixed(2),
        date: today.toISOString().split('T')[0]
      },
      message: 'Resumen administrativo obtenido exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo resumen administrativo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen administrativo'
    });
  }
};

/**
 * Aprobación en lote de pagos
 * POST /api/manual-payments/bulk-approve
 */
exports.bulkApprovePayments = async (req, res) => {
  try {
    const { paymentIds, bulkApprovalNotes } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de pagos'
      });
    }

    if (paymentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 50 pagos por lote'
      });
    }

    const results = [];
    let approved = 0;
    let errors = 0;

    for (const paymentId of paymentIds) {
      const transaction = await db.sequelize.transaction();
      
      try {
        const payment = await Payment.findByPk(paymentId, {
          include: [
            {
              model: Invoice,
              include: [{ model: Client }]
            },
            { model: PaymentGateway }
          ],
          transaction
        });

        if (!payment || payment.PaymentGateway.name !== 'Manual' || payment.status !== 'pending') {
          await transaction.rollback();
          errors++;
          results.push({
            paymentId,
            status: 'error',
            error: 'Pago no válido para aprobación'
          });
          continue;
        }

        // Actualizar datos del pago con información de aprobación
        let currentPaymentData = {};
        try {
          currentPaymentData = JSON.parse(payment.paymentData || '{}');
        } catch (e) {
          currentPaymentData = {};
        }

        const updatedPaymentData = {
          ...currentPaymentData,
          approval: {
            approvedBy: req.userId,
            approvedAt: new Date().toISOString(),
            approvalNotes: bulkApprovalNotes || 'Aprobación en lote',
            previousStatus: payment.status
          }
        };

        // Actualizar pago como completado
        await payment.update({
          status: 'completed',
          processedAt: new Date(),
          paymentData: JSON.stringify(updatedPaymentData)
        }, { transaction });

        // Marcar factura como pagada
        await payment.Invoice.update({
          status: 'paid'
        }, { transaction });

        await transaction.commit();

        // Reactivar servicio automáticamente
        try {
          await clientBillingService.reactivateClientAfterPayment(
            payment.clientId,
            payment.paymentReference
          );
        } catch (reactivationError) {
          logger.warn(`Error reactivando servicio para pago ${payment.paymentReference}: ${reactivationError.message}`);
        }

        approved++;
        results.push({
          paymentId,
          status: 'approved',
          reference: payment.paymentReference
        });

      } catch (error) {
        await transaction.rollback();
        errors++;
        results.push({
          paymentId,
          status: 'error',
          error: error.message
        });
      }
    }

    logger.info(`Aprobación en lote completada por usuario ${req.userId}: ${approved} aprobados, ${errors} errores`);

    return res.status(200).json({
      success: true,
      data: {
        totalProcessed: paymentIds.length,
        approved,
        errors,
        results
      },
      message: `Lote procesado: ${approved} aprobados, ${errors} errores`
    });

  } catch (error) {
    logger.error(`Error procesando aprobación en lote: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error procesando aprobación en lote'
    });
  }
};

module.exports = exports;