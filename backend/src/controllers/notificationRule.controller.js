// backend/src/controllers/notificationRule.controller.js
const db = require("../models");
const NotificationRule = db.NotificationRule;

exports.getAll = async (req, res) => {
  try {
    const { eventType, channelType, active } = req.query;
    const where = {};
    if (eventType) where.eventType = eventType;
    if (channelType) where.channelType = channelType;
    if (active !== undefined) where.active = active === 'true';

    const rules = await NotificationRule.findAll({
      where,
      include: [{ model: db.MessageTemplate, as: 'template', attributes: ['id', 'name'] }],
      order: [['priority', 'DESC'], ['name', 'ASC']]
    });

    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const rule = await NotificationRule.findByPk(req.params.id, {
      include: [{ model: db.MessageTemplate, as: 'template' }]
    });
    if (!rule) return res.status(404).json({ success: false, message: "Regla no encontrada" });
    return res.status(200).json({ success: true, data: rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, eventType, triggerCondition, channelType, templateId, delayMinutes, active, priority } = req.body;

    if (!name || !eventType || !channelType) {
      return res.status(400).json({ success: false, message: "name, eventType y channelType son obligatorios" });
    }

    const rule = await NotificationRule.create({
      name, eventType, triggerCondition: triggerCondition || {}, channelType, templateId, delayMinutes: delayMinutes || 0,
      active: active !== undefined ? active : true,
      priority: priority || 'normal'
    });

    return res.status(201).json({ success: true, message: "Regla creada exitosamente", data: rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const rule = await NotificationRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Regla no encontrada" });

    const { name, eventType, triggerCondition, channelType, templateId, delayMinutes, active, priority } = req.body;
    await rule.update({
      name: name || rule.name,
      eventType: eventType || rule.eventType,
      triggerCondition: triggerCondition !== undefined ? triggerCondition : rule.triggerCondition,
      channelType: channelType || rule.channelType,
      templateId: templateId !== undefined ? templateId : rule.templateId,
      delayMinutes: delayMinutes !== undefined ? delayMinutes : rule.delayMinutes,
      active: active !== undefined ? active : rule.active,
      priority: priority || rule.priority
    });

    return res.status(200).json({ success: true, message: "Regla actualizada exitosamente", data: rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const rule = await NotificationRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Regla no encontrada" });

    await rule.destroy();
    return res.status(200).json({ success: true, message: "Regla eliminada exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
