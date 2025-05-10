// src/routes/billing.routes.js
const { authJwt } = require("../middleware");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para facturación - Actualmente solo retornan estructuras básicas para probar el frontend
  app.get(
    "/api/billing/invoices",
    [authJwt.verifyToken],
    (req, res) => {
      // Datos simulados para pruebas
      res.status(200).json({
        invoices: [
          {
            id: 1,
            number: 'F-2023-001',
            clientId: 1,
            clientName: 'Juan Pérez',
            date: '2023-05-01',
            dueDate: '2023-05-15',
            amount: 299.99,
            status: 'paid',
            paymentDate: '2023-05-10',
            paymentMethod: 'transfer'
          },
          {
            id: 2,
            number: 'F-2023-002',
            clientId: 2,
            clientName: 'María González',
            date: '2023-05-01',
            dueDate: '2023-05-15',
            amount: 399.99,
            status: 'pending',
            paymentDate: null,
            paymentMethod: null
          },
          {
            id: 3,
            number: 'F-2023-003',
            clientId: 3,
            clientName: 'Carlos Rodríguez',
            date: '2023-05-01',
            dueDate: '2023-05-15',
            amount: 599.99,
            status: 'overdue',
            paymentDate: null,
            paymentMethod: null
          }
        ],
        totalItems: 3,
        currentPage: 1,
        totalPages: 1
      });
    }
  );

  app.get(
    "/api/billing/payments",
    [authJwt.verifyToken],
    (req, res) => {
      // Datos simulados para pruebas
      res.status(200).json({
        payments: [
          {
            id: 1,
            invoiceId: 1,
            clientId: 1,
            clientName: 'Juan Pérez',
            date: '2023-05-10',
            amount: 299.99,
            method: 'transfer',
            reference: 'TR123456',
            notes: 'Pago del mes de mayo'
          }
        ],
        totalItems: 1,
        currentPage: 1,
        totalPages: 1
      });
    }
  );
}