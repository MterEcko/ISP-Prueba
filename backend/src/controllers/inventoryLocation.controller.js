const db = require('../models');
const InventoryLocation = db.InventoryLocation;
const Inventory = db.Inventory;
const Op = db.Sequelize.Op;

// Crear una nueva ubicación
exports.create = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ message: "El nombre de la ubicación es obligatorio" });
    }

    // Validar ubicación padre si se proporciona
    if (req.body.parent_id) {
      const parent = await InventoryLocation.findByPk(req.body.parent_id);
      if (!parent) {
        return res.status(404).json({ message: `Ubicación padre con ID ${req.body.parent_id} no encontrada` });
      }
    }

    const location = await InventoryLocation.create({
      name: req.body.name,
      type: req.body.type || 'warehouse',
      description: req.body.description,
      address: req.body.address,
      active: req.body.active !== undefined ? req.body.active : true,
      parent_id: req.body.parent_id
    });

    return res.status(201).json({ message: "Ubicación creada exitosamente", location });
  } catch (error) {
    console.error("Error en create de ubicación:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todas las ubicaciones
exports.findAll = async (req, res) => {
  try {
    console.log("=== Llegó a findAll de ubicaciones ===");
    console.log("Usuario:", req.userId);
    console.log("Query params:", req.query);
    const { page = 1, size = 10, name, type, active, parentId } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (name) condition.name = { [Op.like]: `%${name}%` };
    if (type) condition.type = type;
    if (active !== undefined) condition.active = active === 'true';
    if (parentId) condition.parent_id = parentId;

    const { count, rows: locations } = await InventoryLocation.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: InventoryLocation,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: InventoryLocation,
          as: 'children',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Inventory,
          as: 'items',
          attributes: ['id', 'name', 'status']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      totalItems: count,
      locations,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAll de ubicaciones:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener ubicación por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const location = await InventoryLocation.findByPk(id, {
      include: [
        {
          model: InventoryLocation,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: InventoryLocation,
          as: 'children',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Inventory,
          as: 'items',
          include: [
            {
              model: db.Client,
              as: 'assignedClient',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!location) {
      return res.status(404).json({ message: `Ubicación con ID ${id} no encontrada` });
    }

    return res.status(200).json(location);
  } catch (error) {
    console.error("Error en findOne de ubicación:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar ubicación
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Validar ubicación padre si se proporciona
    if (req.body.parent_id) {
      const parent = await InventoryLocation.findByPk(req.body.parent_id);
      if (!parent) {
        return res.status(404).json({ message: `Ubicación padre con ID ${req.body.parent_id} no encontrada` });
      }
      
      // Verificar que no se esté creando un ciclo
      if (req.body.parent_id == id) {
        return res.status(400).json({ message: "Una ubicación no puede ser padre de sí misma" });
      }
    }

    const [updated] = await InventoryLocation.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Ubicación con ID ${id} no encontrada` });
    }

    return res.status(200).json({ message: "Ubicación actualizada exitosamente" });
  } catch (error) {
    console.error("Error en update de ubicación:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar ubicación
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que no tenga items asignados
    const itemsCount = await Inventory.count({ where: { locationId: id } });
    if (itemsCount > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar la ubicación. Tiene ${itemsCount} items asignados.` 
      });
    }

    // Verificar que no tenga ubicaciones hijas
    const childrenCount = await InventoryLocation.count({ where: { parent_id: id } });
    if (childrenCount > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar la ubicación. Tiene ${childrenCount} sub-ubicaciones.` 
      });
    }

    const deleted = await InventoryLocation.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Ubicación con ID ${id} no encontrada` });
    }

    return res.status(200).json({ message: "Ubicación eliminada exitosamente" });
  } catch (error) {
    console.error("Error en delete de ubicación:", error);
    return res.status(500).json({ message: error.message });
  }
};