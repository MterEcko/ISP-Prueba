// backend/src/controllers/inventoryTechnician.controller.js

const db = require('../models');
const Inventory = db.Inventory;
const InventoryProduct = db.InventoryProduct;
const InventoryLocation = db.InventoryLocation;
const InventoryMovement = db.InventoryMovement;
const TechnicianInventoryReconciliation = db.TechnicianInventoryReconciliation;
const User = db.User;
const Client = db.Client;
const Op = db.Sequelize.Op;

// Asignar material a técnico
exports.assignToTechnician = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { inventoryId, technicianId, quantity, notes } = req.body;

    if (!inventoryId || !technicianId || !quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "inventoryId, technicianId y quantity son obligatorios"
      });
    }

    // Validar técnico
    const technician = await User.findByPk(technicianId);
    if (!technician) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Técnico con ID ${technicianId} no encontrado`
      });
    }

    // Obtener item de inventario
    const item = await Inventory.findByPk(inventoryId, { transaction });
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Item con ID ${inventoryId} no encontrado`
      });
    }

    // Validar que sea bulk (consumible) o equipment disponible
    if (item.inventoryCategory === 'consumed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No se puede asignar material ya consumido"
      });
    }

    // Validar cantidad disponible
    if (item.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cantidad insuficiente. Disponible: ${item.quantity}, solicitado: ${quantity}`
      });
    }

    let assignedItem;
    let remainingInStock = item.quantity;

    // Si es equipo individual (quantity = 1)
    if (item.inventoryCategory === 'equipment' && quantity === 1) {
      // Simplemente asignar el equipo al técnico
      await item.update({
        assignedToTechnicianId: technicianId,
        assignedAt: new Date(),
        status: 'inUse',
        reconciliationStatus: 'pending'
      }, { transaction });

      assignedItem = item;
    } 
    // Si es consumible a granel (cables, grapas, etc)
    else if (item.inventoryCategory === 'bulk') {
      // Descontar del stock original
      remainingInStock = item.quantity - quantity;
      await item.update({
        quantity: remainingInStock
      }, { transaction });

      // Crear nuevo registro para el técnico
      assignedItem = await Inventory.create({
        batchId: item.batchId,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        model: item.model,
        inventoryCategory: 'assigned_bulk',
        quantity: quantity,
        packages: item.packages ? Math.ceil((quantity / item.quantity) * item.packages) : null,
        unitsPerPackage: item.unitsPerPackage,
        unitType: item.unitType,
        cost: (item.cost / item.quantity) * quantity, // Costo proporcional
        status: 'inUse',
        assignedToTechnicianId: technicianId,
        assignedAt: new Date(),
        parentInventoryId: item.id,
        locationId: null, // Ya no está en almacén
        reconciliationStatus: 'pending'
      }, { transaction });
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Tipo de item no válido para asignación"
      });
    }

    // Crear movimiento
    await InventoryMovement.create({
      inventoryId: item.id,
      type: 'out',
      quantity: quantity,
      reason: `Asignado a técnico ${technician.fullName}`,
      fromLocationId: item.locationId,
      toLocationId: null,
      movedById: req.userId || technicianId || 1,
      notes: notes || `Material asignado a técnico`,
      reference: `TECH-${technicianId}`
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Material asignado al técnico exitosamente",
      data: {
        technician: {
          id: technician.id,
          name: technician.fullName
        },
        assignedItem: {
          id: assignedItem.id,
          name: assignedItem.name,
          quantity: assignedItem.quantity,
          unitType: assignedItem.unitType,
          cost: parseFloat(assignedItem.cost),
          assignedAt: assignedItem.assignedAt
        },
        remainingInStock: item.inventoryCategory === 'bulk' ? remainingInStock : null
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error asignando material a técnico:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener inventario de un técnico
exports.getTechnicianInventory = async (req, res) => {
  try {
    const technicianId = req.params.technicianId;

    // Validar técnico
    const technician = await User.findByPk(technicianId, {
      attributes: ['id', 'fullName', 'username', 'email']
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: `Técnico con ID ${technicianId} no encontrado`
      });
    }

    // Obtener items asignados
    const items = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        inventoryCategory: {
          [Op.in]: ['equipment', 'assigned_bulk']
        },
        status: {
          [Op.notIn]: ['consumed', 'returned']
        }
      },
      include: [
        {
          model: InventoryProduct,
          as: 'product',
          attributes: ['id', 'brand', 'model', 'partNumber']
        },
        {
          model: Inventory,
          as: 'parentItem',
          attributes: ['id', 'name', 'serialNumber']
        }
      ],
      order: [['assignedAt', 'DESC']]
    });

    // Calcular estadísticas
    const stats = {
      totalItems: items.length,
      totalValue: 0,
      byCategory: {
        equipment: { count: 0, value: 0 },
        consumables: { count: 0, value: 0 }
      },
      lowStock: []
    };

    items.forEach(item => {
      const cost = parseFloat(item.cost) || 0;
      stats.totalValue += cost;

      if (item.inventoryCategory === 'equipment') {
        stats.byCategory.equipment.count++;
        stats.byCategory.equipment.value += cost;
      } else {
        stats.byCategory.consumables.count++;
        stats.byCategory.consumables.value += cost;

        // Alertas de stock bajo (consumibles)
        if (item.unitType === 'meters' && item.quantity < 50) {
          stats.lowStock.push({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitType: item.unitType,
            alert: `Stock bajo: ${item.quantity} ${item.unitType}`
          });
        } else if (item.unitType === 'piece' && item.quantity < 10) {
          stats.lowStock.push({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitType: item.unitType,
            alert: `Stock bajo: ${item.quantity} unidades`
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        technician: {
          id: technician.id,
          name: technician.fullName,
          email: technician.email
        },
        inventory: items,
        statistics: {
          totalItems: stats.totalItems,
          totalValue: parseFloat(stats.totalValue.toFixed(2)),
          equipment: {
            count: stats.byCategory.equipment.count,
            value: parseFloat(stats.byCategory.equipment.value.toFixed(2))
          },
          consumables: {
            count: stats.byCategory.consumables.count,
            value: parseFloat(stats.byCategory.consumables.value.toFixed(2))
          },
          alerts: stats.lowStock
        }
      }
    });
  } catch (error) {
    console.error("Error obteniendo inventario de técnico:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Consumir material (instalar en cliente)
exports.consumeMaterial = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      inventoryId,
      technicianId,
      clientId,
      ticketId,
      quantityUsed,
      scrapQuantity = 0,
      notes
    } = req.body;

    if (!inventoryId || !quantityUsed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "inventoryId y quantityUsed son obligatorios"
      });
    }

    // Obtener item
    const item = await Inventory.findByPk(inventoryId, { transaction });
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Item con ID ${inventoryId} no encontrado`
      });
    }

    // Validar que esté asignado al técnico
    if (technicianId && item.assignedToTechnicianId !== technicianId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "El item no está asignado a este técnico"
      });
    }

    // Validar cantidad
    const totalConsumed = quantityUsed + scrapQuantity;
    if (item.quantity < totalConsumed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cantidad insuficiente. Disponible: ${item.quantity}, solicitado: ${totalConsumed}`
      });
    }

    // Descontar del inventario del técnico
    const remainingQuantity = item.quantity - totalConsumed;
    
    if (remainingQuantity === 0) {
      // Si se acabó, marcar como consumido
      await item.update({
        status: 'consumed',
        clientId: clientId,
        installedAt: new Date(),
        quantity: 0,
        reconciliationStatus: 'reconciled'
      }, { transaction });
    } else {
      // Si queda material, solo descontar
      await item.update({
        quantity: remainingQuantity
      }, { transaction });
    }

    // Crear registro del material instalado
    const installedItem = await Inventory.create({
      batchId: item.batchId,
      productId: item.productId,
      name: item.name,
      brand: item.brand,
      model: item.model,
      inventoryCategory: 'consumed',
      quantity: quantityUsed,
      unitType: item.unitType,
      cost: (item.cost / (item.quantity + totalConsumed)) * quantityUsed,
      status: 'installed',
      assignedToTechnicianId: item.assignedToTechnicianId,
      clientId: clientId,
      installedAt: new Date(),
      parentInventoryId: item.id,
      reconciliationStatus: 'reconciled',
      notes: notes
    }, { transaction });

    // Si hay scrap, registrarlo también
    if (scrapQuantity > 0) {
      await Inventory.create({
        batchId: item.batchId,
        productId: item.productId,
        name: `${item.name} (Scrap)`,
        brand: item.brand,
        model: item.model,
        inventoryCategory: 'consumed',
        quantity: scrapQuantity,
        unitType: item.unitType,
        cost: (item.cost / (item.quantity + totalConsumed)) * scrapQuantity,
        status: 'missing',
        assignedToTechnicianId: item.assignedToTechnicianId,
        parentInventoryId: item.id,
        missingReportedAt: new Date(),
        reconciliationStatus: 'reconciled',
        notes: `Scrap generado en instalación: ${notes || ''}`
      }, { transaction });
    }

    // Crear movimiento
    await InventoryMovement.create({
      inventoryId: item.id,
      type: 'out',
      quantity: quantityUsed,
      reason: clientId ? `Instalado en cliente` : 'Consumido',
      movedById: technicianId || req.userId,
      notes: notes,
      reference: ticketId ? `TICKET-${ticketId}` : null
    }, { transaction });

    // Calcular eficiencia
    const efficiency = totalConsumed > 0 ? ((quantityUsed / totalConsumed) * 100).toFixed(2) : 100;

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Material consumido y registrado exitosamente",
      data: {
        installedItemId: installedItem.id,
        quantityUsed,
        scrapGenerated: scrapQuantity,
        remainingQuantity,
        efficiency: parseFloat(efficiency),
        costImpact: parseFloat(installedItem.cost),
        client: clientId ? { id: clientId } : null
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error consumiendo material:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Devolver material al almacén
exports.returnToWarehouse = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const inventoryId = req.params.id;
    const { quantityReturned, locationId, reason, notes } = req.body;

    if (!quantityReturned || !locationId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "quantityReturned y locationId son obligatorios"
      });
    }

    // Validar ubicación
    const location = await InventoryLocation.findByPk(locationId);
    if (!location) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Ubicación con ID ${locationId} no encontrada`
      });
    }

    // Obtener item del técnico
    const item = await Inventory.findByPk(inventoryId, { transaction });
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Item con ID ${inventoryId} no encontrado`
      });
    }

    if (item.inventoryCategory !== 'assigned_bulk') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Solo se pueden devolver consumibles asignados"
      });
    }

    if (item.quantity < quantityReturned) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cantidad insuficiente. Disponible: ${item.quantity}, a devolver: ${quantityReturned}`
      });
    }

    // Descontar del inventario del técnico
    const remainingWithTech = item.quantity - quantityReturned;
    
    if (remainingWithTech === 0) {
      await item.update({
        status: 'returned',
        returnedAt: new Date(),
        quantity: 0,
        reconciliationStatus: 'reconciled'
      }, { transaction });
    } else {
      await item.update({
        quantity: remainingWithTech
      }, { transaction });
    }

    // Buscar si existe item del mismo producto en el almacén
    let warehouseItem = null;
    if (item.productId) {
      warehouseItem = await Inventory.findOne({
        where: {
          productId: item.productId,
          inventoryCategory: 'bulk',
          locationId: locationId,
          status: 'available'
        },
        transaction
      });
    }

    if (warehouseItem) {
      // Agregar al stock existente
      await warehouseItem.update({
        quantity: warehouseItem.quantity + quantityReturned
      }, { transaction });
    } else {
      // Crear nuevo registro en almacén
      warehouseItem = await Inventory.create({
        batchId: item.batchId,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        model: item.model,
        inventoryCategory: 'bulk',
        quantity: quantityReturned,
        unitType: item.unitType,
        cost: (item.cost / item.quantity) * quantityReturned,
        status: 'available',
        locationId: locationId,
        parentInventoryId: item.parentInventoryId || item.id
      }, { transaction });
    }

    // Crear movimiento
    await InventoryMovement.create({
      inventoryId: item.id,
      type: 'in',
      quantity: quantityReturned,
      reason: reason || 'Devolución de técnico',
      fromLocationId: null,
      toLocationId: locationId,
      movedById: req.userId  || 1,
      notes: notes
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Material devuelto al almacén exitosamente",
      data: {
        quantityReturned,
        remainingWithTechnician: remainingWithTech,
        warehouseItemId: warehouseItem.id,
        newWarehouseStock: warehouseItem.quantity
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error devolviendo material:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reportar material perdido
exports.reportMissing = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const inventoryId = req.params.id;
    const { quantity, reason, notes } = req.body;

    if (!quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "quantity es obligatoria"
      });
    }

    const item = await Inventory.findByPk(inventoryId, { transaction });
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Item con ID ${inventoryId} no encontrado`
      });
    }

    if (item.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cantidad insuficiente. Disponible: ${item.quantity}`
      });
    }

    // Descontar del inventario del técnico
    const remainingQuantity = item.quantity - quantity;
    
    if (remainingQuantity === 0) {
      await item.update({
        status: 'missing',
        missingReportedAt: new Date(),
        quantity: 0,
        reconciliationStatus: 'discrepancy'
      }, { transaction });
    } else {
      await item.update({
        quantity: remainingQuantity
      }, { transaction });
    }

    // Crear registro del material perdido
    const missingItem = await Inventory.create({
      batchId: item.batchId,
      productId: item.productId,
      name: item.name,
      brand: item.brand,
      model: item.model,
      inventoryCategory: 'consumed',
      quantity: quantity,
      unitType: item.unitType,
      cost: (item.cost / item.quantity) * quantity,
      status: 'missing',
      assignedToTechnicianId: item.assignedToTechnicianId,
      missingReportedAt: new Date(),
      parentInventoryId: item.id,
      reconciliationStatus: 'discrepancy',
      notes: `PERDIDO: ${reason || 'Sin especificar'}. ${notes || ''}`
    }, { transaction });

    // Crear movimiento de ajuste
    await InventoryMovement.create({
      inventoryId: item.id,
      type: 'adjustment',
      quantity: quantity,
      reason: `Material reportado como perdido: ${reason || 'Sin especificar'}`,
      movedById: req.userId  || 1,
      notes: notes
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Material reportado como perdido",
      data: {
        missingItemId: missingItem.id,
        quantityLost: quantity,
        costImpact: parseFloat(missingItem.cost),
        remainingQuantity
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error reportando material perdido:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};