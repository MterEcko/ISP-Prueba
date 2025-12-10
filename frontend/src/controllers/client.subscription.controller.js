// backend/src/controllers/client.subscription.controller.js
const ClientSubscriptionService = require('../services/client.subscription.service');
const logger = require('../utils/logger');

/**
 * Crear nueva suscripción completa para un cliente
 * POST /api/subscriptions
 */
exports.createSubscription = async (req, res) => {
  try {
    const {
      clientId,
      servicePackageId,
      primaryRouterId,
      customPrice,
      promoDiscount,
      billingDay,
      notes,
      pppoeConfig,
      autoCreateBilling
    } = req.body;

    // Validaciones básicas
    if (!clientId || !servicePackageId || !primaryRouterId) {
      return res.status(400).json({
        success: false,
        message: 'clientId, servicePackageId y primaryRouterId son requeridos'
      });
    }

    // Validar tipos de datos
    if (typeof clientId !== 'number' || typeof servicePackageId !== 'number' || typeof primaryRouterId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'clientId, servicePackageId y primaryRouterId deben ser números'
      });
    }

    if (promoDiscount && (promoDiscount < 0 || promoDiscount > 100)) {
      return res.status(400).json({
        success: false,
        message: 'promoDiscount debe estar entre 0 y 100'
      });
    }

    if (billingDay && (billingDay < 1 || billingDay > 31)) {
      return res.status(400).json({
        success: false,
        message: 'billingDay debe estar entre 1 y 31'
      });
    }

    const subscriptionData = {
      clientId,
      servicePackageId,
      primaryRouterId,
      customPrice: customPrice ? parseFloat(customPrice) : null,
      promoDiscount: promoDiscount || 0,
      billingDay: billingDay || 1,
      notes: notes || '',
      pppoeConfig: pppoeConfig || {},
      autoCreateBilling: autoCreateBilling !== false // Default true
    };

    const result = await ClientSubscriptionService.createClientSubscription(subscriptionData);

    return res.status(201).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    logger.error(`Error creando suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor al crear suscripción'
    });
  }
};

/**
 * Obtener detalles completos de una suscripción
 * GET /api/subscriptions/:id
 */
exports.getSubscriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de suscripción inválido'
      });
    }

    const result = await ClientSubscriptionService.getSubscriptionDetails(parseInt(id));

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Detalles de suscripción obtenidos exitosamente'
    });

  } catch (error) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    logger.error(`Error obteniendo detalles de suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener todas las suscripciones de un cliente
 * GET /api/clients/:clientId/subscriptions
 */
exports.getClientSubscriptions = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { includeInactive } = req.query;

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    const result = await ClientSubscriptionService.getClientSubscriptions(
      parseInt(clientId),
      includeInactive === 'true'
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      message: `${result.data.totalSubscriptions} suscripción(es) encontrada(s)`
    });

  } catch (error) {
    logger.error(`Error obteniendo suscripciones del cliente: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cambiar plan de servicio de una suscripción
 * PUT /api/subscriptions/:id/change-plan
 */
exports.changeServicePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newServicePackageId, effectiveDate } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de suscripción inválido'
      });
    }

    if (!newServicePackageId || isNaN(parseInt(newServicePackageId))) {
      return res.status(400).json({
        success: false,
        message: 'newServicePackageId es requerido y debe ser un número'
      });
    }

    const parsedEffectiveDate = effectiveDate ? new Date(effectiveDate) : new Date();

    if (effectiveDate && isNaN(parsedEffectiveDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'effectiveDate debe ser una fecha válida'
      });
    }

    const result = await ClientSubscriptionService.changeServicePlan(
      parseInt(id),
      parseInt(newServicePackageId),
      parsedEffectiveDate
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('No se puede cambiar plan')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error(`Error cambiando plan de suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};



/**
 * Suspender suscripción
 * POST /api/subscriptions/:id/suspend
 */
exports.suspendSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de suscripción inválido'
      });
    }

    const suspensionReason = reason || 'Suspensión manual por administrador';

    const result = await ClientSubscriptionService.suspendSubscription(
      parseInt(id),
      suspensionReason
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('ya está en estado')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error(`Error suspendiendo suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Reactivar suscripción
 * POST /api/subscriptions/:id/reactivate
 */
exports.reactivateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentReference } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de suscripción inválido'
      });
    }

    const result = await ClientSubscriptionService.reactivateSubscription(
      parseInt(id),
      paymentReference || null
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('No se puede reactivar')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error(`Error reactivando suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cancelar suscripción permanentemente
 * POST /api/subscriptions/:id/cancel
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, removeFromMikrotik } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de suscripción inválido'
      });
    }

    const cancellationReason = reason || 'Cancelación solicitada por administrador';
    const shouldRemoveFromMikrotik = removeFromMikrotik !== false; // Default true

    const result = await ClientSubscriptionService.cancelSubscription(
      parseInt(id),
      cancellationReason,
      shouldRemoveFromMikrotik
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('ya está cancelada')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error(`Error cancelando suscripción: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de suscripciones
 * GET /api/subscriptions/statistics
 */
exports.getSubscriptionStatistics = async (req, res) => {
  try {
    const { period, zoneId } = req.query;
    
    // Esta implementación sería más compleja, por ahora estadísticas básicas
    const db = require('../models');
    const { Subscription, ServicePackage, Zone } = db;

    const whereClause = {};
    if (zoneId && !isNaN(parseInt(zoneId))) {
      // Filtrar por zona a través del servicePackage
    }

    const [
      totalActive,
      totalSuspended,
      totalCancelled,
      totalCutService
    ] = await Promise.all([
      Subscription.count({ where: { status: 'active' } }),
      Subscription.count({ where: { status: 'suspended' } }),
      Subscription.count({ where: { status: 'cancelled' } }),
      Subscription.count({ where: { status: 'cutService' } })
    ]);

    const statistics = {
      total: totalActive + totalSuspended + totalCancelled + totalCutService,
      byStatus: {
        active: totalActive,
        suspended: totalSuspended,
        cancelled: totalCancelled,
        cutService: totalCutService
      },
      healthScore: totalActive > 0 ? ((totalActive / (totalActive + totalSuspended + totalCutService)) * 100).toFixed(2) : 0
    };

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Estadísticas de suscripciones obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de suscripciones: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Búsqueda de suscripciones con filtros avanzados
 * GET /api/subscriptions/search
 */
exports.searchSubscriptions = async (req, res) => {
  try {
    const {
      status,
      zoneId,
      servicePackageId,
      clientName,
      pppoeUsername,
      page = 1,
      limit = 20
    } = req.query;

    const db = require('../models');
    const { Subscription, Client, ServicePackage, Zone, IpPool } = db;
    const { Op } = require('sequelize');

    // Construir condiciones WHERE
    const whereClause = {};
    const clientWhereClause = {};
    const packageWhereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (servicePackageId && !isNaN(parseInt(servicePackageId))) {
      whereClause.servicePackageId = parseInt(servicePackageId);
    }

    if (pppoeUsername) {
      whereClause.pppoeUsername = { [Op.like]: `%${pppoeUsername}%` };
    }

    if (clientName) {
      clientWhereClause[Op.or] = [
        { firstName: { [Op.like]: `%${clientName}%` } },
        { lastName: { [Op.like]: `%${clientName}%` } }
      ];
    }

    if (zoneId && !isNaN(parseInt(zoneId))) {
      packageWhereClause.zoneId = parseInt(zoneId);
    }

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: subscriptions } = await Subscription.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Client,
          where: Object.keys(clientWhereClause).length > 0 ? clientWhereClause : undefined,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'active']
        },
        {
          model: db.ServicePackage,
          where: Object.keys(packageWhereClause).length > 0 ? packageWhereClause : undefined,
          include: [{ model: db.Zone, attributes: ['id', 'name'] }]
        },
        {
          model: db.IpPool,
          as: 'currentPool',
          attributes: ['id', 'poolName', 'poolType']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      },
      message: `${count} suscripción(es) encontrada(s)`
    });

  } catch (error) {
    logger.error(`Error buscando suscripciones: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Procesar suscripciones vencidas (para uso interno/cron)
 * POST /api/subscriptions/process-overdue
 */
exports.processOverdueSubscriptions = async (req, res) => {
  try {
    const { dryRun } = req.query;

    // Este endpoint sería típicamente llamado por un cron job
    // Por ahora implementación básica

    const db = require('../models');
    const { Subscription, ClientBilling } = db;
    const { Op } = require('sequelize');

    const today = new Date();

    // Buscar suscripciones activas con facturas vencidas
    const overdueSubscriptions = await Subscription.findAll({
      where: {
        status: 'active'
      },
      include: [
        {
          model: ClientBilling,
          where: {
            nextDueDate: { [Op.lt]: today },
            clientStatus: 'active'
          }
        }
      ]
    });

    let processed = 0;
    const results = [];

    if (dryRun !== 'true') {
      for (const subscription of overdueSubscriptions) {
        try {
          const result = await ClientSubscriptionService.suspendSubscription(
            subscription.id,
            'Suspensión automática por pago vencido'
          );
          
          results.push({
            subscriptionId: subscription.id,
            clientId: subscription.clientId,
            action: 'suspended',
            success: true
          });
          
          processed++;
        } catch (error) {
          results.push({
            subscriptionId: subscription.id,
            clientId: subscription.clientId,
            action: 'suspend_failed',
            error: error.message,
            success: false
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalFound: overdueSubscriptions.length,
        processed,
        dryRun: dryRun === 'true',
        results
      },
      message: dryRun === 'true' ? 
        `${overdueSubscriptions.length} suscripciones vencidas encontradas (dry run)` :
        `${processed} suscripciones procesadas`
    });

  } catch (error) {
    logger.error(`Error procesando suscripciones vencidas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};