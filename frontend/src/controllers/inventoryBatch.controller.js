// backend/src/controllers/inventoryBatch.controller.js

const db = require('../models');
const InventoryBatch = db.InventoryBatch;
const Inventory = db.Inventory;
const InventoryProduct = db.InventoryProduct;
const InventoryLocation = db.InventoryLocation;
const User = db.User;
const Op = db.Sequelize.Op;

// Crear nuevo lote de compra
exports.create = async (req, res) => {
  try {
    const { supplier, invoiceNumber, purchaseDate, locationId, notes } = req.body;

    // Validar ubicación si se proporciona
    if (locationId) {
      const location = await InventoryLocation.findByPk(locationId);
      if (!location) {
        return res.status(404).json({ 
          message: `Ubicación con ID ${locationId} no encontrada` 
        });
      }
    }

    // Crear lote (batchNumber se genera automáticamente en el hook)
    const batch = await InventoryBatch.create({
      supplier,
      invoiceNumber,
      purchaseDate: purchaseDate || new Date(),
      locationId,
      receivedByUserId: req.userId,
      status: 'in_progress',
      notes
    });

    return res.status(201).json({
      success: true,
      message: "Lote creado exitosamente. Comienza a agregar items.",
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        purchaseDate: batch.purchaseDate
      }
    });
  } catch (error) {
    console.error("Error creando lote:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Agregar items al lote
exports.addItems = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const batchId = req.params.id;
    const { productType, productId, items, packageInfo, unitCost, packageCost } = req.body;

    // Validar lote
    const batch = await InventoryBatch.findByPk(batchId);
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: `Lote con ID ${batchId} no encontrado` 
      });
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: `No se pueden agregar items a un lote ${batch.status}` 
      });
    }

    // Validar producto si se proporciona
    let product = null;
    if (productId) {
      product = await InventoryProduct.findByPk(productId);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          message: `Producto con ID ${productId} no encontrado` 
        });
      }
    }

    let createdItems = [];
    let totalCost = 0;

    // CASO 1: Equipos Serializados (individual)
    if (productType === 'serialized' && Array.isArray(items)) {
      for (const item of items) {
        const inventoryItem = await Inventory.create({
          batchId: batch.id,
          productId: product ? product.id : null,
          name: product ? `${product.brand} ${product.model}` : (item.name || 'Item sin nombre'),
          brand: product ? product.brand : item.brand,
          model: product ? product.model : item.model,
          serialNumber: item.serialNumber,
          macAddress: item.macAddress,
          inventoryCategory: 'equipment',
          quantity: 1,
          unitType: 'piece',
          cost: item.cost || unitCost || (product ? product.lastPurchasePrice : 0),
          status: 'available',
          locationId: batch.locationId,
          purchaseDate: batch.purchaseDate
        }, { transaction });

        createdItems.push(inventoryItem);
        totalCost += parseFloat(inventoryItem.cost);
      }
    }

    // CASO 2: Consumibles Empaquetados
    else if (productType === 'packaged' && packageInfo) {
      const { totalPackages, unitsPerPackage, packageSerial, trackPackages } = packageInfo;
      
      if (trackPackages) {
        // Crear registro por cada paquete
        for (let i = 1; i <= totalPackages; i++) {
          const inventoryItem = await Inventory.create({
            batchId: batch.id,
            productId: product ? product.id : null,
            name: product ? `${product.brand} ${product.model}` : (req.body.name || 'Material sin nombre'),
            brand: product ? product.brand : req.body.brand || null,
            model: product ? product.model : req.body.model || null,
            serialNumber: packageSerial ? `PKG-${i}` : null,
            inventoryCategory: 'bulk',
            quantity: unitsPerPackage,
            packages: 1,
            unitsPerPackage: unitsPerPackage,
            unitType: product ? product.unitType : 'piece',
            cost: packageCost || unitCost * unitsPerPackage,
            status: 'available',
            locationId: batch.locationId,
            purchaseDate: batch.purchaseDate
          }, { transaction });

          createdItems.push(inventoryItem);
          totalCost += parseFloat(inventoryItem.cost);
        }
      } else {
        // Crear 1 solo registro con cantidad total
        const inventoryItem = await Inventory.create({
          batchId: batch.id,
          productId: product ? product.id : null,
          name: product ? `${product.brand} ${product.model}` : (req.body.name || 'Material sin nombre'),
          brand: product ? product.brand : req.body.brand || null,
          model: product ? product.model : req.body.model || null,
          inventoryCategory: 'bulk',
          quantity: totalPackages * unitsPerPackage,
          packages: totalPackages,
          unitsPerPackage: unitsPerPackage,
          unitType: product ? product.unitType : 'piece',
          cost: totalPackages * (packageCost || unitCost * unitsPerPackage),
          status: 'available',
          locationId: batch.locationId,
          purchaseDate: batch.purchaseDate
        }, { transaction });

        createdItems.push(inventoryItem);
        totalCost += parseFloat(inventoryItem.cost);
      }
    }

    // CASO 3: Consumibles a Granel (bobinas, rollos)
    else if (productType === 'bulk' && Array.isArray(items)) {
      for (const item of items) {
        const inventoryItem = await Inventory.create({
          batchId: batch.id,
          productId: product ? product.id : null,
          name: product ? `${product.brand} ${product.model}` : item.name,
          brand: product ? product.brand : item.brand,
          model: product ? product.model : item.model,
          serialNumber: item.serialNumber, // Serial de bobina
          inventoryCategory: 'bulk',
          quantity: item.quantity,
          unitType: item.unitType || (product ? product.unitType : 'meters'),
          cost: item.cost || unitCost * item.quantity,
          status: 'available',
          locationId: batch.locationId,
          purchaseDate: batch.purchaseDate
        }, { transaction });

        createdItems.push(inventoryItem);
        totalCost += parseFloat(inventoryItem.cost);
      }
    }

    // Actualizar totales del lote
    await batch.update({
      totalItems: batch.totalItems + createdItems.length,
      totalCost: parseFloat(batch.totalCost) + totalCost
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: `${createdItems.length} items agregados al lote exitosamente`,
      data: {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        itemsAdded: createdItems.length,
        costAdded: parseFloat(totalCost.toFixed(2)),
        newTotalItems: batch.totalItems + createdItems.length,
        newTotalCost: parseFloat((parseFloat(batch.totalCost) + totalCost).toFixed(2))
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error agregando items al lote:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Completar lote
exports.complete = async (req, res) => {
  try {
    const batchId = req.params.id;

    const batch = await InventoryBatch.findByPk(batchId, {
      include: [
        {
          model: Inventory,
          as: 'items',
          attributes: ['id', 'name', 'serialNumber', 'cost', 'inventoryCategory']
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false,
        message: `Lote con ID ${batchId} no encontrado` 
      });
    }

    if (batch.status === 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'El lote ya está completado' 
      });
    }

    // Actualizar estado
    await batch.update({
      status: 'completed',
      completedAt: new Date()
    });

    // Generar resumen
    const breakdown = {
      serialized: { count: 0, cost: 0 },
      packaged: { count: 0, cost: 0 },
      bulk: { count: 0, cost: 0 }
    };

    batch.items.forEach(item => {
      const category = item.inventoryCategory === 'equipment' ? 'serialized' : 
                      item.packages ? 'packaged' : 'bulk';
      
      breakdown[category].count++;
      breakdown[category].cost += parseFloat(item.cost);
    });

    return res.status(200).json({
      success: true,
      message: "Lote completado exitosamente",
      data: {
        batchNumber: batch.batchNumber,
        summary: {
          totalItems: batch.totalItems,
          inventoryRecords: batch.items.length,
          totalCost: parseFloat(batch.totalCost),
          breakdown: {
            serialized: {
              count: breakdown.serialized.count,
              cost: parseFloat(breakdown.serialized.cost.toFixed(2))
            },
            packaged: {
              count: breakdown.packaged.count,
              cost: parseFloat(breakdown.packaged.cost.toFixed(2))
            },
            bulk: {
              count: breakdown.bulk.count,
              cost: parseFloat(breakdown.bulk.cost.toFixed(2))
            }
          }
        },
        status: batch.status,
        completedAt: batch.completedAt
      }
    });
  } catch (error) {
    console.error("Error completando lote:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Listar todos los lotes
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      status, 
      supplier,
      dateFrom,
      dateTo 
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (status) condition.status = status;
    if (supplier) condition.supplier = { [Op.like]: `%${supplier}%` };
    
    if (dateFrom || dateTo) {
      condition.purchaseDate = {};
      if (dateFrom) condition.purchaseDate[Op.gte] = dateFrom;
      if (dateTo) condition.purchaseDate[Op.lte] = dateTo;
    }

    const { count, rows: batches } = await InventoryBatch.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'receivedBy',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        totalItems: count,
        batches,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error obteniendo lotes:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener lote por ID con detalles
exports.findOne = async (req, res) => {
  try {
    const batchId = req.params.id;

    const batch = await InventoryBatch.findByPk(batchId, {
      include: [
        {
          model: User,
          as: 'receivedBy',
          attributes: ['id', 'fullName', 'username', 'email']
        },
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Inventory,
          as: 'items',
          include: [
            {
              model: InventoryProduct,
              as: 'product',
              attributes: ['id', 'brand', 'model']
            }
          ]
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false,
        message: `Lote con ID ${batchId} no encontrado` 
      });
    }

    return res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error("Error obteniendo lote:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Cancelar lote
exports.cancel = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const batchId = req.params.id;
    const { reason } = req.body;

    const batch = await InventoryBatch.findByPk(batchId, { transaction });

    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: `Lote con ID ${batchId} no encontrado` 
      });
    }

    if (batch.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: 'No se puede cancelar un lote completado' 
      });
    }

    // Eliminar items del lote
    await Inventory.destroy({
      where: { batchId: batch.id },
      transaction
    });

    // Actualizar lote
    await batch.update({
      status: 'cancelled',
      notes: `${batch.notes || ''}\nCANCELADO: ${reason || 'Sin razón especificada'}`
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Lote cancelado exitosamente"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error cancelando lote:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};