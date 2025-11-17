const storeCustomerService = require('../services/storeCustomer.service');
const storeOrderService = require('../services/storeOrder.service');

// ===== CUSTOMERS =====

/**
 * Obtener todos los clientes
 */
exports.getCustomers = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      country: req.query.country,
      emailVerified: req.query.emailVerified,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await storeCustomerService.getAllCustomers(filters);

    res.json({
      success: true,
      data: result.customers,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: filters.limit
      }
    });
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
};

/**
 * Obtener cliente por ID
 */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await storeCustomerService.getCustomerById(req.params.id);

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Crear nuevo cliente
 */
exports.createCustomer = async (req, res) => {
  try {
    const customer = await storeCustomerService.createCustomer(req.body);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Cliente creado correctamente'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      message: 'Error al crear cliente',
      error: error.message
    });
  }
};

/**
 * Actualizar cliente
 */
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await storeCustomerService.updateCustomer(req.params.id, req.body);

    res.json({
      success: true,
      data: customer,
      message: 'Cliente actualizado correctamente'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Eliminar cliente
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const result = await storeCustomerService.deleteCustomer(req.params.id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener historial de compras de un cliente
 */
exports.getCustomerPurchases = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await storeCustomerService.getCustomerPurchaseHistory(req.params.id, filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: filters.limit
      }
    });
  } catch (error) {
    console.error('Error getting customer purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de compras',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de un cliente
 */
exports.getCustomerStats = async (req, res) => {
  try {
    const stats = await storeCustomerService.getCustomerStats(req.params.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del cliente',
      error: error.message
    });
  }
};

/**
 * Obtener clientes top
 */
exports.getTopCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const customers = await storeCustomerService.getTopCustomers(limit);

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Error getting top customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes top',
      error: error.message
    });
  }
};

// ===== ORDERS =====

/**
 * Obtener todas las órdenes
 */
exports.getOrders = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      customerId: req.query.customerId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await storeOrderService.getAllOrders(filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: filters.limit
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes',
      error: error.message
    });
  }
};

/**
 * Obtener orden por ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await storeOrderService.getOrderById(req.params.id);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Crear nueva orden
 */
exports.createOrder = async (req, res) => {
  try {
    const { customerId, ...orderData } = req.body;
    const order = await storeOrderService.createOrder(customerId, orderData);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Orden creada correctamente'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({
      success: false,
      message: 'Error al crear orden',
      error: error.message
    });
  }
};

/**
 * Actualizar estado de orden
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, ...updates } = req.body;
    const order = await storeOrderService.updateOrderStatus(req.params.id, status, updates);

    res.json({
      success: true,
      data: order,
      message: 'Estado de orden actualizado correctamente'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Procesar pago de orden
 */
exports.processPayment = async (req, res) => {
  try {
    const order = await storeOrderService.processPayment(req.params.id, req.body);

    res.json({
      success: true,
      data: order,
      message: 'Pago procesado correctamente'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Cancelar orden
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await storeOrderService.cancelOrder(req.params.id, reason);

    res.json({
      success: true,
      data: order,
      message: 'Orden cancelada correctamente'
    });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reembolsar orden
 */
exports.refundOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await storeOrderService.refundOrder(req.params.id, reason);

    res.json({
      success: true,
      data: order,
      message: 'Orden reembolsada correctamente'
    });
  } catch (error) {
    console.error('Error refunding order:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener estadísticas de ventas
 */
exports.getSalesStats = async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const stats = await storeOrderService.getSalesStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting sales stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de ventas',
      error: error.message
    });
  }
};
