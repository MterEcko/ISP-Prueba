const express = require('express');
const router = express.Router();
const storeCustomerController = require('../controllers/storeCustomer.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación (admin del Store)
router.use(authenticate);

// ===== CUSTOMERS =====
router.get('/customers', storeCustomerController.getCustomers);
router.get('/customers/top', storeCustomerController.getTopCustomers);
router.get('/customers/:id', storeCustomerController.getCustomerById);
router.post('/customers', storeCustomerController.createCustomer);
router.put('/customers/:id', storeCustomerController.updateCustomer);
router.delete('/customers/:id', storeCustomerController.deleteCustomer);

// Historial y estadísticas de clientes
router.get('/customers/:id/purchases', storeCustomerController.getCustomerPurchases);
router.get('/customers/:id/stats', storeCustomerController.getCustomerStats);

// ===== ORDERS =====
router.get('/orders', storeCustomerController.getOrders);
router.get('/orders/:id', storeCustomerController.getOrderById);
router.post('/orders', storeCustomerController.createOrder);
router.put('/orders/:id/status', storeCustomerController.updateOrderStatus);

// Procesamiento de pagos y reembolsos
router.post('/orders/:id/payment', storeCustomerController.processPayment);
router.post('/orders/:id/cancel', storeCustomerController.cancelOrder);
router.post('/orders/:id/refund', storeCustomerController.refundOrder);

// Estadísticas de ventas
router.get('/sales/stats', storeCustomerController.getSalesStats);

module.exports = router;
