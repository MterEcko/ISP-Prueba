// backend/src/routes/employeeConfig.routes.js
const express = require('express');
const router = express.Router();
const employeeConfigController = require('../controllers/employeeConfig.controller');
const { authJwt } = require('../middleware');

// Obtener todas las configuraciones de empleados
router.get(
  '/',
  [authJwt.verifyToken, authJwt.checkPermission('view_payroll')],
  employeeConfigController.getAllEmployeeConfigs
);

// Obtener configuración de un empleado
router.get(
  '/:employeeId',
  [authJwt.verifyToken, authJwt.checkPermission('view_payroll')],
  employeeConfigController.getEmployeeConfig
);

// Crear o actualizar configuración de empleado
router.put(
  '/:employeeId',
  [authJwt.verifyToken, authJwt.checkPermission('manage_payroll')],
  employeeConfigController.upsertEmployeeConfig
);

// Eliminar configuración de empleado
router.delete(
  '/:employeeId',
  [authJwt.verifyToken, authJwt.checkPermission('manage_payroll')],
  employeeConfigController.deleteEmployeeConfig
);

// Calcular salario para un período
router.get(
  '/:employeeId/calculate',
  [authJwt.verifyToken, authJwt.checkPermission('view_payroll')],
  employeeConfigController.calculateSalary
);

module.exports = router;
