const express = require('express');
const router = express.Router();
const servicePackageController = require('../controllers/servicePackage.controller');

/**
 * @route POST /api/service-packages
 * @desc Crear nuevo paquete de servicio
 * @body { name, slug?, description, longDescription?, price, currency?, isFree?, clientLimit?, userLimit?, branchLimit?, features?, billingCycle?, displayOrder?, featuresEnabled?, metadata? }
 */
router.post('/', servicePackageController.createPackage);

/**
 * @route GET /api/service-packages
 * @desc Obtener todos los paquetes
 * @query status? - Filtrar por estado (active, inactive, deprecated)
 * @query includePlugins? - Incluir plugins del paquete (true/false)
 */
router.get('/', servicePackageController.getAllPackages);

/**
 * @route GET /api/service-packages/:id
 * @desc Obtener un paquete por ID (incluye plugins)
 */
router.get('/:id', servicePackageController.getPackageById);

/**
 * @route PUT /api/service-packages/:id
 * @desc Actualizar paquete
 * @body Campos a actualizar
 */
router.put('/:id', servicePackageController.updatePackage);

/**
 * @route DELETE /api/service-packages/:id
 * @desc Eliminar paquete
 */
router.delete('/:id', servicePackageController.deletePackage);

/**
 * @route POST /api/service-packages/:id/plugins
 * @desc Agregar plugin a un paquete
 * @body { pluginId, isFree?, isEnabled?, credentials?, configuration?, additionalPrice? }
 */
router.post('/:id/plugins', servicePackageController.addPluginToPackage);

/**
 * @route GET /api/service-packages/:id/plugins
 * @desc Obtener plugins de un paquete
 */
router.get('/:id/plugins', servicePackageController.getPackagePlugins);

/**
 * @route PUT /api/service-packages/:id/plugins/:pluginId
 * @desc Actualizar configuración de plugin en un paquete
 * @body { isFree?, isEnabled?, credentials?, configuration?, additionalPrice? }
 */
router.put('/:id/plugins/:pluginId', servicePackageController.updatePluginInPackage);

/**
 * @route DELETE /api/service-packages/:id/plugins/:pluginId
 * @desc Remover plugin de un paquete
 */
router.delete('/:id/plugins/:pluginId', servicePackageController.removePluginFromPackage);

/**
 * @route GET /api/service-packages/:id/customers
 * @desc Obtener clientes de un paquete
 */
router.get('/:id/customers', servicePackageController.getPackageCustomers);

module.exports = router;
