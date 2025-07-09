// backend/src/controllers/deviceFamily.controller.js
const db = require('../models');
const DeviceFamily = db.DeviceFamily;
const DeviceBrand = db.DeviceBrand;
const CommandImplementation = db.CommandImplementation;
const SnmpOid = db.SnmpOid;
const Device = db.Device;
const Op = db.Sequelize.Op;
const logger = require('../utils/logger');

// Obtener todas las familias de dispositivos
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, brandId, active } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (brandId) condition.brandId = brandId;
    if (active !== undefined) condition.active = active === 'true';

    const { count, rows: families } = await DeviceFamily.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.json({
      totalItems: count,
      families,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    logger.error('Error finding device families:', error.message);
    return res.status(500).json({
      message: "Error al obtener familias de dispositivos",
      error: error.message
    });
  }
};

// Obtener familias por marca específica
exports.findByBrand = async (req, res) => {
  try {
    const brandId = req.params.brandId;
    const { active } = req.query;

    const condition = { brandId: brandId };
    if (active !== undefined) condition.active = active === 'true';

    const families = await DeviceFamily.findAll({
      where: condition,
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.json({
      brandId: brandId,
      families: families
    });

  } catch (error) {
    logger.error('Error finding families by brand:', error.message);
    return res.status(500).json({
      message: "Error al obtener familias por marca",
      error: error.message
    });
  }
};

// Obtener una familia específica por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const family = await DeviceFamily.findByPk(id, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!family) {
      return res.status(404).json({
        message: `Familia de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json(family);

  } catch (error) {
    logger.error('Error finding device family:', error.message);
    return res.status(500).json({
      message: "Error al obtener familia de dispositivo",
      error: error.message
    });
  }
};

// Crear nueva familia de dispositivo
exports.create = async (req, res) => {
  try {
    const { brandId, name, description } = req.body;

    if (!brandId || !name) {
      return res.status(400).json({
        message: "La marca (brandId) y el nombre son obligatorios"
      });
    }

    // Verificar que la marca existe
    const brand = await DeviceBrand.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({
        message: "La marca especificada no existe"
      });
    }

    // Verificar si ya existe una familia con el mismo nombre en la marca
    const existingFamily = await DeviceFamily.findOne({
      where: { 
        brandId: brandId,
        name: name.toLowerCase()
      }
    });

    if (existingFamily) {
      return res.status(400).json({
        message: "Ya existe una familia con este nombre en la marca especificada"
      });
    }

    const family = await DeviceFamily.create({
      brandId,
      name: name.toLowerCase(),
      description,
      active: true
    });

    // Incluir información de la marca en la respuesta
    const familyWithBrand = await DeviceFamily.findByPk(family.id, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ]
    });

    return res.status(201).json({
      message: "Familia de dispositivo creada exitosamente",
      family: familyWithBrand
    });

  } catch (error) {
    logger.error('Error creating device family:', error.message);
    return res.status(500).json({
      message: "Error al crear familia de dispositivo",
      error: error.message
    });
  }
};

// Actualizar familia de dispositivo
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    // Si se actualiza el nombre, verificar que no exista otro con el mismo nombre en la marca
    if (updateData.name) {
      const family = await DeviceFamily.findByPk(id);
      if (!family) {
        return res.status(404).json({
          message: `Familia con ID ${id} no encontrada`
        });
      }

      const existingFamily = await DeviceFamily.findOne({
        where: { 
          brandId: family.brandId,
          name: updateData.name.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingFamily) {
        return res.status(400).json({
          message: "Ya existe otra familia con este nombre en la misma marca"
        });
      }

      updateData.name = updateData.name.toLowerCase();
    }

    const [updated] = await DeviceFamily.update(updateData, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({
        message: `Familia de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Familia de dispositivo actualizada exitosamente"
    });

  } catch (error) {
    logger.error('Error updating device family:', error.message);
    return res.status(500).json({
      message: "Error al actualizar familia de dispositivo",
      error: error.message
    });
  }
};

// Activar/desactivar familia
exports.toggleActive = async (req, res) => {
  try {
    const id = req.params.id;

    const family = await DeviceFamily.findByPk(id);
    if (!family) {
      return res.status(404).json({
        message: `Familia de dispositivo con ID ${id} no encontrada`
      });
    }

    await family.update({ active: !family.active });

    return res.json({
      message: `Familia ${family.active ? 'activada' : 'desactivada'} exitosamente`,
      active: family.active
    });

  } catch (error) {
    logger.error('Error toggling device family:', error.message);
    return res.status(500).json({
      message: "Error al cambiar estado de la familia",
      error: error.message
    });
  }
};

// Eliminar familia (soft delete)
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar si hay dispositivos asociados a esta familia
    const deviceCount = await Device.count({
      where: { familyId: id }
    });

    if (deviceCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar la familia porque tiene dispositivos asociados"
      });
    }

    const [updated] = await DeviceFamily.update(
      { active: false },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({
        message: `Familia de dispositivo con ID ${id} no encontrada`
      });
    }

    return res.json({
      message: "Familia de dispositivo desactivada exitosamente"
    });

  } catch (error) {
    logger.error('Error deleting device family:', error.message);
    return res.status(500).json({
      message: "Error al eliminar familia de dispositivo",
      error: error.message
    });
  }
};

// Obtener implementaciones de comandos de una familia
exports.getCommandImplementations = async (req, res) => {
  try {
    const familyId = req.params.id;

    const family = await DeviceFamily.findByPk(familyId, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!family) {
      return res.status(404).json({
        message: `Familia con ID ${familyId} no encontrada`
      });
    }

    const implementations = await CommandImplementation.findAll({
      where: { familyId: familyId, active: true },
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
      familyId: familyId,
      familyName: family.name,
      brandName: family.brand.name,
      implementations: implementations
    });

  } catch (error) {
    logger.error('Error getting family command implementations:', error.message);
    return res.status(500).json({
      message: "Error al obtener implementaciones de comandos de la familia",
      error: error.message
    });
  }
};

// Obtener OIDs SNMP específicos de una familia
exports.getSnmpOids = async (req, res) => {
  try {
    const familyId = req.params.id;

    const family = await DeviceFamily.findByPk(familyId, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!family) {
      return res.status(404).json({
        message: `Familia con ID ${familyId} no encontrada`
      });
    }

    const oids = await SnmpOid.findAll({
      where: { familyId: familyId, active: true },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    return res.json({
      familyId: familyId,
      familyName: family.name,
      brandName: family.brand.name,
      snmpOids: oids
    });

  } catch (error) {
    logger.error('Error getting family SNMP OIDs:', error.message);
    return res.status(500).json({
      message: "Error al obtener OIDs SNMP de la familia",
      error: error.message
    });
  }
};

// Obtener dispositivos que pertenecen a una familia
exports.getDevices = async (req, res) => {
  try {
    const familyId = req.params.id;
    const { page = 1, size = 10, status } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const family = await DeviceFamily.findByPk(familyId, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!family) {
      return res.status(404).json({
        message: `Familia con ID ${familyId} no encontrada`
      });
    }

    const condition = { familyId: familyId };
    if (status) condition.status = status;

    const { count, rows: devices } = await Device.findAndCountAll({
      where: condition,
      limit,
      offset,
      attributes: ['id', 'name', 'type', 'model', 'ipAddress', 'status', 'lastSeen'],
      order: [['name', 'ASC']]
    });

    return res.json({
      familyId: familyId,
      familyName: family.name,
      brandName: family.brand.name,
      totalItems: count,
      devices,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    logger.error('Error getting family devices:', error.message);
    return res.status(500).json({
      message: "Error al obtener dispositivos de la familia",
      error: error.message
    });
  }
};