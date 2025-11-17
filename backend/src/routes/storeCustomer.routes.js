const storeCustomerController = require('../controllers/storeCustomer.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // === CUSTOMERS ===
  app.get('/api/store/customers', [authJwt.verifyToken], storeCustomerController.getCustomers);
  app.get('/api/store/customers/top', [authJwt.verifyToken], storeCustomerController.getTopCustomers);
  app.get('/api/store/customers/:id', [authJwt.verifyToken], storeCustomerController.getCustomerById);
  app.post('/api/store/customers', [authJwt.verifyToken], storeCustomerController.createCustomer);
  app.put('/api/store/customers/:id', [authJwt.verifyToken], storeCustomerController.updateCustomer);
  app.delete('/api/store/customers/:id', [authJwt.verifyToken], storeCustomerController.deleteCustomer);
  app.get('/api/store/customers/:id/purchases', [authJwt.verifyToken], storeCustomerController.getCustomerPurchases);
  app.get('/api/store/customers/:id/stats', [authJwt.verifyToken], storeCustomerController.getCustomerStats);
  
  // === ORDERS ===
  app.get('/api/store/orders', [authJwt.verifyToken], storeCustomerController.getOrders);
  app.get('/api/store/orders/:id', [authJwt.verifyToken], storeCustomerController.getOrderById);
  app.post('/api/store/orders', [authJwt.verifyToken], storeCustomerController.createOrder);
  app.put('/api/store/orders/:id/status', [authJwt.verifyToken], storeCustomerController.updateOrderStatus);
  app.post('/api/store/orders/:id/payment', [authJwt.verifyToken], storeCustomerController.processPayment);
  app.post('/api/store/orders/:id/cancel', [authJwt.verifyToken], storeCustomerController.cancelOrder);
  app.post('/api/store/orders/:id/refund', [authJwt.verifyToken], storeCustomerController.refundOrder);
  
  // === SALES ===
  app.get('/api/store/sales/stats', [authJwt.verifyToken], storeCustomerController.getSalesStats);
};
