// backend/src/controllers/inventoryCategory.controller.js
const db = require("../models");
const InventoryCategory = db.InventoryCategory;

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active !== undefined) where.active = active === 'true';

    const categories = await InventoryCategory.findAll({
      where,
      order: [['name', 'ASC']]
    });

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const category = await InventoryCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    const category = await InventoryCategory.create({
      name,
      description,
      active: active !== undefined ? active : true
    });

    return res.status(201).json({ success: true, message: "Categoría creada exitosamente", data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await InventoryCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    const { name, description, active } = req.body;
    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      active: active !== undefined ? active : category.active
    });

    return res.status(200).json({ success: true, message: "Categoría actualizada exitosamente", data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const category = await InventoryCategory.findByPk(req.params.id);
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    // Verificar si hay tipos de inventario usando esta categoría
    const typesCount = await db.InventoryType.count({ where: { categoryId: req.params.id } });
    if (typesCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${typesCount} tipo(s) de inventario asociado(s)`
      });
    }

    await category.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ success: true, message: "Categoría eliminada exitosamente" });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};
