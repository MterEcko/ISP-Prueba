const db = require('../models');
const Inventory = db.Inventory;
const InventoryLocation = db.InventoryLocation;
const InventoryMovement = db.InventoryMovement;
const InventoryScrap = db.InventoryScrap;
const InventoryType = db.InventoryType;
const InventoryCategory = db.InventoryCategory;
const Client = db.Client;
const Op = db.Sequelize.Op;

// Crear un nuevo item de inventario
// CORREGIR en backend/src/controllers/inventory.controller.js
// La función exports.create

exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name) {
      return res.status(400).json({ message: "El nombre del item es obligatorio" });
    }

    // Validar ubicación si se proporciona
    if (req.body.locationId) {
      const location = await InventoryLocation.findByPk(req.body.locationId);
      if (!location) {
        return res.status(404).json({ message: `Ubicación con ID ${req.body.locationId} no encontrada` });
      }
    }

    // Validar cliente si se proporciona
    if (req.body.clientId) {
      const client = await Client.findByPk(req.body.clientId);
      if (!client) {
        return res.status(404).json({ message: `Cliente con ID ${req.body.clientId} no encontrado` });
      }
    }

    // Crear item
    const item = await Inventory.create({
      name: req.body.name,
      brand: req.body.brand,
      model: req.body.model,
      serialNumber: req.body.serialNumber,
      status: req.body.status || 'available',
      quantity: req.body.quantity || 1,  // ✅ CORREGIR: usar quantity del request
      description: req.body.description,
      purchaseDate: req.body.purchaseDate,
      cost: req.body.cost,
      notes: req.body.notes,
      locationId: req.body.locationId,
      clientId: req.body.clientId
    });

    // ✅ CORREGIR: Solo crear movimiento si tiene ubicación Y usar req.userId
    if (req.body.locationId && req.userId) {
      await InventoryMovement.create({
        inventoryId: item.id,
        type: 'in',
        quantity: req.body.quantity || 1,  // ✅ CORREGIR: usar quantity correcta
        reason: 'Ingreso inicial',
        toLocationId: req.body.locationId,
        movedById: req.userId || 1,  // ✅ CORREGIR: era req.userId no req.userId
        notes: req.body.notes
      });
    }

    return res.status(201).json({ message: "Item de inventario creado exitosamente", item });
  } catch (error) {
    console.error("Error en create de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};
// Obtener todos los items con paginación y filtros
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, name, brand, model, status, serialNumber, locationId, clientId, assignedOnly } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (name) {
      condition.name = { [Op.like]: `%${name}%` };
    }
    if (brand) condition.brand = { [Op.like]: `%${brand}%` };
    if (model) condition.model = { [Op.like]: `%${model}%` };
    if (status) condition.status = status;
    if (serialNumber) condition.serialNumber = { [Op.like]: `%${serialNumber}%` };
    if (locationId) condition.locationId = locationId;
    if (clientId) condition.clientId = clientId;
    if (assignedOnly === 'true') condition.clientId = { [Op.not]: null };
    if (assignedOnly === 'false') condition.clientId = null;

    // Obtener items
    const { count, rows: items } = await Inventory.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Client,
          as: 'assignedClient',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Items de inventario encontrados: ${count}`);

    return res.status(200).json({
      totalItems: count,
      items,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAll de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findAllBySerial = async (req, res) => {
  try {
    const { page = 1, size = 10, serialNumber } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (serialNumber) {
      condition.serialNumber = { [Op.like]: `%${serialNumber}%` };
    } else {
      // Si no se proporciona serialNumber, devolver error o lista vacía
      return res.status(400).json({ message: "El parámetro serialNumber es requerido" });
    }

    // Obtener items
    const { count, rows: items } = await Inventory.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Client,
          as: 'assignedClient',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Items de inventario encontrados por serialNumber: ${count}`);

    return res.status(200).json({
      totalItems: count,
      items,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAllBySerial de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.findAllByMac = async (req, res) => {
  try {
    const { page = 1, size = 10, macAddress } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (macAddress) {
      condition.macAddress = { [Op.like]: `%${macAddress}%` };
    } else {
      // Si no se proporciona macAddress, devolver error o lista vacía
      return res.status(400).json({ message: "El parámetro macAddress es requerido" });
    }

    // Obtener items
    const { count, rows: items } = await Inventory.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Client,
          as: 'assignedClient',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Items de inventario encontrados por macAddress: ${count}`);

    return res.status(200).json({
      totalItems: count,
      items,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAllBySerial de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener item por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const item = await Inventory.findByPk(id, {
      include: [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type', 'description']
        },
        {
          model: Client,
          as: 'assignedClient',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: InventoryMovement,
          as: 'movements',
          include: [
            {
              model: InventoryLocation,
              as: 'fromLocation',
              attributes: ['id', 'name']
            },
            {
              model: InventoryLocation,
              as: 'toLocation',
              attributes: ['id', 'name']
            },
            {
              model: db.User,
              as: 'movedBy',
              attributes: ['id', 'username', 'fullName']
            }
          ],
          order: [['movement_date', 'DESC']]
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ message: `Item con ID ${id} no encontrado` });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error("Error en findOne de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar item
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Buscar item actual
    const item = await Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: `Item con ID ${id} no encontrado` });
    }

    // Validar ubicación si se proporciona
    if (req.body.locationId && req.body.locationId !== item.locationId) {
      const location = await InventoryLocation.findByPk(req.body.locationId);
      if (!location) {
        return res.status(404).json({ message: `Ubicación con ID ${req.body.locationId} no encontrada` });
      }
    }

    // Validar cliente si se proporciona
    if (req.body.clientId && req.body.clientId !== item.clientId) {
      const client = await Client.findByPk(req.body.clientId);
      if (!client) {
        return res.status(404).json({ message: `Cliente con ID ${req.body.clientId} no encontrado` });
      }
    }

    // Actualizar item
    const [updated] = await Inventory.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Item con ID ${id} no pudo ser actualizado` });
    }

    // Si cambió la ubicación, crear movimiento
    if (req.body.locationId && req.body.locationId !== item.locationId) {
      await InventoryMovement.create({
        inventoryId: id,
        type: 'transfer',
        quantity: 1,
        reason: req.body.moveReason || 'Cambio de ubicación',
        fromLocationId: item.locationId,
        toLocationId: req.body.locationId,
        movedById: req.userId || 1,
        notes: req.body.moveNotes
      });
    }

    return res.status(200).json({ message: "Item actualizado exitosamente" });
  } catch (error) {
    console.error("Error en update de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Cambiar estado del item
exports.changeStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, reason, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "El estado es requerido" });
    }

    // Validar estado
    const validStatuses = ['available', 'inUse', 'defective', 'inRepair', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado inválido" });
    }
    
    const [updated] = await Inventory.update(
      { status: status },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: `Item con ID ${id} no encontrado` });
    }

    // Crear movimiento de ajuste
    await InventoryMovement.create({
      inventoryId: id,
      type: 'adjustment',
      quantity: 1,
      reason: reason || `Cambio de estado a ${status}`,
      movedById: req.userId || 1,
      notes: notes
    });

    return res.status(200).json({ message: `Estado cambiado a ${status} exitosamente` });
  } catch (error) {
    console.error("Error en changeStatus de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Asignar item a cliente
exports.assignToClient = async (req, res) => {
  try {
    const id = req.params.id;
    const { clientId, reason, notes } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: "ID del cliente es requerido" });
    }

    // Validar cliente
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ message: `Cliente con ID ${clientId} no encontrado` });
    }

    // Actualizar item
    const [updated] = await Inventory.update(
      { 
        clientId: clientId,
        status: 'inUse'
      },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: `Item con ID ${id} no encontrado` });
    }

    // Crear movimiento
    await InventoryMovement.create({
      inventoryId: id,
      type: 'out',
      quantity: 1,
      reason: reason || `Asignado a cliente ${client.firstName} ${client.lastName}`,
      movedById: req.userId || 1,
      notes: notes
    });

    return res.status(200).json({ message: "Item asignado al cliente exitosamente" });
  } catch (error) {
    console.error("Error en assignToClient de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar item
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await Inventory.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Item con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Item eliminado exitosamente" });
  } catch (error) {
    console.error("Error en delete de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Buscar producto por serial para autocompletado
exports.getProductBySerial = async (req, res) => {
  try {
    const { serial } = req.params;
    
    if (!serial) {
      return res.status(400).json({ message: "Serial es requerido" });
    }

    // Buscar si ya existe un item con este serial
    const existingItem = await Inventory.findOne({
      where: { serialNumber: serial },
      include: [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name']
        }
      ]
    });

    if (existingItem) {
      return res.status(200).json({
        found: true,
        template: {
          name: existingItem.name,
          brand: existingItem.brand,
          model: existingItem.model,
          cost: existingItem.cost,
          serialNumber: existingItem.serialNumber,
          description: existingItem.description
        },
        message: `Producto encontrado: ${existingItem.name} ${existingItem.model}`
      });
    }

    return res.status(200).json({
      found: false,
      message: "Serial no encontrado. Complete los datos para crear una nueva plantilla."
    });

  } catch (error) {
    console.error("Error buscando producto por serial:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Consumir material con generación automática de scrap
exports.consumeMaterial = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      inventoryId,
      quantityToUse,
      technicianId,
      ticketId,
      notes,
      scrapThreshold = 5 // Umbral por defecto
    } = req.body;

    // Validaciones
    if (!inventoryId || !quantityToUse) {
      return res.status(400).json({ 
        message: "ID del inventario y cantidad a usar son obligatorios" 
      });
    }

    // Obtener el item del inventario
    const item = await Inventory.findByPk(inventoryId, { transaction });
    if (!item) {
      return res.status(404).json({ 
        message: `Item con ID ${inventoryId} no encontrado` 
      });
    }

    // Verificar que hay suficiente cantidad
    if (item.quantity < quantityToUse) {
      return res.status(400).json({ 
        message: `Cantidad insuficiente. Disponible: ${item.quantity}, solicitado: ${quantityToUse}` 
      });
    }

    // Calcular cantidades
    const remainingAfterUse = item.quantity - quantityToUse;
    let scrapGenerated = 0;
    let scrapReason = null;
    let finalRemaining = remainingAfterUse;

    // Determinar si se genera scrap automático
    if (remainingAfterUse > 0 && remainingAfterUse < scrapThreshold) {
      scrapGenerated = remainingAfterUse;
      finalRemaining = 0;
      scrapReason = `Sobra de ${remainingAfterUse} unidades menor al umbral mínimo (${scrapThreshold})`;
    }

    // Actualizar inventario
    await item.update({
      quantity: finalRemaining
    }, { transaction });

    // Calcular eficiencia e impacto de costo
    const totalConsumed = quantityToUse + scrapGenerated;
    const efficiency = (quantityToUse / totalConsumed) * 100;
    const costImpact = scrapGenerated * (item.cost || 0);

    // Crear registro de scrap
    const scrapRecord = await InventoryScrap.create({
      inventoryId: inventoryId,
      originalQuantity: item.quantity + totalConsumed, // Cantidad antes del consumo
      usedQuantity: quantityToUse,
      scrapQuantity: scrapGenerated,
      scrapReason: scrapReason,
      technicianId: technicianId,
      ticketId: ticketId,
      costImpact: costImpact,
      efficiency: parseFloat(efficiency.toFixed(2)),
      unitType: 'piece', // TODO: Detectar automáticamente según el tipo de producto
      scrapThreshold: scrapThreshold,
      autoGenerated: scrapGenerated > 0,
      notes: notes
    }, { transaction });

    // Crear movimiento de inventario
    await InventoryMovement.create({
      inventoryId: inventoryId,
      type: 'out',
      quantity: quantityToUse,
      reason: `Consumo de material${ticketId ? ` - Ticket ${ticketId}` : ''}`,
      notes: `Usado: ${quantityToUse}, Scrap: ${scrapGenerated}`,
      movedById: technicianId || req.userId,
      reference: ticketId ? `TICKET-${ticketId}` : null
    }, { transaction });

    await transaction.commit();

    // Respuesta con detalles del consumo
    return res.status(200).json({
      message: "Material consumido exitosamente",
      data: {
        itemName: item.name,
        quantityUsed: quantityToUse,
        scrapGenerated: scrapGenerated,
        remainingQuantity: finalRemaining,
        efficiency: parseFloat(efficiency.toFixed(2)),
        costImpact: parseFloat(costImpact.toFixed(2)),
        scrapReason: scrapReason,
        scrapRecordId: scrapRecord.id
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error consumiendo material:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener reporte de scrap por período
exports.getScrapReport = async (req, res) => {
  try {
    const { 
      period = '30d', 
      technicianId, 
      startDate, 
      endDate 
    } = req.query;

    // Calcular fechas del período
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        scrapDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    } else {
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter = {
        scrapDate: {
          [Op.gte]: since
        }
      };
    }

    // Filtro por técnico si se especifica
    const whereClause = { ...dateFilter };
    if (technicianId) {
      whereClause.technicianId = technicianId;
    }

    // Obtener registros de scrap
    const scrapRecords = await InventoryScrap.findAll({
      where: whereClause,
      include: [
        {
          model: Inventory,
          as: 'item',
          attributes: ['id', 'name', 'brand', 'model']
        },
        {
          model: db.User,
          as: 'technician',
          attributes: ['id', 'fullName'],
          required: false
        },
        {
          model: db.Ticket,
          as: 'ticket',
          attributes: ['id', 'title'],
          required: false
        }
      ],
      order: [['scrapDate', 'DESC']]
    });

    // Calcular estadísticas
    const totalRecords = scrapRecords.length;
    const totalScrapQuantity = scrapRecords.reduce((sum, record) => sum + parseFloat(record.scrapQuantity), 0);
    const totalUsedQuantity = scrapRecords.reduce((sum, record) => sum + parseFloat(record.usedQuantity), 0);
    const totalCostImpact = scrapRecords.reduce((sum, record) => sum + parseFloat(record.costImpact), 0);
    const averageEfficiency = totalRecords > 0 
      ? scrapRecords.reduce((sum, record) => sum + parseFloat(record.efficiency), 0) / totalRecords 
      : 100;

    // Agrupar por técnico
    const byTechnician = {};
    scrapRecords.forEach(record => {
      const techName = record.technician ? record.technician.fullName : 'Sin asignar';
      if (!byTechnician[techName]) {
        byTechnician[techName] = {
          totalScrap: 0,
          totalUsed: 0,
          totalCost: 0,
          records: 0,
          avgEfficiency: 0
        };
      }
      byTechnician[techName].totalScrap += parseFloat(record.scrapQuantity);
      byTechnician[techName].totalUsed += parseFloat(record.usedQuantity);
      byTechnician[techName].totalCost += parseFloat(record.costImpact);
      byTechnician[techName].records++;
    });

    // Calcular eficiencia promedio por técnico
    Object.keys(byTechnician).forEach(techName => {
      const techRecords = scrapRecords.filter(r => 
        (r.technician ? r.technician.fullName : 'Sin asignar') === techName
      );
      byTechnician[techName].avgEfficiency = techRecords.length > 0
        ? techRecords.reduce((sum, r) => sum + parseFloat(r.efficiency), 0) / techRecords.length
        : 100;
    });

    // Agrupar por producto
    const byProduct = {};
    scrapRecords.forEach(record => {
      const productName = `${record.item.brand} ${record.item.model}`;
      if (!byProduct[productName]) {
        byProduct[productName] = {
          totalScrap: 0,
          totalCost: 0,
          records: 0
        };
      }
      byProduct[productName].totalScrap += parseFloat(record.scrapQuantity);
      byProduct[productName].totalCost += parseFloat(record.costImpact);
      byProduct[productName].records++;
    });

    return res.status(200).json({
      success: true,
      data: {
        period: period,
        summary: {
          totalRecords,
          totalScrapQuantity: parseFloat(totalScrapQuantity.toFixed(3)),
          totalUsedQuantity: parseFloat(totalUsedQuantity.toFixed(3)),
          totalCostImpact: parseFloat(totalCostImpact.toFixed(2)),
          averageEfficiency: parseFloat(averageEfficiency.toFixed(2)),
          scrapRate: totalUsedQuantity > 0 
            ? parseFloat(((totalScrapQuantity / (totalUsedQuantity + totalScrapQuantity)) * 100).toFixed(2))
            : 0
        },
        byTechnician: Object.entries(byTechnician).map(([name, data]) => ({
          technician: name,
          totalScrap: parseFloat(data.totalScrap.toFixed(3)),
          totalUsed: parseFloat(data.totalUsed.toFixed(3)),
          totalCost: parseFloat(data.totalCost.toFixed(2)),
          records: data.records,
          efficiency: parseFloat(data.avgEfficiency.toFixed(2))
        })).sort((a, b) => b.totalCost - a.totalCost),
        byProduct: Object.entries(byProduct).map(([name, data]) => ({
          product: name,
          totalScrap: parseFloat(data.totalScrap.toFixed(3)),
          totalCost: parseFloat(data.totalCost.toFixed(2)),
          records: data.records
        })).sort((a, b) => b.totalCost - a.totalCost),
        records: scrapRecords.slice(0, 50) // Limitar a 50 registros más recientes
      }
    });

  } catch (error) {
    console.error("Error obteniendo reporte de scrap:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener dashboard de eficiencia
exports.getEfficiencyDashboard = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Obtener estadísticas generales
    const scrapStats = await InventoryScrap.findAll({
      where: {
        scrapDate: { [Op.gte]: since }
      },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOperations'],
        [db.sequelize.fn('SUM', db.sequelize.col('usedQuantity')), 'totalUsed'],
        [db.sequelize.fn('SUM', db.sequelize.col('scrapQuantity')), 'totalScrap'],
        [db.sequelize.fn('SUM', db.sequelize.col('costImpact')), 'totalCost'],
        [db.sequelize.fn('AVG', db.sequelize.col('efficiency')), 'avgEfficiency']
      ],
      raw: true
    });

    // Top 5 técnicos con mejor eficiencia
    const topTechnicians = await InventoryScrap.findAll({
      where: {
        scrapDate: { [Op.gte]: since },
        technicianId: { [Op.not]: null }
      },
      include: [
        {
          model: db.User,
          as: 'technician',
          attributes: ['id', 'fullName']
        }
      ],
      attributes: [
        'technicianId',
        [db.sequelize.fn('COUNT', db.sequelize.col('InventoryScrap.id')), 'operations'],
        [db.sequelize.fn('AVG', db.sequelize.col('efficiency')), 'avgEfficiency'],
        [db.sequelize.fn('SUM', db.sequelize.col('costImpact')), 'totalCost']
      ],
      group: ['technicianId', 'technician.id'],
      order: [[db.sequelize.fn('AVG', db.sequelize.col('efficiency')), 'DESC']],
      limit: 5
    });

    // Productos con mayor scrap
    const topScrapProducts = await InventoryScrap.findAll({
      where: {
        scrapDate: { [Op.gte]: since }
      },
      include: [
        {
          model: Inventory,
          as: 'item',
          attributes: ['name', 'brand', 'model']
        }
      ],
      attributes: [
        'inventoryId',
        [db.sequelize.fn('SUM', db.sequelize.col('scrapQuantity')), 'totalScrap'],
        [db.sequelize.fn('SUM', db.sequelize.col('costImpact')), 'totalCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('InventoryScrap.id')), 'occurrences']
      ],
      group: ['inventoryId', 'item.id'],
      order: [[db.sequelize.fn('SUM', db.sequelize.col('costImpact')), 'DESC']],
      limit: 10
    });

    const stats = scrapStats[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        period,
        summary: {
          totalOperations: parseInt(stats.totalOperations) || 0,
          totalUsed: parseFloat(stats.totalUsed) || 0,
          totalScrap: parseFloat(stats.totalScrap) || 0,
          totalCost: parseFloat(stats.totalCost) || 0,
          avgEfficiency: parseFloat(stats.avgEfficiency) || 100,
          scrapRate: stats.totalUsed > 0 
            ? parseFloat(((stats.totalScrap / (parseFloat(stats.totalUsed) + parseFloat(stats.totalScrap))) * 100).toFixed(2))
            : 0
        },
        topTechnicians: topTechnicians.map(tech => ({
          id: tech.technicianId,
          name: tech.technician.fullName,
          operations: parseInt(tech.dataValues.operations),
          efficiency: parseFloat(tech.dataValues.avgEfficiency).toFixed(2),
          totalCost: parseFloat(tech.dataValues.totalCost).toFixed(2)
        })),
        topScrapProducts: topScrapProducts.map(product => ({
          id: product.inventoryId,
          name: `${product.item.brand} ${product.item.model}`,
          totalScrap: parseFloat(product.dataValues.totalScrap).toFixed(3),
          totalCost: parseFloat(product.dataValues.totalCost).toFixed(2),
          occurrences: parseInt(product.dataValues.occurrences)
        }))
      }
    });

  } catch (error) {
    console.error("Error obteniendo dashboard de eficiencia:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener plantillas de productos (productos únicos por nombre/marca/modelo)
exports.getProductTemplates = async (req, res) => {
  try {
    // Obtener productos únicos agrupados por nombre, marca y modelo
    const templates = await Inventory.findAll({
      attributes: [
        [db.sequelize.fn('DISTINCT', db.sequelize.col('name')), 'name'],
        'brand',
        'model',
        [db.sequelize.fn('AVG', db.sequelize.col('cost')), 'avgCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalItems']
      ],
      group: ['name', 'brand', 'model'],
      order: [['name', 'ASC'], ['brand', 'ASC'], ['model', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: templates.map(template => ({
        name: template.dataValues.name,
        brand: template.brand,
        model: template.model,
        avgCost: parseFloat(template.dataValues.avgCost).toFixed(2),
        totalItems: parseInt(template.dataValues.totalItems)
      }))
    });

  } catch (error) {
    console.error("Error obteniendo plantillas de productos:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ================== INVENTORY TYPES ==================

// Obtener todos los tipos de inventario
exports.getAllTypes = async (req, res) => {
  try {
    const { includeCategory } = req.query;

    // Configurar opciones de consulta
    const options = {
      order: [['name', 'ASC']]
    };

    // Incluir categoría si se solicita
    if (includeCategory === 'true') {
      options.include = [
        {
          model: InventoryCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'active']
        }
      ];
    }

    // Obtener tipos
    const types = await InventoryType.findAll(options);

    return res.status(200).json({
      success: true,
      data: types
    });

  } catch (error) {
    console.error("Error obteniendo tipos de inventario:", error);
    return res.status(500).json({ message: error.message });
  }
};