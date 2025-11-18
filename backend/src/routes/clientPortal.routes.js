const express = require('express');
const router = express.Router();
const clientPortalController = require('../controllers/clientPortal.controller');
const { verifyToken } = require('../middleware/authJwt');

// IMPORTANTE: Todas estas rutas requieren que el usuario esté autenticado
// El rol debe ser 'cliente' para acceder al portal

// Dashboard del cliente
router.get('/dashboard',
  [verifyToken],
  clientPortalController.getDashboard
);

// Facturas
router.get('/invoices',
  [verifyToken],
  clientPortalController.getInvoices
);

router.get('/invoices/:id',
  [verifyToken],
  clientPortalController.getInvoiceDetail
);

// Tickets de soporte
router.post('/tickets',
  [verifyToken],
  clientPortalController.createTicket
);

router.get('/tickets',
  [verifyToken],
  clientPortalController.getTickets
);

router.get('/tickets/:id',
  [verifyToken],
  clientPortalController.getTicketDetail
);

router.post('/tickets/:id/comments',
  [verifyToken],
  clientPortalController.addTicketComment
);

// Perfil
router.put('/profile',
  [verifyToken],
  clientPortalController.updateProfile
);

// Estadísticas de uso
router.get('/usage',
  [verifyToken],
  clientPortalController.getUsageStats
);

module.exports = router;
