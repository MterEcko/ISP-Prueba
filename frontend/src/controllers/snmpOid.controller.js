// backend/src/controllers/snmpOid.controller.js
const db = require('../models');
const SnmpOid = db.SnmpOid;
const DeviceBrand = db.DeviceBrand;
const DeviceFamily = db.DeviceFamily;
const Op = db.Sequelize.Op;

// Crear un nuevo SNMP OID
exports.create = async (req, res) => {
  try {
    // Validar datos requeridos
    if (!req.body.brandId || !req.body.name || !req.body.oid) {
      return res.status(400).json({ 
        message: "Los campos brandId, name y oid son obligatorios" 
      });
    }

    // Verificar que la marca existe
    const brand = await DeviceBrand.findByPk(req.body.brandId);
    if (!brand) {
      return res.status(404).json({ 
        message: `Marca con ID ${req.body.brandId} no encontrada` 
      });
    }

    // Verificar familia si se proporciona
    if (req.body.familyId) {
      const family = await DeviceFamily.findByPk(req.body.familyId);
      if (!family) {
        return res.status(404).json({ 
          message: `Familia con ID ${req.body.familyId} no encontrada` 
        });
      }
    }

    // Crear SNMP OID
    const snmpOid = await SnmpOid.create({
      brandId: req.body.brandId,
      familyId: req.body.familyId || null,
      name: req.body.name,
      description: req.body.description || '',
      oid: req.body.oid,
      dataType: req.body.dataType || 'string',
      mode: req.body.mode || 'get',
      unit: req.body.unit || '',
      conversion: req.body.conversion || null
    });

    // Obtener el OID creado con relaciones
    const createdOid = await SnmpOid.findByPk(snmpOid.id, {
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

    return res.status(201).json({
      message: "SNMP OID creado exitosamente",
      snmpOid: createdOid
    });
  } catch (error) {
    console.error("Error al crear SNMP OID:", error);
    return res.status(500).json({
      message: "Error al crear SNMP OID",
      error: error.message
    });
  }
};

// Obtener todos los SNMP OIDs con paginación y filtros
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 20, brandId, familyId, name, dataType, mode } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (brandId) condition.brandId = brandId;
    if (familyId) condition.familyId = familyId;
    if (name) condition.name = { [Op.iLike]: `%${name}%` };
    if (dataType) condition.dataType = dataType;
    if (mode) condition.mode = mode;

    // Obtener OIDs con relaciones
    const { count, rows: snmpOids } = await SnmpOid.findAndCountAll({
      where: condition,
      limit,
      offset,
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
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      totalItems: count,
      snmpOids,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error al obtener SNMP OIDs:", error);
    return res.status(500).json({
      message: "Error al obtener SNMP OIDs",
      error: error.message
    });
  }
};

// Obtener SNMP OID por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const snmpOid = await SnmpOid.findByPk(id, {
      include: [
        {
          model: DeviceBrand,
          as: 'brand',
          attributes: ['id', 'name', 'description']
        },
        {
          model: DeviceFamily,
          as: 'family',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!snmpOid) {
      return res.status(404).json({ 
        message: `SNMP OID con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json(snmpOid);
  } catch (error) {
    console.error("Error al obtener SNMP OID:", error);
    return res.status(500).json({
      message: "Error al obtener SNMP OID",
      error: error.message
    });
  }
};

// Actualizar SNMP OID
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que el OID existe
    const snmpOid = await SnmpOid.findByPk(id);
    if (!snmpOid) {
      return res.status(404).json({ 
        message: `SNMP OID con ID ${id} no encontrado` 
      });
    }

    // Verificar marca si se proporciona
    if (req.body.brandId) {
      const brand = await DeviceBrand.findByPk(req.body.brandId);
      if (!brand) {
        return res.status(404).json({ 
          message: `Marca con ID ${req.body.brandId} no encontrada` 
        });
      }
    }

    // Verificar familia si se proporciona
    if (req.body.familyId) {
      const family = await DeviceFamily.findByPk(req.body.familyId);
      if (!family) {
        return res.status(404).json({ 
          message: `Familia con ID ${req.body.familyId} no encontrada` 
        });
      }
    }

    // Actualizar OID
    const [updated] = await SnmpOid.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(400).json({ 
        message: "No se pudo actualizar el SNMP OID" 
      });
    }

    // Obtener OID actualizado
    const updatedOid = await SnmpOid.findByPk(id, {
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

    return res.status(200).json({
      message: "SNMP OID actualizado exitosamente",
      snmpOid: updatedOid
    });
  } catch (error) {
    console.error("Error al actualizar SNMP OID:", error);
    return res.status(500).json({
      message: "Error al actualizar SNMP OID",
      error: error.message
    });
  }
};

// Eliminar SNMP OID
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await SnmpOid.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ 
        message: `SNMP OID con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({ 
      message: "SNMP OID eliminado exitosamente" 
    });
  } catch (error) {
    console.error("Error al eliminar SNMP OID:", error);
    return res.status(500).json({
      message: "Error al eliminar SNMP OID",
      error: error.message
    });
  }
};

// Obtener OIDs por marca
exports.findByBrand = async (req, res) => {
  try {
    const brandId = req.params.brandId;
    
    const snmpOids = await SnmpOid.findAll({
      where: { brandId: brandId },
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
      order: [['name', 'ASC']]
    });

    return res.status(200).json(snmpOids);
  } catch (error) {
    console.error("Error al obtener OIDs por marca:", error);
    return res.status(500).json({
      message: "Error al obtener OIDs por marca",
      error: error.message
    });
  }
};

// Obtener OIDs por familia
exports.findByFamily = async (req, res) => {
  try {
    const familyId = req.params.familyId;
    
    const snmpOids = await SnmpOid.findAll({
      where: { familyId: familyId },
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
      order: [['name', 'ASC']]
    });

    return res.status(200).json(snmpOids);
  } catch (error) {
    console.error("Error al obtener OIDs por familia:", error);
    return res.status(500).json({
      message: "Error al obtener OIDs por familia",
      error: error.message
    });
  }
};