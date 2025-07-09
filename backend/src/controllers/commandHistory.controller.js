// backend/src/controllers/commandHistory.controller.js

const db = require('../models');
const CommandHistory = db.CommandHistory;
const Device = db.Device;
const User = db.User;
const Op = db.Sequelize.Op;

// Obtener lista de registros de historial de comandos
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      deviceId, 
      userId, 
      success, 
      command, 
      startDate, 
      endDate 
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = {};
    
    // Filtros
    if (deviceId) condition.deviceId = deviceId;
    if (userId) condition.userId = userId;
    if (success !== undefined) condition.success = success === 'true';
    if (command) condition.command = { [Op.like]: `%${command}%` };
    
    // Filtro por rango de fechas
    if (startDate || endDate) {
      condition.createdAt = {};
      if (startDate) condition.createdAt[Op.gte] = new Date(startDate);
      if (endDate) condition.createdAt[Op.lte] = new Date(endDate);
    }
    
    // Obtener registros
    const { count, rows: commandHistories } = await CommandHistory.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress', 'brand']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json({
      totalItems: count,
      commandHistories,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener el historial de comandos",
      error: error.message
    });
  }
};

// Obtener historial de comandos para un dispositivo específico
exports.findByDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { 
      page = 1, 
      size = 10,
      success 
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = { deviceId };
    if (success !== undefined) condition.success = success === 'true';
    
    // Verificar que el dispositivo exista
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    const { count, rows: commandHistories } = await CommandHistory.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json({
      deviceId,
      deviceName: device.name,
      totalItems: count,
      commandHistories,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener el historial de comandos del dispositivo",
      error: error.message
    });
  }
};

// Obtener un registro de historial de comandos por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const commandHistory = await CommandHistory.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress', 'brand']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    if (!commandHistory) {
      return res.status(404).json({
        message: `Registro de historial con ID ${id} no encontrado`
      });
    }
    
    return res.json(commandHistory);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener el registro de historial de comandos",
      error: error.message
    });
  }
};

// Eliminar un registro de historial de comandos
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar si existe el registro
    const commandHistory = await CommandHistory.findByPk(id);
    
    if (!commandHistory) {
      return res.status(404).json({
        message: `Registro de historial con ID ${id} no encontrado`
      });
    }
    
    // Eliminar registro
    await commandHistory.destroy();
    
    return res.json({
      message: "Registro de historial eliminado exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar el registro de historial de comandos",
      error: error.message
    });
  }
};

// Método adicional para limpiar historial antiguo
exports.cleanOldRecords = async (req, res) => {
  try {
    const { 
      olderThanDays = 30,  // Por defecto eliminar registros de más de 30 días
      deviceId 
    } = req.query;
    
    const deletedDate = new Date();
    deletedDate.setDate(deletedDate.getDate() - parseInt(olderThanDays));
    
    const condition = {
      createdAt: { [Op.lt]: deletedDate }
    };
    
    // Si se especifica un deviceId, agregar al filtro
    if (deviceId) condition.deviceId = deviceId;
    
    const { count } = await CommandHistory.destroy({
      where: condition
    });
    
    return res.json({
      message: `Se eliminaron ${count} registros de historial de comandos anteriores a ${deletedDate.toISOString()}`
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al limpiar registros antiguos de historial de comandos",
      error: error.message
    });
  }
};