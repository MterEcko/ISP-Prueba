// backend/src/controllers/commonCommand.controller.js
const db = require('../models');
const CommonCommand = db.CommonCommand;
const CommandImplementation = db.CommandImplementation;
const DeviceBrand = db.DeviceBrand;
const DeviceFamily = db.DeviceFamily;
const Op = db.Sequelize.Op;
const logger = require('../utils/logger');

// Obtener todos los comandos comunes
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, category, permissionLevel } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (category) condition.category = category;
    if (permissionLevel) condition.permissionLevel = permissionLevel;

    const { count, rows: commands } = await CommonCommand.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: CommandImplementation,
          as: 'implementations',
          attributes: ['id', 'brandId', 'familyId', 'type', 'active'],
          include: [
            {
              model: DeviceBrand,
              as: 'brand',
              attributes: ['id', 'name']
            }
          ],
          required: false
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    return res.json({
      totalItems: count,
      commands,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    logger.error('Error finding common commands:', error.message);
    return res.status(500).json({
      message: "Error al obtener comandos comunes",
      error: error.message
    });
  }
};

// Obtener comandos comunes por categoría
exports.findByCategory = async (req, res) => {
  try {
    const category = req.params.category;

    const commands = await CommonCommand.findAll({
      where: { category: category },
      include: [
        {
          model: CommandImplementation,
          as: 'implementations',
          attributes: ['id', 'brandId', 'type', 'active'],
          include: [
            {
              model: DeviceBrand,
              as: 'brand',
              attributes: ['id', 'name']
            }
          ],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.json({
      category: category,
      commands: commands
    });

  } catch (error) {
    logger.error('Error finding commands by category:', error.message);
    return res.status(500).json({
      message: "Error al obtener comandos por categoría",
      error: error.message
    });
  }
};

// Obtener un comando común específico por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const command = await CommonCommand.findByPk(id, {
      include: [
        {
          model: CommandImplementation,
          as: 'implementations',
          include: [
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
          ]
        }
      ]
    });

    if (!command) {
      return res.status(404).json({
        message: `Comando común con ID ${id} no encontrado`
      });
    }

    return res.json(command);

  } catch (error) {
    logger.error('Error finding common command:', error.message);
    return res.status(500).json({
      message: "Error al obtener comando común",
      error: error.message
    });
  }
};

// Crear nuevo comando común
exports.create = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      category, 
      requiresConfirmation = false,
      affectsService = false,
      permissionLevel = 1
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        message: "El nombre y la categoría son obligatorios"
      });
    }

    // Verificar si ya existe un comando con el mismo nombre
    const existingCommand = await CommonCommand.findOne({
      where: { name: name.toLowerCase() }
    });

    if (existingCommand) {
      return res.status(400).json({
        message: "Ya existe un comando con este nombre"
      });
    }

    // Validar categoría
    const validCategories = ['system', 'information', 'maintenance', 'network', 'wireless', 'monitoring', 'diagnostic'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        message: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
      });
    }

    // Validar nivel de permisos
    if (permissionLevel < 1 || permissionLevel > 5) {
      return res.status(400).json({
        message: "El nivel de permisos debe estar entre 1 y 5"
      });
    }

    const command = await CommonCommand.create({
      name: name.toLowerCase(),
      description,
      category,
      requiresConfirmation,
      affectsService,
      permissionLevel
    });

    return res.status(201).json({
      message: "Comando común creado exitosamente",
      command
    });

  } catch (error) {
    logger.error('Error creating common command:', error.message);
    return res.status(500).json({
      message: "Error al crear comando común",
      error: error.message
    });
  }
};

// Actualizar comando común
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    // Si se actualiza el nombre, verificar que no exista otro con el mismo nombre
    if (updateData.name) {
      const existingCommand = await CommonCommand.findOne({
        where: { 
          name: updateData.name.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCommand) {
        return res.status(400).json({
          message: "Ya existe otro comando con este nombre"
        });
      }

      updateData.name = updateData.name.toLowerCase();
    }

    // Validar categoría si se proporciona
    if (updateData.category) {
      const validCategories = ['system', 'information', 'maintenance', 'network', 'wireless', 'monitoring', 'diagnostic'];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({
          message: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
        });
      }
    }

    // Validar nivel de permisos si se proporciona
    if (updateData.permissionLevel && (updateData.permissionLevel < 1 || updateData.permissionLevel > 5)) {
      return res.status(400).json({
        message: "El nivel de permisos debe estar entre 1 y 5"
      });
    }

    const [updated] = await CommonCommand.update(updateData, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({
        message: `Comando común con ID ${id} no encontrado`
      });
    }

    return res.json({
      message: "Comando común actualizado exitosamente"
    });

  } catch (error) {
    logger.error('Error updating common command:', error.message);
    return res.status(500).json({
      message: "Error al actualizar comando común",
      error: error.message
    });
  }
};

// Eliminar comando común
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar si hay implementaciones activas asociadas
    const implementationCount = await CommandImplementation.count({
      where: { commonCommandId: id, active: true }
    });

    if (implementationCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar el comando porque tiene implementaciones activas asociadas"
      });
    }

    const deleted = await CommonCommand.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({
        message: `Comando común con ID ${id} no encontrado`
      });
    }

    return res.json({
      message: "Comando común eliminado exitosamente"
    });

  } catch (error) {
    logger.error('Error deleting common command:', error.message);
    return res.status(500).json({
      message: "Error al eliminar comando común",
      error: error.message
    });
  }
};

// Obtener todas las implementaciones de un comando común
exports.getImplementations = async (req, res) => {
  try {
    const commandId = req.params.id;

    const command = await CommonCommand.findByPk(commandId);
    if (!command) {
      return res.status(404).json({
        message: `Comando común con ID ${commandId} no encontrado`
      });
    }

    const implementations = await CommandImplementation.findAll({
      where: { commonCommandId: commandId },
      include: [
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
      order: [['brand', 'name'], ['family', 'name']]
    });

    return res.json({
      commandId: commandId,
      commandName: command.name,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error getting command implementations:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones del comando",
      error: error.message
    });
  }
};

// Obtener implementaciones por marca específica
exports.getImplementationsByBrand = async (req, res) => {
  try {
    const { id: commandId, brandId } = req.params;

    const command = await CommonCommand.findByPk(commandId);
    if (!command) {
      return res.status(404).json({
        message: `Comando común con ID ${commandId} no encontrado`
      });
    }

    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        message: `Marca con ID ${brandId} no encontrada`
      });
    }

    const implementations = await CommandImplementation.findAll({
      where: { 
        commonCommandId: commandId,
        brandId: brandId 
      },
      include: [
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name']
        }
      ],
      order: [['family', 'name']]
    });

    return res.json({
      commandId: commandId,
      commandName: command.name,
      brandId: brandId,
      brandName: brand.name,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error getting implementations by brand:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones por marca",
      error: error.message
    });
  }
};

// Verificar si un comando tiene implementación para una marca/familia
exports.checkImplementation = async (req, res) => {
  try {
    const commandId = req.params.id;
    const { brandId, familyId } = req.query;

    if (!brandId) {
      return res.status(400).json({
        message: "Se requiere especificar brandId"
      });
    }

    const condition = {
      commonCommandId: commandId,
      brandId: brandId,
      active: true
    };

    if (familyId) {
      condition.familyId = familyId;
    }

    const implementation = await CommandImplementation.findOne({
      where: condition,
      include: [
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
      ]
    });

    return res.json({
      commandId: commandId,
      brandId: brandId,
      familyId: familyId || null,
      hasImplementation: !!implementation,
      implementation: implementation || null
    });

  } catch (error) {
    logger.error('Error checking implementation:', error.message);
    return res.status(500).json({
      message: "Error al verificar implementación",
      error: error.message
    });
  }
};