// backend/src/controllers/payment.controller.js
const db = require('../models');
const logger = require('../utils/logger');
const paymentGatewayService = require('../services/payment.gateway.service');
const clientBillingService = require('../services/client.billing.service');
const communicationService = require('../services/communication.service');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Modelos
const Payment = db.Payment;
const PaymentGateway = db.PaymentGateway;
const PaymentReminder = db.PaymentReminder;
const Invoice = db.Invoice;
const Client = db.Client;
const ClientBilling = db.ClientBilling;

// ==================== GESTIÓN DE PAGOS ====================

/**
 * Obtener todos los pagos con filtros y paginación
 * GET /api/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      gatewayId,
      clientId,
      startDate,
      endDate,
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Aplicar filtros
    if (status) whereClause.status = status;
    if (gatewayId) whereClause.gatewayId = gatewayId;
    if (clientId) whereClause.clientId = clientId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Invoice,
          attributes: ['id', 'invoiceNumber', 'totalAmount']
        },
        {
          model: PaymentGateway,
          attributes: ['id', 'name', 'gatewayType']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]]
    });

    // Calcular estadísticas
    const totalAmount = payments.reduce((sum, payment) => 
      sum + parseFloat(payment.amount), 0
    );

    const statusSummary = payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        summary: {
          totalAmount: totalAmount.toFixed(2),
          statusSummary
        }
      },
      message: `${count} pagos encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo pagos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener pago por ID
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Invoice,
          attributes: ['id', 'invoiceNumber', 'totalAmount', 'dueDate', 'status']
        },
        {
          model: PaymentGateway,
          attributes: ['id', 'name', 'gatewayType', 'country']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Obtener historial de estados si existe
    let paymentHistory = [];
    try {
      if (payment.gatewayResponse) {
        const gatewayData = JSON.parse(payment.gatewayResponse);
        paymentHistory = gatewayData.history || [];
      }
    } catch (parseError) {
      logger.warn(`Error parseando gateway response: ${parseError.message}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...payment.toJSON(),
        paymentHistory
      },
      message: 'Pago obtenido exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nuevo pago
 * POST /api/payments
 */
exports.createPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      invoiceId,
      clientId,
      gatewayId,
      amount,
      paymentMethod,
      paymentReference,
      paymentDate = new Date(),
      notes,
      gatewayResponse,
      autoConfirm = false
    } = req.body;

    // Validaciones
    if (!invoiceId || !clientId || !gatewayId || !amount || !paymentMethod) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: invoiceId, clientId, gatewayId, amount, paymentMethod'
      });
    }

    // Verificar que la factura existe
    const invoice = await Invoice.findByPk(invoiceId, { transaction });
    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Verificar que el cliente existe
    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar que la pasarela existe
    const gateway = await PaymentGateway.findByPk(gatewayId, { transaction });
    if (!gateway) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pasarela de pago no encontrada'
      });
    }

    // Generar referencia si no se proporciona
    const finalReference = paymentReference || 
      `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

    // Crear el pago
    const payment = await Payment.create({
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      gatewayId: parseInt(gatewayId),
      paymentReference: finalReference,
      amount: amount ? parseFloat(amount) : invoice.totalAmount,
      paymentMethod,
      status: autoConfirm ? 'completed' : 'pending',
      gatewayResponse: gatewayResponse ? JSON.stringify(gatewayResponse) : null,
      paymentDate: new Date(paymentDate),
      paymentData: JSON.stringify({
        notes,
        createdBy: req.userId,
        autoConfirm,
        createdAt: new Date().toISOString()
      }),
      processedAt: autoConfirm ? new Date() : null
    }, { transaction });

    // Si es autoconfirmado, procesar automáticamente
    if (autoConfirm) {
      await this._processSuccessfulPayment(payment, transaction);
    }

    await transaction.commit();

    logger.info(`Pago ${finalReference} creado exitosamente para cliente ${clientId}`);

    return res.status(201).json({
      success: true,
      data: payment,
      message: `Pago ${autoConfirm ? 'creado y confirmado' : 'creado'} exitosamente`
    });

  } catch (error) {
    await transaction.rollback();
    logger.error(`Error creando pago: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar pago
 * PUT /api/payments/:id
 */
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
      gatewayResponse
    } = req.body;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // No permitir actualizar pagos completados
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden modificar pagos completados'
      });
    }

    // Actualizar campos
    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentDate) updateData.paymentDate = new Date(paymentDate);
    if (gatewayResponse) updateData.gatewayResponse = JSON.stringify(gatewayResponse);

    // Actualizar datos adicionales
    if (notes) {
      const currentData = payment.paymentData ? JSON.parse(payment.paymentData) : {};
      updateData.paymentData = JSON.stringify({
        ...currentData,
        notes,
        updatedBy: req.userId,
        updatedAt: new Date().toISOString()
      });
    }

    await payment.update(updateData);

    logger.info(`Pago ${payment.paymentReference} actualizado`);

    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Pago actualizado exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Confirmar pago pendiente
 * POST /api/payments/:id/confirm
 */
exports.confirmPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { confirmationData, notes } = req.body;

    const payment = await Payment.findByPk(id, {
      include: [
        { model: Invoice },
        { model: Client }
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

    if (payment.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `El pago ya está en estado: ${payment.status}`
      });
    }

    // Actualizar estado del pago
    await payment.update({
      status: 'completed',
      processedAt: new Date(),
      gatewayResponse: confirmationData ? JSON.stringify(confirmationData) : payment.gatewayResponse,
      paymentData: JSON.stringify({
        ...JSON.parse(payment.paymentData || '{}'),
        notes,
        confirmedBy: req.userId,
        confirmedAt: new Date().toISOString()
      })
    }, { transaction });

    // Procesar pago exitoso
    const reactivationResult = await this._processSuccessfulPayment(payment, transaction);

    await transaction.commit();

    logger.info(`Pago ${payment.paymentReference} confirmado exitosamente`);

    return res.status(200).json({
      success: true,
      data: {
        payment,
        serviceReactivated: reactivationResult.success,
        reactivationDetails: reactivationResult.data
      },
      message: 'Pago confirmado y servicio reactivado exitosamente'
    });

  } catch (error) {
    await transaction.rollback();
    logger.error(`Error confirmando pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar pago
 * DELETE /api/payments/:id
 */
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // No permitir eliminar pagos completados
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden eliminar pagos completados'
      });
    }

    await payment.destroy();

    logger.info(`Pago ${payment.paymentReference} eliminado`);

    return res.status(200).json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });

  } catch (error) {
    logger.error(`Error eliminando pago ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de pagos
 * GET /api/payments/statistics
 */
exports.getPaymentStatistics = async (req, res) => {
  try {
    const { startDate, endDate, gatewayId } = req.query;
    
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (gatewayId) {
      whereClause.gatewayId = gatewayId;
    }

    const [totalPayments, completedPayments, pendingPayments, failedPayments] = await Promise.all([
      Payment.count({ where: whereClause }),
      Payment.count({ where: { ...whereClause, status: 'completed' } }),
      Payment.count({ where: { ...whereClause, status: 'pending' } }),
      Payment.count({ where: { ...whereClause, status: 'failed' } })
    ]);

    // Calcular montos
    const payments = await Payment.findAll({
      where: whereClause,
      attributes: ['amount', 'status', 'paymentMethod', 'createdAt']
    });

    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedAmount = payments
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

    // Agrupar por fecha (últimos 7 días)
    const dailyStats = {};
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      dailyStats[date] = { count: 0, amount: 0 };
    }

    payments.forEach(payment => {
      const date = moment(payment.createdAt).format('YYYY-MM-DD');
      if (dailyStats[date]) {
        dailyStats[date].count++;
        dailyStats[date].amount += parseFloat(payment.amount);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalAmount: totalAmount.toFixed(2),
          completedAmount: completedAmount.toFixed(2),
          successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) : '0.00'
        },
        paymentMethods,
        dailyStats,
        period: {
          startDate: startDate || 'N/A',
          endDate: endDate || 'N/A'
        }
      },
      message: 'Estadísticas de pagos obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de pagos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== GESTIÓN DE PASARELAS ====================

/**
 * Obtener todas las pasarelas de pago
 * GET /api/payment-gateways
 */
exports.getAllGateways = async (req, res) => {
  try {
    const { active, country, gatewayType } = req.query;
    
    const whereClause = {};
    if (active !== undefined) whereClause.active = active === 'true';
    if (country) whereClause.country = country;
    if (gatewayType) whereClause.gatewayType = gatewayType;

    const gateways = await PaymentGateway.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    // Obtener estadísticas de uso para cada pasarela
    const gatewaysWithStats = await Promise.all(
      gateways.map(async (gateway) => {
        const paymentCount = await Payment.count({
          where: { gatewayId: gateway.id }
        });
        
        const totalAmount = await Payment.sum('amount', {
          where: { 
            gatewayId: gateway.id,
            status: 'completed'
          }
        });

        return {
          ...gateway.toJSON(),
          statistics: {
            totalPayments: paymentCount,
            totalAmount: totalAmount || 0,
            lastUsed: await Payment.max('createdAt', {
              where: { gatewayId: gateway.id }
            })
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: gatewaysWithStats,
      message: `${gateways.length} pasarelas encontradas`
    });

  } catch (error) {
    logger.error(`Error obteniendo pasarelas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nueva pasarela de pago
 * POST /api/payment-gateways
 */
exports.createGateway = async (req, res) => {
  try {
    const {
      name,
      gatewayType,
      country,
      configuration,
      active = true,
      isDefault = false
    } = req.body;

    if (!name || !gatewayType) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y tipo de pasarela son requeridos'
      });
    }

    // Verificar si ya existe una pasarela con el mismo nombre
    const existingGateway = await PaymentGateway.findOne({
      where: { name }
    });

    if (existingGateway) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una pasarela con ese nombre'
      });
    }

    // Si se marca como default, desactivar otras defaults
    if (isDefault) {
      await PaymentGateway.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );
    }

    const gateway = await PaymentGateway.create({
      name,
      gatewayType,
      country,
      active,
      isDefault,
      configuration: configuration || {}
    });

    logger.info(`Pasarela ${name} creada exitosamente`);

    return res.status(201).json({
      success: true,
      data: gateway,
      message: 'Pasarela creada exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando pasarela: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar pasarela de pago
 * PUT /api/payment-gateways/:id
 */
exports.updateGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      gatewayType,
      country,
      configuration,
      active,
      isDefault
    } = req.body;

    const gateway = await PaymentGateway.findByPk(id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Pasarela no encontrada'
      });
    }

    // Si se marca como default, desactivar otras defaults
    if (isDefault && !gateway.isDefault) {
      await PaymentGateway.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );
    }

    await gateway.update({
      name: name || gateway.name,
      gatewayType: gatewayType || gateway.gatewayType,
      country: country || gateway.country,
      active: active !== undefined ? active : gateway.active,
      isDefault: isDefault !== undefined ? isDefault : gateway.isDefault,
      configuration: configuration || gateway.configuration
    });

    logger.info(`Pasarela ${gateway.name} actualizada`);

    return res.status(200).json({
      success: true,
      data: gateway,
      message: 'Pasarela actualizada exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando pasarela ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Activar/desactivar pasarela
 * POST /api/payment-gateways/:id/activate
 */
exports.activateGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Campo "active" es requerido'
      });
    }

    const gateway = await PaymentGateway.findByPk(id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Pasarela no encontrada'
      });
    }

    await gateway.update({ active });

    logger.info(`Pasarela ${gateway.name} ${active ? 'activada' : 'desactivada'}`);

    return res.status(200).json({
      success: true,
      data: gateway,
      message: `Pasarela ${active ? 'activada' : 'desactivada'} exitosamente`
    });

  } catch (error) {
    logger.error(`Error activando/desactivando pasarela ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener plugins disponibles
 * GET /api/payment-gateways/plugins
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    const pluginsDir = path.join(__dirname, '../plugins');
    const availablePlugins = [];

    if (fs.existsSync(pluginsDir)) {
      const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folder of pluginFolders) {
        const pluginPath = path.join(pluginsDir, folder, 'src', `${folder}.controller.js`);
        
        if (fs.existsSync(pluginPath)) {
          // Intentar cargar información del plugin
          try {
            const pluginController = require(pluginPath);
            const pluginInfo = pluginController.getPluginInfo ? 
              pluginController.getPluginInfo() : 
              {
                name: folder,
                version: '1.0.0',
                description: `Plugin para ${folder}`,
                countries: ['unknown']
              };

            availablePlugins.push({
              ...pluginInfo,
              folder,
              path: pluginPath,
              loaded: true
            });
          } catch (error) {
            availablePlugins.push({
              name: folder,
              folder,
              path: pluginPath,
              loaded: false,
              error: error.message
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: availablePlugins,
      message: `${availablePlugins.length} plugins encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo plugins: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de pasarela específica
 * GET /api/payment-gateways/:id/stats
 */
exports.getGatewayStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query; // días

    const gateway = await PaymentGateway.findByPk(id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Pasarela no encontrada'
      });
    }

    const startDate = moment().subtract(parseInt(period), 'days').toDate();
    
    const payments = await Payment.findAll({
      where: {
        gatewayId: id,
        createdAt: {
          [db.Sequelize.Op.gte]: startDate
        }
      },
      attributes: ['amount', 'status', 'createdAt', 'paymentMethod']
    });

    const totalPayments = payments.length;
    const completedPayments = payments.filter(p => p.status === 'completed').length;
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedAmount = payments
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
        gateway: {
          id: gateway.id,
          name: gateway.name,
          gatewayType: gateway.gatewayType
        },
        period: `${period} días`,
        statistics: {
          totalPayments,
          completedPayments,
          successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) : '0.00',
          totalAmount: totalAmount.toFixed(2),
          completedAmount: completedAmount.toFixed(2),
          averageTicket: completedPayments > 0 ? (completedAmount / completedPayments).toFixed(2) : '0.00'
        },
        paymentMethods
      },
      message: 'Estadísticas obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de pasarela ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== RECORDATORIOS DE PAGO ====================

/**
 * Obtener todos los recordatorios
 * GET /api/payment-reminders
 */
exports.getAllReminders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reminderType,
      clientId,
      invoiceId
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (status) whereClause.status = status;
    if (reminderType) whereClause.reminderType = reminderType;
    if (clientId) whereClause.clientId = clientId;
    if (invoiceId) whereClause.invoiceId = invoiceId;

    const { count, rows: reminders } = await PaymentReminder.findAndCountAll({
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
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        reminders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      },
      message: `${count} recordatorios encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo recordatorios: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear recordatorio manual
 * POST /api/payment-reminders
 */
exports.createReminder = async (req, res) => {
  try {
    const {
      clientId,
      invoiceId,
      reminderType,
      daysOverdue,
      messageSent,
      scheduledFor
    } = req.body;

    if (!clientId || !invoiceId || !reminderType) {
      return res.status(400).json({
        success: false,
        message: 'clientId, invoiceId y reminderType son requeridos'
      });
    }

    // Verificar que el cliente existe
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar que la factura existe
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const reminder = await PaymentReminder.create({
      clientId,
      invoiceId,
      reminderType,
      status: 'pending',
      daysOverdue: daysOverdue || 0,
      messageSent: messageSent || `Recordatorio de pago - Factura ${invoice.invoiceNumber}`,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date()
    });

    logger.info(`Recordatorio creado para cliente ${clientId}, factura ${invoiceId}`);

    return res.status(201).json({
      success: true,
      data: reminder,
      message: 'Recordatorio creado exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando recordatorio: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar recordatorio específico
 * POST /api/payment-reminders/:id/send
 */
exports.sendReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { forceResend = false } = req.body;

    const reminder = await PaymentReminder.findByPk(id, {
      include: [
        { model: Client },
        { model: Invoice }
      ]
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Recordatorio no encontrado'
      });
    }

    // Verificar si ya fue enviado
    if (reminder.status === 'sent' && !forceResend) {
      return res.status(400).json({
        success: false,
        message: 'El recordatorio ya fue enviado. Use forceResend=true para reenviar'
      });
    }

    // Intentar enviar usando el servicio de comunicaciones
    try {
      let sendResult;
      
      if (communicationService && communicationService.sendPaymentReminder) {
        sendResult = await communicationService.sendPaymentReminder(
          reminder.clientId,
          reminder.reminderType,
          reminder.daysOverdue,
          {
            invoiceNumber: reminder.Invoice.invoiceNumber,
            amount: reminder.Invoice.totalAmount,
            dueDate: reminder.Invoice.dueDate
          }
        );
      } else {
        // Fallback: marcar como enviado sin envío real
        logger.warn('Servicio de comunicaciones no disponible, marcando como enviado');
        sendResult = { success: true, message: 'Marcado como enviado (sin servicio de comunicaciones)' };
      }

      // Actualizar estado del recordatorio
      await reminder.update({
        status: sendResult.success ? 'sent' : 'failed',
        sentAt: sendResult.success ? new Date() : null
      });

      return res.status(200).json({
        success: true,
        data: {
          reminder,
          sendResult
        },
        message: sendResult.success ? 'Recordatorio enviado exitosamente' : 'Error enviando recordatorio'
      });

    } catch (sendError) {
      logger.error(`Error enviando recordatorio: ${sendError.message}`);
      
      await reminder.update({
        status: 'failed',
        sentAt: null
      });

      return res.status(500).json({
        success: false,
        message: 'Error enviando recordatorio',
        error: sendError.message
      });
    }

  } catch (error) {
    logger.error(`Error procesando envío de recordatorio ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Programar recordatorios automáticos
 * POST /api/payment-reminders/schedule
 */
exports.scheduleReminders = async (req, res) => {
  try {
    const { dryRun = false } = req.query;

    // Obtener facturas vencidas sin recordatorios recientes
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
          where: { active: true }
        }
      ]
    });

    let scheduledCount = 0;
    const results = [];

    for (const invoice of overdueInvoices) {
      try {
        // Calcular días de atraso
        const daysOverdue = Math.ceil(
          (new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
        );

        // Verificar si ya hay recordatorio reciente
        const recentReminder = await PaymentReminder.findOne({
          where: {
            clientId: invoice.clientId,
            invoiceId: invoice.id,
            createdAt: {
              [db.Sequelize.Op.gte]: moment().subtract(24, 'hours').toDate()
            }
          }
        });

        if (recentReminder) {
          results.push({
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            action: 'skipped',
            reason: 'Recordatorio reciente existe'
          });
          continue;
        }

        // Determinar tipo de recordatorio según días de atraso
        let reminderType = 'email';
        if (daysOverdue > 7) {
          reminderType = 'sms';
        } else if (daysOverdue > 3) {
          reminderType = 'whatsapp';
        }

        if (!dryRun) {
          const reminder = await PaymentReminder.create({
            clientId: invoice.clientId,
            invoiceId: invoice.id,
            reminderType,
            status: 'pending',
            daysOverdue,
            messageSent: `Recordatorio automático - ${daysOverdue} días de atraso`
          });

          // Intentar enviar inmediatamente
          if (communicationService && communicationService.sendPaymentReminder) {
            try {
              await communicationService.sendPaymentReminder(
                invoice.clientId,
                reminderType,
                daysOverdue
              );
              
              await reminder.update({
                status: 'sent',
                sentAt: new Date()
              });
            } catch (sendError) {
              logger.warn(`Error enviando recordatorio automático: ${sendError.message}`);
            }
          }
        }

        scheduledCount++;
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientId: invoice.clientId,
          clientName: `${invoice.Client.firstName} ${invoice.Client.lastName}`,
          daysOverdue,
          reminderType,
          action: dryRun ? 'would_schedule' : 'scheduled'
        });

      } catch (itemError) {
        logger.error(`Error procesando factura ${invoice.id}: ${itemError.message}`);
        results.push({
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          action: 'error',
          error: itemError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalInvoicesProcessed: overdueInvoices.length,
        scheduledReminders: scheduledCount,
        dryRun,
        results
      },
      message: dryRun ? 
        `${scheduledCount} recordatorios serían programados` :
        `${scheduledCount} recordatorios programados exitosamente`
    });

  } catch (error) {
    logger.error(`Error programando recordatorios: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener historial de recordatorios
 * GET /api/payment-reminders/history
 */
exports.getReminderHistory = async (req, res) => {
  try {
    const {
      clientId,
      startDate,
      endDate,
      status,
      reminderType
    } = req.query;

    const whereClause = {};
    
    if (clientId) whereClause.clientId = clientId;
    if (status) whereClause.status = status;
    if (reminderType) whereClause.reminderType = reminderType;
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const reminders = await PaymentReminder.findAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Invoice,
          attributes: ['id', 'invoiceNumber', 'totalAmount']
        }
      ],
      order: [['sentAt', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calcular estadísticas
    const totalReminders = reminders.length;
    const sentReminders = reminders.filter(r => r.status === 'sent').length;
    const failedReminders = reminders.filter(r => r.status === 'failed').length;

    // Agrupar por tipo
    const reminderTypes = reminders.reduce((acc, reminder) => {
      const type = reminder.reminderType;
      if (!acc[type]) {
        acc[type] = { total: 0, sent: 0, failed: 0 };
      }
      acc[type].total++;
      if (reminder.status === 'sent') acc[type].sent++;
      if (reminder.status === 'failed') acc[type].failed++;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        reminders,
        statistics: {
          totalReminders,
          sentReminders,
          failedReminders,
          successRate: totalReminders > 0 ? ((sentReminders / totalReminders) * 100).toFixed(2) : '0.00'
        },
        reminderTypes
      },
      message: 'Historial de recordatorios obtenido exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo historial de recordatorios: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== WEBHOOKS Y PROCESAMIENTO ====================

/**
 * Manejar webhook genérico de pasarelas
 * POST /api/payments/webhook/:gateway
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { gateway } = req.params;
    const webhookData = req.body;
    const signature = req.headers['x-signature'] || req.headers['authorization'];

    logger.info(`Webhook recibido de ${gateway}`);

    // Usar el servicio de pasarelas para procesar
    const result = await paymentGatewayService.handleWebhook(
      gateway,
      webhookData,
      signature
    );

    if (result.success) {
      logger.info(`Webhook de ${gateway} procesado exitosamente`);
    } else {
      logger.warn(`Webhook de ${gateway} falló: ${result.message}`);
    }

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error procesando webhook de ${req.params.gateway}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error procesando webhook'
    });
  }
};

/**
 * Procesar pago con plugin específico
 * POST /api/payments/process
 */
exports.processPayment = async (req, res) => {
  try {
    const paymentData = req.body;

    // Validaciones básicas
    if (!paymentData.gatewayId || !paymentData.invoiceId || !paymentData.amount) {
      return res.status(400).json({
        success: false,
        message: 'gatewayId, invoiceId y amount son requeridos'
      });
    }

    // Procesar usando el servicio de pasarelas
    const result = await paymentGatewayService.processPayment(paymentData);

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error procesando pago: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Conciliar pagos pendientes
 * POST /api/payments/reconcile
 */
exports.reconcilePayments = async (req, res) => {
  try {
    const { gatewayId, date } = req.body;
    
    const reconcileDate = date ? new Date(date) : new Date();

    const result = await paymentGatewayService.reconcilePayments(gatewayId, reconcileDate);

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error conciliando pagos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== MÉTODOS PRIVADOS ====================

/**
 * Procesa un pago exitoso y reactiva el servicio automáticamente
 * @private
 */
exports._processSuccessfulPayment = async (payment, transaction = null) => {
  try {
    logger.info(`Procesando pago exitoso: ${payment.paymentReference}`);

    // Marcar factura como pagada
    await Invoice.update({
      status: 'paid'
    }, {
      where: { id: payment.invoiceId },
      transaction
    });

    // Reactivar servicio del cliente automáticamente
    const reactivationResult = await clientBillingService.reactivateClientAfterPayment(
      payment.clientId,
      payment.paymentReference
    );

    return reactivationResult;

  } catch (error) {
    logger.error(`Error procesando pago exitoso ${payment.paymentReference}: ${error.message}`);
    throw error;
  }
};

module.exports = exports;