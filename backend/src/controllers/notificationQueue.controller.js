// backend/src/controllers/notificationQueue.controller.js
const db = require("../models");
const NotificationQueue = db.NotificationQueue;

exports.getAll = async (req, res) => {
  try {
    const { clientId, status, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const queue = await NotificationQueue.findAndCountAll({
      where,
      include: [
        { model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] },
        { model: db.CommunicationChannel, as: 'channel', attributes: ['id', 'type'] },
        { model: db.MessageTemplate, as: 'template', attributes: ['id', 'name'] },
        { model: db.NotificationRule, as: 'rule', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['priority', 'DESC'], ['scheduledFor', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: queue.rows,
      pagination: { total: queue.count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(queue.count / limit) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await NotificationQueue.findByPk(req.params.id, {
      include: [
        { model: db.Client, as: 'client' },
        { model: db.CommunicationChannel, as: 'channel' },
        { model: db.MessageTemplate, as: 'template' },
        { model: db.NotificationRule, as: 'rule' }
      ]
    });
    if (!item) return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { clientId, channelId, templateId, ruleId, recipient, messageData, scheduledFor, priority } = req.body;

    if (!channelId || !recipient || !messageData || !scheduledFor) {
      return res.status(400).json({ success: false, message: "channelId, recipient, messageData y scheduledFor son obligatorios" });
    }

    const item = await NotificationQueue.create({
      clientId, channelId, templateId, ruleId, recipient, messageData, scheduledFor, priority: priority || 'normal'
    });

    return res.status(201).json({ success: true, message: "Notificación encolada exitosamente", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await NotificationQueue.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Notificación no encontrada" });

    const { status, attempts, processedAt, result } = req.body;
    await item.update({
      status: status || item.status,
      attempts: attempts !== undefined ? attempts : item.attempts,
      processedAt: processedAt || item.processedAt,
      result: result !== undefined ? result : item.result
    });

    return res.status(200).json({ success: true, message: "Notificación actualizada exitosamente", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const item = await NotificationQueue.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Notificación no encontrada" });

    if (item.status === 'processing') {
      return res.status(400).json({ success: false, message: "No se puede eliminar una notificación en proceso" });
    }

    await item.destroy();
    return res.status(200).json({ success: true, message: "Notificación eliminada exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelPending = async (req, res) => {
  try {
    const item = await NotificationQueue.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Notificación no encontrada" });

    if (item.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Solo se pueden cancelar notificaciones pendientes" });
    }

    await item.update({ status: 'cancelled' });
    return res.status(200).json({ success: true, message: "Notificación cancelada exitosamente", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
