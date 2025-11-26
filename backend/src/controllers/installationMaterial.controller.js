// backend/src/controllers/installationMaterial.controller.js
const db = require("../models");
const InstallationMaterial = db.InstallationMaterial;

exports.getAll = async (req, res) => {
  try {
    const { ticketId } = req.query;
    const where = {};
    if (ticketId) where.ticketId = ticketId;

    const materials = await InstallationMaterial.findAll({
      where,
      include: [
        { model: db.Ticket, as: 'ticket', attributes: ['id', 'title'] },
        { model: db.Inventory, as: 'item', attributes: ['id', 'serial', 'status'] }
      ],
      order: [['usedAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: materials });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const material = await InstallationMaterial.findByPk(req.params.id, {
      include: [
        { model: db.Ticket, as: 'ticket' },
        { model: db.Inventory, as: 'item' }
      ]
    });
    if (!material) return res.status(404).json({ success: false, message: "Material no encontrado" });
    return res.status(200).json({ success: true, data: material });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { ticketId, itemId, quantityUsed, scrapGenerated, usageType, notes } = req.body;

    if (!ticketId || !itemId || !quantityUsed || !usageType) {
      return res.status(400).json({ success: false, message: "ticketId, itemId, quantityUsed y usageType son obligatorios" });
    }

    const material = await InstallationMaterial.create({
      ticketId, itemId, quantityUsed, scrapGenerated: scrapGenerated || 0, usageType, notes
    });

    return res.status(201).json({ success: true, message: "Material registrado exitosamente", data: material });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const material = await InstallationMaterial.findByPk(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material no encontrado" });

    const { quantityUsed, scrapGenerated, notes } = req.body;
    await material.update({
      quantityUsed: quantityUsed !== undefined ? quantityUsed : material.quantityUsed,
      scrapGenerated: scrapGenerated !== undefined ? scrapGenerated : material.scrapGenerated,
      notes: notes !== undefined ? notes : material.notes
    });

    return res.status(200).json({ success: true, message: "Material actualizado exitosamente", data: material });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const material = await InstallationMaterial.findByPk(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material no encontrado" });

    await material.destroy();
    return res.status(200).json({ success: true, message: "Material eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
