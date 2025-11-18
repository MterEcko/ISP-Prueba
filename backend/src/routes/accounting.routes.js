const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting.controller');
const { verifyToken, isAdminOrManager } = require('../middleware/auth.jwt');

// Dashboard financiero general
router.get('/dashboard',
  [verifyToken, isAdminOrManager],
  accountingController.getDashboard
);

// Flujo de efectivo (cash flow)
router.get('/cash-flow',
  [verifyToken, isAdminOrManager],
  accountingController.getCashFlow
);

// Estado de resultados (profit & loss)
router.get('/profit-loss',
  [verifyToken, isAdminOrManager],
  accountingController.getProfitLoss
);

// Balance general (balance sheet)
router.get('/balance-sheet',
  [verifyToken, isAdminOrManager],
  accountingController.getBalanceSheet
);

// Resumen mensual comparativo
router.get('/monthly-summary',
  [verifyToken, isAdminOrManager],
  accountingController.getMonthlySummary
);

module.exports = router;
