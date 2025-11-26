const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { authJwt } = require('../middleware');
const { verifyToken, isAdmin, isAdminOrManager } = authJwt;

// Generar nóminas mensuales automáticamente
router.post('/generate-monthly',
  [verifyToken, isAdmin],
  payrollController.generateMonthlyPayrolls
);

// Crear nómina individual
router.post('/',
  [verifyToken, isAdminOrManager],
  payrollController.createPayroll
);

// Listar nóminas con filtros
router.get('/',
  [verifyToken],
  payrollController.getPayrolls
);

// Obtener resumen de nómina
router.get('/summary/totals',
  [verifyToken, isAdminOrManager],
  payrollController.getPayrollSummary
);

// Obtener nóminas de un empleado específico
router.get('/employee/:userId',
  [verifyToken],
  payrollController.getEmployeePayrolls
);

// Obtener nómina por ID
router.get('/:id',
  [verifyToken],
  payrollController.getPayrollById
);

// Actualizar nómina
router.put('/:id',
  [verifyToken, isAdminOrManager],
  payrollController.updatePayroll
);

// Eliminar nómina
router.delete('/:id',
  [verifyToken, isAdmin],
  payrollController.deletePayroll
);

// Registrar pago de nómina
router.post('/:id/pay',
  [verifyToken, isAdminOrManager],
  payrollController.payPayroll
);

// Cancelar nómina
router.post('/:id/cancel',
  [verifyToken, isAdmin],
  payrollController.cancelPayroll
);

module.exports = router;
