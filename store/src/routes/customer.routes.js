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

/**
 * @route POST /api/customers/:id/deactivate-license
 * @desc Desactivar licencia del cliente
 */
router.post('/:id/deactivate-license', customerController.deactivateLicense);

/**
 * @route POST /api/customers/:id/renew-license
 * @desc Renovar licencia del cliente
 * @body { duration?: 'monthly' | 'yearly' } - Opcional, usa el del paquete si no se especifica
 */
router.post('/:id/renew-license', customerController.renewLicense);

/**
 * @route POST /api/customers/:id/new-license
 * @desc Crear nueva licencia (desactiva la anterior)
 * @body { servicePackageId?: uuid } - Opcional, usa el mismo paquete si no se especifica
 */
router.post('/:id/new-license', customerController.createNewLicense);

module.exports = router;
