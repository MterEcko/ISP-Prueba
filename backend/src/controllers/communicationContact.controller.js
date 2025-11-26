// backend/src/controllers/communicationContact.controller.js
const db = require("../models");
const CommunicationContact = db.CommunicationContact;

exports.getAll = async (req, res) => {
  try {
    const { clientId, contactType, verified, optIn } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (contactType) where.contactType = contactType;
    if (verified !== undefined) where.verified = verified === 'true';
    if (optIn !== undefined) where.optIn = optIn === 'true';

    const contacts = await CommunicationContact.findAll({
      where,
      include: [{ model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['isPreferred', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const contact = await CommunicationContact.findByPk(req.params.id, {
      include: [{ model: db.Client, as: 'client' }]
    });
    if (!contact) return res.status(404).json({ success: false, message: "Contacto no encontrado" });
    return res.status(200).json({ success: true, data: contact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { clientId, contactType, contactValue, isPreferred, verified, preferences, optIn, notes } = req.body;

    if (!clientId || !contactType || !contactValue) {
      return res.status(400).json({ success: false, message: "clientId, contactType y contactValue son obligatorios" });
    }

    const contact = await CommunicationContact.create({
      clientId, contactType, contactValue, isPreferred: isPreferred || false, verified: verified || false,
      preferences: preferences || {}, optIn: optIn !== undefined ? optIn : true, notes
    });

    return res.status(201).json({ success: true, message: "Contacto creado exitosamente", data: contact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const contact = await CommunicationContact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Contacto no encontrado" });

    const { contactValue, isPreferred, verified, preferences, optIn, notes } = req.body;

    const updateData = {
      contactValue: contactValue || contact.contactValue,
      isPreferred: isPreferred !== undefined ? isPreferred : contact.isPreferred,
      verified: verified !== undefined ? verified : contact.verified,
      preferences: preferences || contact.preferences,
      optIn: optIn !== undefined ? optIn : contact.optIn,
      notes: notes !== undefined ? notes : contact.notes
    };

    if (verified && !contact.verified) {
      updateData.verifiedAt = new Date();
    }

    if (optIn === false && contact.optIn) {
      updateData.optOutDate = new Date();
    }

    await contact.update(updateData);

    return res.status(200).json({ success: true, message: "Contacto actualizado exitosamente", data: contact });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const contact = await CommunicationContact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Contacto no encontrado" });

    await contact.destroy();
    return res.status(200).json({ success: true, message: "Contacto eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
