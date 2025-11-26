// backend/src/controllers/inventoryProduct.controller.js
const db = require("../models");
const InventoryProduct = db.InventoryProduct;
const InventoryType = db.InventoryType;

exports.getAll = async (req, res) => {
  try {
    const { typeId, brand, active, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (typeId) where.typeId = typeId;
    if (brand) where.brand = brand;
    if (active !== undefined) where.active = active === 'true';

    const products = await InventoryProduct.findAndCountAll({
      where,
      include: [{ model: InventoryType, as: 'type' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['brand', 'ASC'], ['model', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(products.count / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await InventoryProduct.findByPk(req.params.id, {
      include: [{ model: InventoryType, as: 'type' }]
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { typeId, brand, model, partNumber, description, purchasePrice, salePrice, warrantyMonths, specifications, active } = req.body;

    if (!typeId || !brand || !model) {
      return res.status(400).json({ success: false, message: "typeId, brand y model son obligatorios" });
    }

    const type = await InventoryType.findByPk(typeId);
    if (!type) {
      return res.status(404).json({ success: false, message: "Tipo de inventario no encontrado" });
    }

    const product = await InventoryProduct.create({
      typeId, brand, model, partNumber, description, purchasePrice, salePrice,
      warrantyMonths: warrantyMonths || 12,
      specifications: specifications || {},
      active: active !== undefined ? active : true
    });

    return res.status(201).json({ success: true, message: "Producto creado exitosamente", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await InventoryProduct.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const { typeId, brand, model, partNumber, description, purchasePrice, salePrice, warrantyMonths, specifications, active } = req.body;

    if (typeId && typeId !== product.typeId) {
      const type = await InventoryType.findByPk(typeId);
      if (!type) {
        return res.status(404).json({ success: false, message: "Tipo de inventario no encontrado" });
      }
    }

    await product.update({
      typeId: typeId || product.typeId,
      brand: brand || product.brand,
      model: model || product.model,
      partNumber: partNumber !== undefined ? partNumber : product.partNumber,
      description: description !== undefined ? description : product.description,
      purchasePrice: purchasePrice !== undefined ? purchasePrice : product.purchasePrice,
      salePrice: salePrice !== undefined ? salePrice : product.salePrice,
      warrantyMonths: warrantyMonths !== undefined ? warrantyMonths : product.warrantyMonths,
      specifications: specifications || product.specifications,
      active: active !== undefined ? active : product.active
    });

    return res.status(200).json({ success: true, message: "Producto actualizado exitosamente", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const product = await InventoryProduct.findByPk(req.params.id);
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    // Verificar si hay inventario usando este producto
    const inventoryCount = await db.Inventory.count({ where: { productId: req.params.id } });
    if (inventoryCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el producto porque tiene ${inventoryCount} item(s) de inventario asociado(s)`
      });
    }

    await product.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ success: true, message: "Producto eliminado exitosamente" });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};
