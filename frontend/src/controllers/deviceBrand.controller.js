// backend/src/controllers/deviceBrand.controller.js
const db = require('../models');
const DeviceBrand = db.DeviceBrand;
const DeviceFamily = db.DeviceFamily;
const CommandImplementation = db.CommandImplementation;
const SnmpOid = db.SnmpOid;
const Op = db.Sequelize.Op;
const logger = require('../utils/logger');

// Obtener todas las marcas de dispositivos
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, active } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (active !== undefined) condition.active = active === 'true';

    const { count, rows: brands } = await DeviceBrand.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: DeviceFamily,
          as: 'families',
          attributes: ['id', 'name', 'active'],
          where: { active: true },
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.json({
      totalItems: count,
      brands,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    logger.error('Error finding device brands:', error.message);
    return res.status(500).json({
      message: "Error al obtener marcas de dispositivos",
      error: error.message
    });
  }
};

// Obtener una marca específica por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const brand = await DeviceBrand.findByPk(id, {
      include: [
        {
          model: DeviceFamily,
          as: 'families',
          attributes: ['id', 'name', 'description', 'active']
        }
      ]
    });

    if (!brand) {
      return res.status(404).json({
        message: `Marca de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json(brand);

  } catch (error) {
    logger.error('Error finding device brand:', error.message);
    return res.status(500).json({
      message: "Error al obtener marca de dispositivo",
      error: error.message
    });
  }
};

// Crear nueva marca de dispositivo
exports.create = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "El nombre de la marca es obligatorio"
      });
    }

    // Verificar si ya existe una marca con el mismo nombre
    const existingBrand = await DeviceBrand.findOne({
      where: { name: name.toLowerCase() }
    });

    if (existingBrand) {
      return res.status(400).json({
        message: "Ya existe una marca con este nombre"
      });
    }

    const brand = await DeviceBrand.create({
      name: name.toLowerCase(),
      description,
      imageUrl,
      active: true
    });

    return res.status(201).json({
      message: "Marca de dispositivo creada exitosamente",
      brand
    });

  } catch (error) {
    logger.error('Error creating device brand:', error.message);
    return res.status(500).json({
      message: "Error al crear marca de dispositivo",
      error: error.message
    });
  }
};

// Actualizar marca de dispositivo
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    // Si se actualiza el nombre, verificar que no exista otro con el mismo nombre
    if (updateData.name) {
      const existingBrand = await DeviceBrand.findOne({
        where: { 
          name: updateData.name.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingBrand) {
        return res.status(400).json({
          message: "Ya existe otra marca con este nombre"
        });
      }

      updateData.name = updateData.name.toLowerCase();
    }

    const [updated] = await DeviceBrand.update(updateData, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({
        message: `Marca de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Marca de dispositivo actualizada exitosamente"
    });

  } catch (error) {
    logger.error('Error updating device brand:', error.message);
    return res.status(500).json({
      message: "Error al actualizar marca de dispositivo",
      error: error.message
    });
  }
};

// Activar/desactivar marca
exports.toggleActive = async (req, res) => {
  try {
    const id = req.params.id;

    const brand = await DeviceBrand.findByPk(id);
    if (!brand) {
      return res.status(404).json({
        message: `Marca de dispositivo con ID ${id} no encontrada`
      });
    }

    await brand.update({ active: !brand.active });

    return res.json({
      message: `Marca ${brand.active ? 'activada' : 'desactivada'} exitosamente`,
      active: brand.active
    });

  } catch (error) {
    logger.error('Error toggling device brand:', error.message);
    return res.status(500).json({
      message: "Error al cambiar estado de la marca",
      error: error.message
    });
  }
};

// Eliminar marca (soft delete)
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar si hay familias asociadas
    const familyCount = await DeviceFamily.count({
      where: { brandId: id, active: true }
    });

    if (familyCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar la marca porque tiene familias activas asociadas"
      });
    }

    const [updated] = await DeviceBrand.update(
      { active: false },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({
        message: `Marca de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Marca de dispositivo desactivada exitosamente"
    });

  } catch (error) {
    logger.error('Error deleting device brand:', error.message);
    return res.status(500).json({
      message: "Error al eliminar marca de dispositivo",
      error: error.message
    });
  }
};

// Obtener familias de una marca específica
exports.getFamilies = async (req, res) => {
  try {
    const brandId = req.params.id;

    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        message: `Marca con ID ${brandId} no encontrada`
      });
    }

    const families = await DeviceFamily.findAll({
      where: { brandId: brandId },
      order: [['name', 'ASC']]
    });

    return res.json({
      brandId: brandId,
      brandName: brand.name,
      families: families
    });

  } catch (error) {
    logger.error('Error getting brand families:', error.message);
    return res.status(500).json({
      message: "Error al obtener familias de la marca",
      error: error.message
    });
  }
};

// Obtener comandos implementados por una marca
exports.getCommands = async (req, res) => {
  try {
    const brandId = req.params.id;

    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        message: `Marca con ID ${brandId} no encontrada`
      });
    }

    const commands = await CommandImplementation.findAll({
      where: { brandId: brandId, active: true },
      include: [
        {
          model: db.CommonCommand,
          as: 'command',
          attributes: ['id', 'name', 'description', 'category']
        }
      ],
      order: [['command', 'category'], ['command', 'name']]
    });

    return res.json({
      brandId: brandId,
      brandName: brand.name,
      commands: commands
    });

  } catch (error) {
    logger.error('Error getting brand commands:', error.message);
    return res.status(500).json({
      message: "Error al obtener comandos de la marca",
      error: error.message
    });
  }
};

// Obtener OIDs SNMP de una marca
exports.getSnmpOids = async (req, res) => {
  try {
    const brandId = req.params.id;

    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        message: `Marca con ID ${brandId} no encontrada`
      });
    }

    const oids = await SnmpOid.findAll({
      where: { brandId: brandId, active: true },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    return res.json({
      brandId: brandId,
      brandName: brand.name,
      snmpOids: oids
    });

  } catch (error) {
    logger.error('Error getting brand SNMP OIDs:', error.message);
    return res.status(500).json({
      message: "Error al obtener OIDs SNMP de la marca",
      error: error.message
    });
  }
};