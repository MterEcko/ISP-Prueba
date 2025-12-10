// backend/src/controllers/deviceCommand.controller.js
const db = require('../models');
const DeviceCommand = db.DeviceCommand;
const Op = db.Sequelize.Op;

// Obtener comandos disponibles para un tipo de dispositivo
exports.getCommandsByDevice = async (req, res) => {
  try {
    const { brand, deviceType } = req.query;
    
    if (!brand || !deviceType) {
      return res.status(400).json({
        message: "Se requiere marca y tipo de dispositivo"
      });
    }
    
    const commands = await DeviceCommand.findAll({
      where: {
        brand: brand.toLowerCase(),
        deviceType: deviceType,
        active: true
      },
      order: [['category', 'ASC'], ['commandName', 'ASC']]
    });
    
    return res.json(commands);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener comandos",
      error: error.message
    });
  }
};

// Crear nuevo comando
exports.create = async (req, res) => {
  try {
    const command = await DeviceCommand.create(req.body);
    
    return res.status(201).json({
      message: "Comando creado exitosamente",
      command
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al crear comando",
      error: error.message
    });
  }
};

// Actualizar comando
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [updated] = await DeviceCommand.update(req.body, {
      where: { id }
    });
    
    if (!updated) {
      return res.status(404).json({
        message: "Comando no encontrado"
      });
    }
    
    return res.json({
      message: "Comando actualizado exitosamente"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al actualizar comando",
      error: error.message
    });
  }
};

// Desactivar comando
exports.deactivate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [updated] = await DeviceCommand.update(
      { active: false },
      { where: { id } }
    );
    
    if (!updated) {
      return res.status(404).json({
        message: "Comando no encontrado"
      });
    }
    
    return res.json({
      message: "Comando desactivado exitosamente"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al desactivar comando",
      error: error.message
    });
  }
};