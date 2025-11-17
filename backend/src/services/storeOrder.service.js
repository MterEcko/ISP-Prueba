const db = require('../models');
const { Op } = require('sequelize');
const storeCustomerService = require('./storeCustomer.service');

const storeOrderService = {
  /**
   * Crear nueva orden
   */
  async createOrder(customerId, orderData) {
    const transaction = await db.sequelize.transaction();

    try {
      const { items, ...orderInfo } = orderData;

      // Calcular totales
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTotal = itemSubtotal - (item.discount || 0) + (item.tax || 0);

        subtotal += itemSubtotal;

        orderItems.push({
          ...item,
          subtotal: itemSubtotal,
          total: itemTotal
        });
      }

      const total = subtotal - (orderInfo.discount || 0) + (orderInfo.tax || 0);

      // Crear orden
      const order = await db.StoreOrder.create({
        customerId,
        subtotal,
        tax: orderInfo.tax || 0,
        discount: orderInfo.discount || 0,
        total,
        currency: orderInfo.currency || 'USD',
        paymentMethod: orderInfo.paymentMethod,
        billingAddress: orderInfo.billingAddress,
        customerNotes: orderInfo.customerNotes,
        ipAddress: orderInfo.ipAddress,
        userAgent: orderInfo.userAgent,
        status: 'pending'
      }, { transaction });

      // Crear items de la orden
      for (const itemData of orderItems) {
        await db.StoreOrderItem.create({
          orderId: order.id,
          ...itemData
        }, { transaction });
      }

      await transaction.commit();

      // Cargar orden completa
      const completeOrder = await this.getOrderById(order.id);

      return completeOrder;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtener orden por ID
   */
  async getOrderById(orderId) {
    const order = await db.StoreOrder.findByPk(orderId, {
      include: [
        {
          model: db.StoreCustomer,
          as: 'customer',
          attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
        },
        {
          model: db.StoreOrderItem,
          as: 'items'
        }
      ]
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    return order;
  },

  /**
   * Obtener todas las órdenes con filtros
   */
  async getAllOrders(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.dateFrom) {
      where.createdAt = { [Op.gte]: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      where.createdAt = {
        ...where.createdAt,
        [Op.lte]: new Date(filters.dateTo)
      };
    }

    if (filters.search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${filters.search}%` } },
        { paymentTransactionId: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const orders = await db.StoreOrder.findAll({
      where,
      include: [
        {
          model: db.StoreCustomer,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: db.StoreOrderItem,
          as: 'items'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });

    const total = await db.StoreOrder.count({ where });

    return {
      orders,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
      pages: Math.ceil(total / (filters.limit || 50))
    };
  },

  /**
   * Actualizar estado de orden
   */
  async updateOrderStatus(orderId, status, updates = {}) {
    const order = await db.StoreOrder.findByPk(orderId);

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    const updateData = {
      status,
      ...updates
    };

    // Actualizar fechas según el estado
    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.paymentStatus = 'paid';
      updateData.paidAt = updateData.paidAt || new Date();

      // Actualizar estadísticas del cliente
      await storeCustomerService.updateLastPurchase(order.customerId, order.total);
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    } else if (status === 'refunded') {
      updateData.refundedAt = new Date();
      updateData.paymentStatus = 'refunded';
    }

    await order.update(updateData);

    return await this.getOrderById(orderId);
  },

  /**
   * Procesar pago de orden
   */
  async processPayment(orderId, paymentData) {
    const order = await db.StoreOrder.findByPk(orderId);

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('La orden ya ha sido pagada');
    }

    await order.update({
      paymentStatus: 'paid',
      paymentMethod: paymentData.method,
      paymentTransactionId: paymentData.transactionId,
      paymentGateway: paymentData.gateway,
      paidAt: new Date(),
      status: 'processing'
    });

    // Procesar items (generar licencias, etc.)
    await this.processOrderItems(order.id);

    // Actualizar a completado
    await this.updateOrderStatus(order.id, 'completed');

    return await this.getOrderById(order.id);
  },

  /**
   * Procesar items de la orden (generar licencias)
   */
  async processOrderItems(orderId) {
    const order = await db.StoreOrder.findByPk(orderId, {
      include: [{ model: db.StoreOrderItem, as: 'items' }]
    });

    for (const item of order.items) {
      // Si el item es un plugin con licencia
      if (item.productType === 'plugin' || item.productType === 'license') {
        // Aquí se generaría la licencia
        // TODO: Integrar con el sistema de licencias existente

        await item.update({
          status: 'delivered',
          deliveredAt: new Date()
        });
      }
    }
  },

  /**
   * Cancelar orden
   */
  async cancelOrder(orderId, reason) {
    const order = await db.StoreOrder.findByPk(orderId);

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    if (order.status === 'completed') {
      throw new Error('No se puede cancelar una orden completada. Use reembolso.');
    }

    await order.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      adminNotes: `Cancelado: ${reason}`
    });

    return await this.getOrderById(orderId);
  },

  /**
   * Reembolsar orden
   */
  async refundOrder(orderId, reason) {
    const order = await db.StoreOrder.findByPk(orderId);

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    if (order.status !== 'completed') {
      throw new Error('Solo se pueden reembolsar órdenes completadas');
    }

    await order.update({
      status: 'refunded',
      paymentStatus: 'refunded',
      refundedAt: new Date(),
      adminNotes: `Reembolsado: ${reason}`
    });

    // Actualizar estadísticas del cliente
    const customer = await db.StoreCustomer.findByPk(order.customerId);
    await customer.update({
      totalPurchases: Math.max(0, customer.totalPurchases - 1),
      totalSpent: Math.max(0, parseFloat(customer.totalSpent) - parseFloat(order.total))
    });

    return await this.getOrderById(orderId);
  },

  /**
   * Obtener estadísticas de ventas
   */
  async getSalesStats(filters = {}) {
    const where = { status: 'completed' };

    if (filters.dateFrom) {
      where.paidAt = { [Op.gte]: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      where.paidAt = {
        ...where.paidAt,
        [Op.lte]: new Date(filters.dateTo)
      };
    }

    // Ventas totales
    const totalSales = await db.StoreOrder.sum('total', { where });
    const orderCount = await db.StoreOrder.count({ where });

    // Ventas por mes
    const salesByMonth = await db.StoreOrder.findAll({
      where,
      attributes: [
        [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('paidAt'), '%Y-%m'), 'month'],
        [db.sequelize.fn('SUM', db.sequelize.col('total')), 'totalSales'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount']
      ],
      group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('paidAt'), '%Y-%m')],
      order: [[db.sequelize.fn('DATE_FORMAT', db.sequelize.col('paidAt'), '%Y-%m'), 'DESC']],
      limit: 12,
      raw: true
    });

    // Productos más vendidos
    const topProducts = await db.StoreOrderItem.findAll({
      include: [
        {
          model: db.StoreOrder,
          as: 'order',
          where,
          attributes: []
        }
      ],
      attributes: [
        'productType',
        'productName',
        [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalQuantity'],
        [db.sequelize.fn('SUM', db.sequelize.col('StoreOrderItem.total')), 'totalRevenue']
      ],
      group: ['productType', 'productName'],
      order: [[db.sequelize.fn('SUM', db.sequelize.col('StoreOrderItem.total')), 'DESC']],
      limit: 10,
      raw: true
    });

    return {
      totalSales: totalSales || 0,
      orderCount,
      averageOrderValue: orderCount > 0 ? (totalSales / orderCount) : 0,
      salesByMonth,
      topProducts
    };
  }
};

module.exports = storeOrderService;
