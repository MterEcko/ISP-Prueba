const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const storeCustomerService = {
  /**
   * Crear nuevo cliente del Store
   */
  async createCustomer(customerData) {
    // Hash password
    if (customerData.password) {
      const salt = await bcrypt.genSalt(10);
      customerData.password = await bcrypt.hash(customerData.password, salt);
    }

    const customer = await db.StoreCustomer.create(customerData);

    // No devolver password
    const { password, passwordResetToken, emailVerificationToken, ...customerWithoutSensitive } = customer.toJSON();

    return customerWithoutSensitive;
  },

  /**
   * Obtener todos los clientes con filtros
   */
  async getAllCustomers(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.country) {
      where.country = filters.country;
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    if (filters.search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
        { companyName: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const customers = await db.StoreCustomer.findAll({
      where,
      attributes: {
        exclude: ['password', 'passwordResetToken', 'emailVerificationToken']
      },
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0
    });

    const total = await db.StoreCustomer.count({ where });

    return {
      customers,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1,
      pages: Math.ceil(total / (filters.limit || 100))
    };
  },

  /**
   * Obtener cliente por ID con sus órdenes
   */
  async getCustomerById(customerId) {
    const customer = await db.StoreCustomer.findByPk(customerId, {
      attributes: {
        exclude: ['password', 'passwordResetToken', 'emailVerificationToken']
      },
      include: [
        {
          model: db.StoreOrder,
          as: 'orders',
          include: [
            {
              model: db.StoreOrderItem,
              as: 'items'
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    return customer;
  },

  /**
   * Actualizar cliente
   */
  async updateCustomer(customerId, updates) {
    const customer = await db.StoreCustomer.findByPk(customerId);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    await customer.update(updates);

    const { password, passwordResetToken, emailVerificationToken, ...customerWithoutSensitive } = customer.toJSON();

    return customerWithoutSensitive;
  },

  /**
   * Eliminar cliente (soft delete cambiando status)
   */
  async deleteCustomer(customerId) {
    const customer = await db.StoreCustomer.findByPk(customerId);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    // Soft delete: cambiar status a inactive
    await customer.update({ status: 'inactive' });

    return { message: 'Cliente desactivado correctamente' };
  },

  /**
   * Obtener historial de compras de un cliente
   */
  async getCustomerPurchaseHistory(customerId, filters = {}) {
    const where = { customerId };

    if (filters.status) {
      where.status = filters.status;
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

    const orders = await db.StoreOrder.findAll({
      where,
      include: [
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
   * Obtener estadísticas de un cliente
   */
  async getCustomerStats(customerId) {
    const customer = await db.StoreCustomer.findByPk(customerId);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    // Contar órdenes por estado
    const orderStats = await db.StoreOrder.findAll({
      where: { customerId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('total')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    });

    // Productos más comprados
    const topProducts = await db.StoreOrderItem.findAll({
      include: [
        {
          model: db.StoreOrder,
          as: 'order',
          where: {
            customerId,
            status: 'completed'
          },
          attributes: []
        }
      ],
      attributes: [
        'productType',
        'productName',
        [db.sequelize.fn('COUNT', db.sequelize.col('StoreOrderItem.id')), 'purchaseCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalQuantity']
      ],
      group: ['productType', 'productName'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('StoreOrderItem.id')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Gasto por mes (últimos 12 meses)
    const monthlySpending = await db.StoreOrder.findAll({
      where: {
        customerId,
        status: 'completed',
        createdAt: {
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 12))
        }
      },
      attributes: [
        [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [db.sequelize.fn('SUM', db.sequelize.col('total')), 'totalSpent'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount']
      ],
      group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('createdAt'), '%Y-%m')],
      order: [[db.sequelize.fn('DATE_FORMAT', db.sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
      raw: true
    });

    return {
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        totalPurchases: customer.totalPurchases,
        totalSpent: customer.totalSpent,
        lastPurchaseAt: customer.lastPurchaseAt
      },
      orderStats,
      topProducts,
      monthlySpending
    };
  },

  /**
   * Verificar email
   */
  async verifyEmail(token) {
    const customer = await db.StoreCustomer.findOne({
      where: { emailVerificationToken: token }
    });

    if (!customer) {
      throw new Error('Token de verificación inválido');
    }

    await customer.update({
      emailVerified: true,
      emailVerificationToken: null
    });

    return { message: 'Email verificado correctamente' };
  },

  /**
   * Buscar cliente por email
   */
  async findByEmail(email) {
    const customer = await db.StoreCustomer.findOne({
      where: { email },
      attributes: {
        exclude: ['password', 'passwordResetToken', 'emailVerificationToken']
      }
    });

    return customer;
  },

  /**
   * Actualizar última compra
   */
  async updateLastPurchase(customerId, orderTotal) {
    const customer = await db.StoreCustomer.findByPk(customerId);

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    await customer.update({
      totalPurchases: customer.totalPurchases + 1,
      totalSpent: parseFloat(customer.totalSpent) + parseFloat(orderTotal),
      lastPurchaseAt: new Date()
    });

    return customer;
  },

  /**
   * Obtener clientes top (por gasto)
   */
  async getTopCustomers(limit = 10) {
    const customers = await db.StoreCustomer.findAll({
      where: { status: 'active' },
      attributes: {
        exclude: ['password', 'passwordResetToken', 'emailVerificationToken']
      },
      order: [['totalSpent', 'DESC']],
      limit
    });

    return customers;
  }
};

module.exports = storeCustomerService;
