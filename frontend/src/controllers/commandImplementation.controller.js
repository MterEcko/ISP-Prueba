// backend/src/controllers/commandImplementation.controller.js
const db = require('../models');
const CommandImplementation = db.CommandImplementation;
const CommonCommand = db.CommonCommand;
const DeviceBrand = db.DeviceBrand;
const DeviceFamily = db.DeviceFamily;
const CommandParameter = db.CommandParameter;
const Device = db.Device;
const DeviceCredential = db.DeviceCredential;
const CommandHistory = db.CommandHistory;
const Op = db.Sequelize.Op;
const logger = require('../utils/logger');

// Servicio para pruebas de comandos
const DeviceCommandService = require('../services/deviceCommand.service');

// Obtener todas las implementaciones de comandos
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, brandId, familyId, commonCommandId, type, active } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (brandId) condition.brandId = brandId;
    if (familyId) condition.familyId = familyId;
    if (commonCommandId) condition.commonCommandId = commonCommandId;
    if (type) condition.type = type;
    if (active !== undefined) condition.active = active === 'true';

    const { count, rows: implementations } = await CommandImplementation.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['command', 'category'], ['brand', 'name'], ['family', 'name']]
    });

    return res.json({
      totalItems: count,
      implementations,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    logger.error('Error finding command implementations:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones de comandos",
      error: error.message
    });
  }
};

// Obtener implementaciones por marca
exports.findByBrand = async (req, res) => {
  try {
    const brandId = req.params.brandId;
    const { active, type } = req.query;

    const condition = { brandId: brandId };
    if (active !== undefined) condition.active = active === 'true';
    if (type) condition.type = type;

    const implementations = await CommandImplementation.findAll({
      where: condition,
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['command', 'category'], ['command', 'name']]
    });

    return res.json({
      brandId: brandId,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error finding implementations by brand:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones por marca",
      error: error.message
    });
  }
};

// Obtener implementaciones por familia
exports.findByFamily = async (req, res) => {
  try {
    const familyId = req.params.familyId;
    const { active, type } = req.query;

    const condition = { familyId: familyId };
    if (active !== undefined) condition.active = active === 'true';
    if (type) condition.type = type;

    const implementations = await CommandImplementation.findAll({
      where: condition,
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name']
        }
      ],
      order: [['command', 'category'], ['command', 'name']]
    });

    return res.json({
      familyId: familyId,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error finding implementations by family:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones por familia",
      error: error.message
    });
  }
};

// Obtener implementaciones por comando común
exports.findByCommand = async (req, res) => {
  try {
    const commonCommandId = req.params.commonCommandId;
    const { active, brandId } = req.query;

    const condition = { commonCommandId: commonCommandId };
    if (active !== undefined) condition.active = active === 'true';
    if (brandId) condition.brandId = brandId;

    const implementations = await CommandImplementation.findAll({
      where: condition,
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['brand', 'name'], ['family', 'name']]
    });

    return res.json({
      commonCommandId: commonCommandId,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error finding implementations by command:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones por comando",
      error: error.message
    });
  }
};

// Obtener una implementación específica por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const implementation = await CommandImplementation.findByPk(id, {
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category', 'requiresConfirmation', 'affectsService']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: CommandParameter,
          as: 'parameters',
          order: [['order', 'ASC']]
        }
      ]
    });

    if (!implementation) {
      return res.status(404).json({
        message: `Implementación de comando con ID ${id} no encontrada`
      });
    }

    return res.json(implementation);

  } catch (error) {
    logger.error('Error finding command implementation:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementación de comando",
      error: error.message
    });
  }
};

// Crear nueva implementación de comando
exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { 
      commonCommandId,
      brandId,
      familyId,
      type,
      implementation,
      parameterConfig = {},
      script,
      expectedResponse,
      errorHandling = {},
      parameters = []
    } = req.body;

    if (!commonCommandId || !brandId || !type || !implementation) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Los campos commonCommandId, brandId, type e implementation son obligatorios"
      });
    }

    // Validar que el comando común existe
    const command = await CommonCommand.findByPk(commonCommandId);
    if (!command) {
      await transaction.rollback();
      return res.status(400).json({
        message: "El comando común especificado no existe"
      });
    }

    // Validar que la marca existe
    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      await transaction.rollback();
      return res.status(400).json({
        message: "La marca especificada no existe"
      });
    }

    // Validar familia si se proporciona
    if (familyId) {
      const family = await DeviceFamily.findByPk(familyId);
      if (!family || family.brandId !== parseInt(brandId)) {
        await transaction.rollback();
        return res.status(400).json({
          message: "La familia especificada no existe o no pertenece a la marca indicada"
        });
      }
    }

    // Verificar si ya existe una implementación similar
    const existingImplementation = await CommandImplementation.findOne({
      where: {
        commonCommandId,
        brandId,
        familyId: familyId || null,
        type
      }
    });

    if (existingImplementation) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Ya existe una implementación similar para esta combinación"
      });
    }

    // Validar tipo de implementación
    const validTypes = ['SSH', 'SNMP', 'API'];
    if (!validTypes.includes(type)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Tipo de implementación inválido. Debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    // Crear la implementación
    const newImplementation = await CommandImplementation.create({
      commonCommandId,
      brandId,
      familyId: familyId || null,
      type,
      implementation,
      parameterConfig,
      script,
      expectedResponse,
      errorHandling,
      active: true
    }, { transaction });

    // Crear parámetros si se proporcionan
    if (parameters && parameters.length > 0) {
      const parametersData = parameters.map((param, index) => ({
        implementationId: newImplementation.id,
        name: param.name,
        type: param.type || 'string',
        description: param.description,
        defaultValue: param.defaultValue,
        required: param.required || false,
        validation: param.validation,
        order: param.order || index
      }));

      await CommandParameter.bulkCreate(parametersData, { transaction });
    }

    await transaction.commit();

    // Obtener la implementación completa
    const implementationWithDetails = await CommandImplementation.findByPk(newImplementation.id, {
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: CommandParameter,
          as: 'parameters'
        }
      ]
    });

    return res.status(201).json({
      message: "Implementación de comando creada exitosamente",
      implementation: implementationWithDetails
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating command implementation:', error.message);
    return res.status(500).json({
      message: "Error al crear implementación de comando",
      error: error.message
    });
  }
};

// Actualizar implementación de comando
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    // Remover campos que no deben actualizarse directamente
    delete updateData.commonCommandId;
    delete updateData.brandId;
    delete updateData.familyId;

    const [updated] = await CommandImplementation.update(updateData, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({
        message: `Implementación de comando con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Implementación de comando actualizada exitosamente"
    });

  } catch (error) {
    logger.error('Error updating command implementation:', error.message);
    return res.status(500).json({
      message: "Error al actualizar implementación de comando",
      error: error.message
    });
  }
};

// Activar/desactivar implementación
exports.toggleActive = async (req, res) => {
  try {
    const id = req.params.id;

    const implementation = await CommandImplementation.findByPk(id);
    if (!implementation) {
      return res.status(404).json({
        message: `Implementación de comando con ID ${id} no encontrada`
      });
    }

    await implementation.update({ active: !implementation.active });

    return res.json({
      message: `Implementación ${implementation.active ? 'activada' : 'desactivada'} exitosamente`,
      active: implementation.active
    });

  } catch (error) {
    logger.error('Error toggling command implementation:', error.message);
    return res.status(500).json({
      message: "Error al cambiar estado de la implementación",
      error: error.message
    });
  }
};

// Eliminar implementación
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await CommandImplementation.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({
        message: `Implementación de comando con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Implementación de comando eliminada exitosamente"
    });

  } catch (error) {
    logger.error('Error deleting command implementation:', error.message);
    return res.status(500).json({
      message: "Error al eliminar implementación de comando",
      error: error.message
    });
  }
};

// Obtener parámetros de una implementación
exports.getParameters = async (req, res) => {
  try {
    const implementationId = req.params.id;

    const implementation = await CommandImplementation.findByPk(implementationId);
    if (!implementation) {
      return res.status(404).json({
        message: `Implementación con ID ${implementationId} no encontrada`
      });
    }

    const parameters = await CommandParameter.findAll({
      where: { implementationId: implementationId },
      order: [['order', 'ASC'], ['name', 'ASC']]
    });

    return res.json({
      implementationId: implementationId,
      parameters: parameters
    });

  } catch (error) {
    logger.error('Error getting implementation parameters:', error.message);
    return res.status(500).json({
      message: "Error al obtener parámetros de la implementación",
      error: error.message
    });
  }
};

// Probar una implementación específica en un dispositivo
exports.testImplementation = async (req, res) => {
  try {
    const implementationId = req.params.id;
    const { deviceId, parameters = {} } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        message: "Se requiere especificar deviceId"
      });
    }

    // Obtener implementación
    const implementation = await CommandImplementation.findByPk(implementationId, {
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['name']
        }
      ]
    });

    if (!implementation) {
      return res.status(404).json({
        message: `Implementación con ID ${implementationId} no encontrada`
      });
    }

    // Obtener dispositivo
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }

    // Obtener credenciales
    const credentials = await DeviceCredential.findOne({
      where: { deviceId: deviceId, isActive: true }
    });

    if (!credentials) {
      return res.status(404).json({
        message: "No se encontraron credenciales activas para el dispositivo"
      });
    }

    // Ejecutar comando usando el servicio
    const result = await DeviceCommandService.executeCommand(
      deviceId,
      implementation.command.name,
      parameters,
      req.userId
    );

    return res.json({
      implementationId: implementationId,
      deviceId: deviceId,
      commandName: implementation.command.name,
      testResult: result
    });

  } catch (error) {
    logger.error('Error testing implementation:', error.message);
    return res.status(500).json({
      message: "Error al probar implementación",
      error: error.message
    });
  }
};

// Obtener estadísticas de éxito de una implementación
exports.getStats = async (req, res) => {
  try {
    const implementationId = req.params.id;
    const { days = 30 } = req.query;

    const implementation = await CommandImplementation.findByPk(implementationId, {
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['name']
        }
      ]
    });

    if (!implementation) {
      return res.status(404).json({
        message: `Implementación con ID ${implementationId} no encontrada`
      });
    }

    // Calcular fecha de inicio para estadísticas
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Obtener estadísticas del historial de comandos
    const stats = await CommandHistory.findAll({
      where: {
        command: implementation.command.name,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [db.sequelize.fn('COUNT', '*'), 'totalExecutions'],
        [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN success = true THEN 1 ELSE 0 END')), 'successfulExecutions'],
        [db.sequelize.fn('AVG', db.sequelize.col('executionTime')), 'avgExecutionTime']
      ],
      raw: true
    });

    const totalExecutions = parseInt(stats[0].totalExecutions) || 0;
    const successfulExecutions = parseInt(stats[0].successfulExecutions) || 0;
    const avgExecutionTime = parseFloat(stats[0].avgExecutionTime) || 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Obtener errores más comunes
    const commonErrors = await CommandHistory.findAll({
      where: {
        command: implementation.command.name,
        success: false,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'error',
        [db.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['error'],
      order: [[db.sequelize.literal('count'), 'DESC']],
      limit: 5,
      raw: true
    });

    return res.json({
      implementationId: implementationId,
      commandName: implementation.command.name,
      period: `${days} días`,
      statistics: {
        totalExecutions,
        successfulExecutions,
        failedExecutions: totalExecutions - successfulExecutions,
        successRate: Math.round(successRate * 100) / 100,
        avgExecutionTime: Math.round(avgExecutionTime * 100) / 100
      },
      commonErrors: commonErrors
    });

  } catch (error) {
    logger.error('Error getting implementation stats:', error.message);
    return res.status(500).json({
      message: "Error al obtener estadísticas de la implementación",
      error: error.message
    });
  }
};

// Buscar implementaciones disponibles para un dispositivo específico
exports.getAvailableForDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }

    // Buscar marca en el sistema moderno
    const brand = await DeviceBrand.findOne({
      where: { name: device.brand.toLowerCase() }
    });

    if (!brand) {
      return res.status(404).json({
        message: `No se encontró la marca ${device.brand} en el sistema de comandos`
      });
    }

    // Buscar familia si el dispositivo tiene una
    let familyId = null;
    if (device.familyId) {
      const family = await DeviceFamily.findByPk(device.familyId);
      if (family && family.brandId === brand.id) {
        familyId = family.id;
      }
    }

    // Buscar implementaciones disponibles
    const condition = {
      brandId: brand.id,
      active: true
    };

    // Si hay familia específica, buscar implementaciones específicas de familia o generales de marca
    const implementations = await CommandImplementation.findAll({
      where: {
        [Op.or]: [
          { ...condition, familyId: familyId },
          { ...condition, familyId: null }
        ]
      },
      include: [
        {
          model: CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category', 'requiresConfirmation', 'affectsService', 'permissionLevel']
        },
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: CommandParameter,
          as: 'parameters',
          order: [['order', 'ASC']]
        }
      ],
      order: [['command', 'category'], ['command', 'name']]
    });

    // Agrupar por categoría
    const categorizedImplementations = implementations.reduce((acc, impl) => {
      const category = impl.command.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(impl);
      return acc;
    }, {});

    return res.json({
      deviceId: deviceId,
      deviceName: device.name,
      deviceBrand: device.brand,
      deviceType: device.type,
      brandId: brand.id,
      familyId: familyId,
      totalImplementations: implementations.length,
      implementationsByCategory: categorizedImplementations,
      allImplementations: implementations
    });

  } catch (error) {
    logger.error('Error getting available implementations for device:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones disponibles para el dispositivo",
      error: error.message
    });
  }
};