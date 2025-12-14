const db = require('../models');
const logger = require('../config/logger');
const { ServicePackage, Plugin, PluginPackage, Customer } = db;

/**
 * Crear nuevo paquete de servicio
 */
exports.createPackage = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      longDescription,
      price,
      currency,
      isFree,
      clientLimit,
      userLimit,
      branchLimit,
      features,
      billingCycle,
      displayOrder,
      featuresEnabled,
      metadata
    } = req.body;

    // Validaciones
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del paquete es requerido'
      });
    }

    // Generar slug si no se proporciona
    const packageSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Verificar si ya existe un paquete con el mismo nombre o slug
    const existingPackage = await ServicePackage.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { name },
          { slug: packageSlug }
        ]
      }
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un paquete con ese nombre o slug'
      });
    }

    const servicePackage = await ServicePackage.create({
      name,
      slug: packageSlug,
      description,
      longDescription,
      price: price || 0,
      currency: currency || 'USD',
      isFree: isFree !== undefined ? isFree : price === 0,
      clientLimit,
      userLimit,
      branchLimit: branchLimit || 1,
      features: features || [],
      billingCycle: billingCycle || 'monthly',
      displayOrder: displayOrder || 0,
      featuresEnabled: featuresEnabled || {},
      metadata: metadata || {},
      status: 'active'
    });

    logger.info(`Paquete creado: ${name}`);

    res.status(201).json({
      success: true,
      data: servicePackage,
      message: 'Paquete creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creando paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener todos los paquetes
 */
exports.getAllPackages = async (req, res) => {
  try {
    const { status, includePlugins } = req.query;

    const where = {};
    if (status) where.status = status;

    const include = [];

    // Incluir plugins si se solicita
    if (includePlugins === 'true') {
      include.push({
        model: Plugin,
        as: 'plugins',
        through: {
          attributes: ['isFree', 'isEnabled', 'additionalPrice', 'credentials', 'configuration']
        }
      });
    }

    const packages = await ServicePackage.findAll({
      where,
      include,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: packages,
      count: packages.length
    });
  } catch (error) {
    logger.error('Error obteniendo paquetes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener un paquete por ID
 */
exports.getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const servicePackage = await ServicePackage.findByPk(id, {
      include: [
        {
          model: Plugin,
          as: 'plugins',
          through: {
            attributes: ['isFree', 'isEnabled', 'additionalPrice', 'credentials', 'configuration']
          }
        }
      ]
    });

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      data: servicePackage
    });
  } catch (error) {
    logger.error('Error obteniendo paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Actualizar paquete
 */
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const servicePackage = await ServicePackage.findByPk(id);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    await servicePackage.update(updates);

    logger.info(`Paquete actualizado: ${servicePackage.name}`);

    res.json({
      success: true,
      data: servicePackage,
      message: 'Paquete actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error actualizando paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Eliminar paquete
 */
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const servicePackage = await ServicePackage.findByPk(id);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Verificar si hay clientes usando este paquete
    const customersCount = await Customer.count({
      where: { servicePackageId: id }
    });

    if (customersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el paquete. Hay ${customersCount} cliente(s) usando este paquete.`
      });
    }

    await servicePackage.destroy();

    logger.info(`Paquete eliminado: ${servicePackage.name}`);

    res.json({
      success: true,
      message: 'Paquete eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Agregar plugin a un paquete
 */
exports.addPluginToPackage = async (req, res) => {
  try {
    const { id } = req.params; // ID del paquete
    const {
      pluginId,
      isFree,
      isEnabled,
      credentials,
      configuration,
      additionalPrice
    } = req.body;

    if (!pluginId) {
      return res.status(400).json({
        success: false,
        message: 'pluginId es requerido'
      });
    }

    // Verificar que el paquete existe
    const servicePackage = await ServicePackage.findByPk(id);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Verificar que el plugin existe
    const plugin = await Plugin.findByPk(pluginId);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: 'Plugin no encontrado'
      });
    }

    // Verificar si ya existe la relación
    const existingRelation = await PluginPackage.findOne({
      where: {
        pluginId,
        servicePackageId: id
      }
    });

    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: 'Este plugin ya está asignado a este paquete'
      });
    }

    // Crear la relación
    const pluginPackage = await PluginPackage.create({
      pluginId,
      servicePackageId: id,
      isFree: isFree !== undefined ? isFree : true,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      credentials: credentials || {},
      configuration: configuration || {},
      additionalPrice: additionalPrice || 0
    });

    logger.info(`Plugin ${plugin.name} agregado al paquete ${servicePackage.name}`);

    res.status(201).json({
      success: true,
      data: pluginPackage,
      message: 'Plugin agregado al paquete exitosamente'
    });
  } catch (error) {
    logger.error('Error agregando plugin a paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Actualizar configuración de plugin en un paquete
 */
exports.updatePluginInPackage = async (req, res) => {
  try {
    const { id, pluginId } = req.params;
    const updates = req.body;

    const pluginPackage = await PluginPackage.findOne({
      where: {
        servicePackageId: id,
        pluginId
      }
    });

    if (!pluginPackage) {
      return res.status(404).json({
        success: false,
        message: 'Relación plugin-paquete no encontrada'
      });
    }

    await pluginPackage.update(updates);

    logger.info(`Configuración de plugin actualizada en paquete`);

    res.json({
      success: true,
      data: pluginPackage,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error actualizando configuración de plugin:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Remover plugin de un paquete
 */
exports.removePluginFromPackage = async (req, res) => {
  try {
    const { id, pluginId } = req.params;

    const pluginPackage = await PluginPackage.findOne({
      where: {
        servicePackageId: id,
        pluginId
      }
    });

    if (!pluginPackage) {
      return res.status(404).json({
        success: false,
        message: 'Relación plugin-paquete no encontrada'
      });
    }

    await pluginPackage.destroy();

    logger.info(`Plugin removido del paquete`);

    res.json({
      success: true,
      message: 'Plugin removido del paquete exitosamente'
    });
  } catch (error) {
    logger.error('Error removiendo plugin del paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener todos los plugins disponibles para un paquete
 */
exports.getPackagePlugins = async (req, res) => {
  try {
    const { id } = req.params;

    const servicePackage = await ServicePackage.findByPk(id, {
      include: [
        {
          model: Plugin,
          as: 'plugins',
          through: {
            attributes: ['id', 'isFree', 'isEnabled', 'additionalPrice', 'credentials', 'configuration']
          }
        }
      ]
    });

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      data: servicePackage.plugins || [],
      count: servicePackage.plugins ? servicePackage.plugins.length : 0
    });
  } catch (error) {
    logger.error('Error obteniendo plugins del paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener clientes de un paquete
 */
exports.getPackageCustomers = async (req, res) => {
  try {
    const { id } = req.params;

    const servicePackage = await ServicePackage.findByPk(id);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    const customers = await Customer.findAll({
      where: { servicePackageId: id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error) {
    logger.error('Error obteniendo clientes del paquete:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
