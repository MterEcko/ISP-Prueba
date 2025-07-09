const db = require('../models');
const InventoryMovement = db.InventoryMovement;
const Inventory = db.Inventory;
const InventoryLocation = db.InventoryLocation;
const User = db.User;
const Op = db.Sequelize.Op;

// Crear un nuevo movimiento manual
exports.create = async (req, res) => {
  try {
    const { inventoryId, type, reason, fromLocationId, toLocationId, notes } = req.body;

    if (!inventoryId || !type) {
      return res.status(400).json({ message: "Item ID y tipo de movimiento son obligatorios" });
    }

    // Validar item de inventario
    const item = await Inventory.findByPk(inventoryId);
    if (!item) {
      return res.status(404).json({ message: `Item con ID ${inventoryId} no encontrado` });
    }

    // Validar ubicaciones si se proporcionan
    if (fromLocationId) {
      const fromLocation = await InventoryLocation.findByPk(fromLocationId);
      if (!fromLocation) {
        return res.status(404).json({ message: `Ubicación origen con ID ${fromLocationId} no encontrada` });
      }
    }

    if (toLocationId) {
      const toLocation = await InventoryLocation.findByPk(toLocationId);
      if (!toLocation) {
        return res.status(404).json({ message: `Ubicación destino con ID ${toLocationId} no encontrada` });
      }
    }

    // Crear movimiento
    const movement = await InventoryMovement.create({
      inventoryId,
      type,
      quantity: req.body.quantity || 1,
      reason: reason || 'Movimiento manual',
      fromLocationId,
      toLocationId,
      movedById: req.userId,
      notes,
      movementDate: req.body.movementDate || new Date()
    });

    // Si es un movimiento de transferencia, actualizar la ubicación del item
    if (type === 'transfer' && toLocationId) {
      await Inventory.update(
        { locationId: toLocationId },
        { where: { id: inventoryId } }
      );
    }

    return res.status(201).json({ message: "Movimiento creado exitosamente", movement });
  } catch (error) {
    console.error("Error en create de movimiento:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los movimientos con filtros
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      type, 
      inventoryId, 
      fromLocationId, 
      toLocationId,
      movedById,
      dateFrom,
      dateTo
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (type) condition.type = type;
    if (inventoryId) condition.inventoryId = inventoryId;
    if (fromLocationId) condition.fromLocationId = fromLocationId;
    if (toLocationId) condition.toLocationId = toLocationId;
    if (movedById) condition.movedById = movedById;
    
    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      condition.movementDate = {};
      if (dateFrom) condition.movementDate[Op.gte] = new Date(dateFrom);
      if (dateTo) condition.movementDate[Op.lte] = new Date(dateTo);
    }

    // Obtener movimientos
    const { count, rows: movements } = await InventoryMovement.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Inventory,
          as: 'item',
          attributes: ['id', 'name', 'brand', 'model', 'serialNumber']
        },
        {
          model: InventoryLocation,
          as: 'fromLocation',
          attributes: ['id', 'name', 'type']
        },
        {
          model: InventoryLocation,
          as: 'toLocation',
          attributes: ['id', 'name', 'type']
        },
        {
          model: User,
          as: 'movedBy',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['movementDate', 'DESC']]
    });

    return res.status(200).json({
      totalItems: count,
      movements,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAll de movimientos:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener movimiento por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const movement = await InventoryMovement.findByPk(id, {
      include: [
        {
          model: Inventory,
          as: 'item',
          attributes: ['id', 'name', 'brand', 'model', 'serialNumber', 'status']
        },
        {
          model: InventoryLocation,
          as: 'fromLocation',
          attributes: ['id', 'name', 'type', 'description']
        },
        {
          model: InventoryLocation,
          as: 'toLocation',
          attributes: ['id', 'name', 'type', 'description']
        },
        {
          model: User,
          as: 'movedBy',
          attributes: ['id', 'username', 'fullName', 'email']
        }
      ]
    });

    if (!movement) {
      return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado` });
    }

    return res.status(200).json(movement);
  } catch (error) {
    console.error("Error en findOne de movimiento:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener movimientos por item de inventario
exports.findByItem = async (req, res) => {
  try {
    const inventoryId = req.params.itemId;
    
    const movements = await InventoryMovement.findAll({
      where: { inventoryId },
      include: [
        {
          model: Inventory,
          as: 'item',
          attributes: ['id', 'name', 'brand', 'model']
        },
        {
          model: InventoryLocation,
          as: 'fromLocation',
          attributes: ['id', 'name', 'type']
        },
        {
          model: InventoryLocation,
          as: 'toLocation',
          attributes: ['id', 'name', 'type']
        },
        {
          model: User,
          as: 'movedBy',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['movementDate', 'DESC']]
    });

    return res.status(200).json(movements);
  } catch (error) {
    console.error("Error en findByItem de movimientos:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar movimiento
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await InventoryMovement.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Movimiento eliminado exitosamente" });
  } catch (error) {
    console.error("Error en delete de movimiento:", error);
    return res.status(500).json({ message: error.message });
  }
};