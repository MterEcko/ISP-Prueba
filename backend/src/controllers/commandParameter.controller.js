// backend/src/controllers/commandParameter.controller.js
const db = require("../models");
const CommandParameter = db.CommandParameter;
const CommandImplementation = db.CommandImplementation;

exports.getAll = async (req, res) => {
  try {
    const { implementationId } = req.query;
    const where = {};
    if (implementationId) where.implementationId = implementationId;

    const parameters = await CommandParameter.findAll({
      where,
      include: [{ model: CommandImplementation, as: 'implementation' }],
      order: [['order', 'ASC']]
    });

    return res.status(200).json({ success: true, data: parameters });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const parameter = await CommandParameter.findByPk(req.params.id, {
      include: [{ model: CommandImplementation, as: 'implementation' }]
    });

    if (!parameter) {
      return res.status(404).json({ success: false, message: "Parámetro no encontrado" });
    }

    return res.status(200).json({ success: true, data: parameter });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { implementationId, name, type, description, defaultValue, required, validation, order } = req.body;

    if (!implementationId || !name || !type) {
      return res.status(400).json({ success: false, message: "implementationId, name y type son obligatorios" });
    }

    const validTypes = ['string', 'int', 'bool', 'float', 'json'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Tipo inválido. Debe ser: ${validTypes.join(', ')}` });
    }

    const implementation = await CommandImplementation.findByPk(implementationId);
    if (!implementation) {
      return res.status(404).json({ success: false, message: "Implementación no encontrada" });
    }

    const parameter = await CommandParameter.create({
      implementationId, name, type, description, defaultValue, required, validation, order: order || 0
    });

    return res.status(201).json({ success: true, message: "Parámetro creado exitosamente", data: parameter });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const parameter = await CommandParameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ success: false, message: "Parámetro no encontrado" });
    }

    const { name, type, description, defaultValue, required, validation, order } = req.body;

    if (type) {
      const validTypes = ['string', 'int', 'bool', 'float', 'json'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: `Tipo inválido. Debe ser: ${validTypes.join(', ')}` });
      }
    }

    await parameter.update({
      name: name || parameter.name,
      type: type || parameter.type,
      description: description !== undefined ? description : parameter.description,
      defaultValue: defaultValue !== undefined ? defaultValue : parameter.defaultValue,
      required: required !== undefined ? required : parameter.required,
      validation: validation !== undefined ? validation : parameter.validation,
      order: order !== undefined ? order : parameter.order
    });

    return res.status(200).json({ success: true, message: "Parámetro actualizado exitosamente", data: parameter });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const parameter = await CommandParameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ success: false, message: "Parámetro no encontrado" });
    }

    await parameter.destroy();
    return res.status(200).json({ success: true, message: "Parámetro eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
