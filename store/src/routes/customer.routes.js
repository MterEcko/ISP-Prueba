const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');

/**
 * @route POST /api/customers
 * @desc Registrar nuevo cliente (genera licencia y envía por email)
 * @body { name, email, phone?, companyName?, servicePackageId }
 */
router.post('/', customerController.registerCustomer);

/**
 * @route GET /api/customers
 * @desc Obtener todos los clientes
 * @query status? - Filtrar por estado (pending, active, suspended, cancelled)
 * @query servicePackageId? - Filtrar por paquete
 */
router.get('/', customerController.getAllCustomers);

/**
 * @route GET /api/customers/:id
 * @desc Obtener un cliente por ID
 */
router.get('/:id', customerController.getCustomerById);

/**
 * @route PUT /api/customers/:id
 * @desc Actualizar cliente
 * @body Campos a actualizar (name, phone, companyName, status, etc.)
 */
router.put('/:id', customerController.updateCustomer);

/**
 * @route DELETE /api/customers/:id
 * @desc Eliminar cliente
 */
router.delete('/:id', customerController.deleteCustomer);

/**
 * @route POST /api/customers/:id/resend-license
 * @desc Reenviar licencia por email
 */
router.post('/:id/resend-license', customerController.resendLicense);

module.exports = router;
