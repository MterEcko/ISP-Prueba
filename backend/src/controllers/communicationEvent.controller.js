// backend/src/controllers/communicationEvent.controller.js
const db = require("../models");
const CommunicationEvent = db.CommunicationEvent;

exports.getAll = async (req, res) => {
  try {
    const { eventType, clientId, processed, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (eventType) where.eventType = eventType;
    if (clientId) where.clientId = clientId;
    if (processed !== undefined) where.processed = processed === 'true';
    if (priority) where.priority = priority;

    const events = await CommunicationEvent.findAndCountAll({
      where,
      include: [{ model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: events.rows,
      pagination: { total: events.count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(events.count / limit) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const event = await CommunicationEvent.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client' }]
    });
    if (!event) return res.status(404).json({ success: false, message: "Evento no encontrado" });
    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { eventType, entityType, entityId, clientId, eventData, priority } = req.body;

    if (!eventType || !entityType || !entityId) {
      return res.status(400).json({ success: false, message: "eventType, entityType y entityId son obligatorios" });
    }

    const event = await CommunicationEvent.create({
      eventType, entityType, entityId, clientId, eventData: eventData || {}, priority: priority || 'normal'
    });

    return res.status(201).json({ success: true, message: "Evento creado exitosamente", data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const event = await CommunicationEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Evento no encontrado" });

    const { processed, processedAt, notificationsTriggered } = req.body;
    await event.update({
      processed: processed !== undefined ? processed : event.processed,
      processedAt: processedAt || (processed ? new Date() : event.processedAt),
      notificationsTriggered: notificationsTriggered !== undefined ? notificationsTriggered : event.notificationsTriggered
    });

    return res.status(200).json({ success: true, message: "Evento actualizado exitosamente", data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const event = await CommunicationEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Evento no encontrado" });

    await event.destroy();
    return res.status(200).json({ success: true, message: "Evento eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
