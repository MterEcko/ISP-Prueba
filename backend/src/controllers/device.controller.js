const db = require('../models');
const Device = db.Device;
const Node = db.Node;
const Sector = db.Sector;
const Client = db.Client;
const Op = db.Sequelize.Op;

// Servicios para APIs de dispositivos (simulados por ahora)
const MikrotikService = require('../services/mikrotik.service');
const UbiquitiService = require('../services/ubiquiti.service');

// Crear un nuevo dispositivo
exports.create = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      brand, 
      model, 
      ipAddress, 
      macAddress, 
      username, 
      password, 
      apiKey, 
      apiPort, 
      nodeId, 
      sectorId, 
      clientId, 
      location, 
      latitude, 
      longitude, 
      notes 
    } = req.body;
    
    // Validaciones básicas
    if (!name || !type || !brand) {
      return res.status(400).json({
        message: "Nombre, tipo y marca son campos obligatorios"
      });
    }
    
    // Crear dispositivo
    const device = await Device.create({
      name,
      type,
      brand,
      model,
      ipAddress,
      macAddress,
      username,
      password,
      apiKey,
      apiPort,
      nodeId,
      sectorId,
      clientId,
      location,
      latitude,
      longitude,
      notes,
      status: 'unknown',
      lastSeen: null
    });
    
    // Intentar verificar conexión si tiene IP y credenciales
    if (ipAddress && ((username && password) || apiKey)) {
      try {
        let isConnected = false;
        
        // Seleccionar el servicio adecuado según la marca
        if (brand === 'mikrotik') {
          isConnected = await MikrotikService.testConnection(ipAddress, apiPort, username, password);
        } else if (brand === 'ubiquiti') {
          isConnected = await UbiquitiService.testConnection(ipAddress, username, password, apiKey);
        }
        
        // Actualizar estado si se pudo conectar
        if (isConnected) {
          await device.update({
            status: 'online',
            lastSeen: new Date()
          });
        }
      } catch (error) {
        console.error("Error al verificar conexión con el dispositivo:", error);
        // No interrumpimos el flujo, simplemente dejamos el estado como 'unknown'
      }
    }
    
    // Obtener dispositivo con información relacionada
    const deviceWithDetails = await Device.findByPk(device.id, {
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        },
        {
          model: Sector,
          attributes: ['id', 'name']
        },
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    return res.status(201).json({
      message: "Dispositivo creado exitosamente",
      device: deviceWithDetails
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al crear el dispositivo",
      error: error.message
    });
  }
};

// Obtener todos los dispositivos con filtros
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      type, 
      brand, 
      status, 
      nodeId, 
      sectorId, 
      clientId,
      search 
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = {};
    
    // Aplicar filtros
    if (type) condition.type = type;
    if (brand) condition.brand = brand;
    if (status) condition.status = status;
    if (nodeId) condition.nodeId = nodeId;
    if (sectorId) condition.sectorId = sectorId;
    if (clientId) condition.clientId = clientId;
    
    // Búsqueda por nombre, modelo, IP o ubicación
    if (search) {
      condition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { ipAddress: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Obtener dispositivos
    const { count, rows: devices } = await Device.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        },
        {
          model: Sector,
          attributes: ['id', 'name']
        },
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    return res.json({
      totalItems: count,
      devices,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener los dispositivos",
      error: error.message
    });
  }
};

// Obtener un dispositivo por ID
exports.findOne = async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    const device = await Device.findByPk(deviceId, {
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        },
        {
          model: Sector,
          attributes: ['id', 'name']
        },
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    return res.json(device);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener el dispositivo",
      error: error.message
    });
  }
};

// Actualizar un dispositivo
exports.update = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { 
      name, 
      type, 
      brand, 
      model, 
      ipAddress, 
      macAddress, 
      username, 
      password, 
      apiKey, 
      apiPort, 
      nodeId, 
      sectorId, 
      clientId, 
      location, 
      latitude, 
      longitude, 
      notes 
    } = req.body;
    
    // Verificar si existe el dispositivo
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Preparar datos para actualización
// Preparar datos para actualización
    const updateData = {};
    
    // Actualizar solo los campos proporcionados
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (macAddress !== undefined) updateData.macAddress = macAddress;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (apiPort !== undefined) updateData.apiPort = apiPort;
    if (nodeId !== undefined) updateData.nodeId = nodeId;
    if (sectorId !== undefined) updateData.sectorId = sectorId;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (location !== undefined) updateData.location = location;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (notes !== undefined) updateData.notes = notes;
    
    // Actualizar dispositivo
    await device.update(updateData);
    
    // Si se actualizaron credenciales o IP, intentar verificar conexión
    const credentialsUpdated = 
      ipAddress !== undefined || 
      username !== undefined || 
      password !== undefined || 
      apiKey !== undefined || 
      apiPort !== undefined;
      
    if (credentialsUpdated) {
      try {
        const deviceToCheck = await Device.findByPk(deviceId);
        let isConnected = false;
        
        // Seleccionar el servicio adecuado según la marca
        if (deviceToCheck.brand === 'mikrotik') {
          isConnected = await MikrotikService.testConnection(
            deviceToCheck.ipAddress, 
            deviceToCheck.apiPort, 
            deviceToCheck.username, 
            deviceToCheck.password
          );
        } else if (deviceToCheck.brand === 'ubiquiti') {
          isConnected = await UbiquitiService.testConnection(
            deviceToCheck.ipAddress, 
            deviceToCheck.username, 
            deviceToCheck.password, 
            deviceToCheck.apiKey
          );
        }
        
        // Actualizar estado si se pudo conectar
        if (isConnected) {
          await deviceToCheck.update({
            status: 'online',
            lastSeen: new Date()
          });
        } else {
          await deviceToCheck.update({
            status: 'offline'
          });
        }
      } catch (error) {
        console.error("Error al verificar conexión con el dispositivo:", error);
        // No interrumpimos el flujo, simplemente dejamos el estado como está
      }
    }
    
    // Obtener dispositivo actualizado con información relacionada
    const updatedDevice = await Device.findByPk(deviceId, {
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        },
        {
          model: Sector,
          attributes: ['id', 'name']
        },
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    return res.json({
      message: "Dispositivo actualizado exitosamente",
      device: updatedDevice
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al actualizar el dispositivo",
      error: error.message
    });
  }
};

// Eliminar un dispositivo
exports.delete = async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Verificar si existe el dispositivo
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Eliminar dispositivo
    await device.destroy();
    
    return res.json({
      message: "Dispositivo eliminado exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar el dispositivo",
      error: error.message
    });
  }
};

// Verificar estado del dispositivo
exports.checkStatus = async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Verificar si existe el dispositivo
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Verificar si tiene información suficiente para conexión
    if (!device.ipAddress || (!device.username && !device.apiKey)) {
      return res.status(400).json({
        message: "El dispositivo no tiene configuración suficiente para verificar su estado"
      });
    }
    
    let isConnected = false;
    let deviceInfo = null;
    
    // Seleccionar el servicio adecuado según la marca
    if (device.brand === 'mikrotik') {
      const result = await MikrotikService.getDeviceInfo(
        device.ipAddress, 
        device.apiPort, 
        device.username, 
        device.password
      );
      isConnected = result.connected;
      deviceInfo = result.info;
    } else if (device.brand === 'ubiquiti') {
      const result = await UbiquitiService.getDeviceInfo(
        device.ipAddress, 
        device.username, 
        device.password, 
        device.apiKey
      );
      isConnected = result.connected;
      deviceInfo = result.info;
    } else {
      return res.status(400).json({
        message: `No hay soporte para dispositivos de marca ${device.brand}`
      });
    }
    
    // Actualizar estado del dispositivo
    await device.update({
      status: isConnected ? 'online' : 'offline',
      lastSeen: isConnected ? new Date() : device.lastSeen
    });
    
    return res.json({
      deviceId: device.id,
      name: device.name,
      status: isConnected ? 'online' : 'offline',
      lastSeen: isConnected ? new Date() : device.lastSeen,
      deviceInfo
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al verificar estado del dispositivo",
      error: error.message
    });
  }
};

// Obtener métricas del dispositivo
exports.getMetrics = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { period = '1h' } = req.query; // Período de métricas (1h, 6h, 24h, 7d, 30d)
    
    // Verificar si existe el dispositivo
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Verificar si tiene información suficiente para conexión
    if (!device.ipAddress || (!device.username && !device.apiKey)) {
      return res.status(400).json({
        message: "El dispositivo no tiene configuración suficiente para obtener métricas"
      });
    }
    
    let metrics = null;
    
    // Seleccionar el servicio adecuado según la marca
    if (device.brand === 'mikrotik') {
      metrics = await MikrotikService.getMetrics(
        device.ipAddress, 
        device.apiPort, 
        device.username, 
        device.password,
        period
      );
    } else if (device.brand === 'ubiquiti') {
      metrics = await UbiquitiService.getMetrics(
        device.ipAddress, 
        device.username, 
        device.password, 
        device.apiKey,
        period
      );
    } else {
      return res.status(400).json({
        message: `No hay soporte para dispositivos de marca ${device.brand}`
      });
    }
    
    return res.json({
      deviceId: device.id,
      name: device.name,
      period,
      metrics
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener métricas del dispositivo",
      error: error.message
    });
  }
};

// Ejecutar acción en el dispositivo (reboot, reset, backup, etc.)
exports.executeAction = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({
        message: "Se requiere especificar la acción a ejecutar"
      });
    }
    
    // Verificar si existe el dispositivo
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Verificar si tiene información suficiente para conexión
    if (!device.ipAddress || (!device.username && !device.apiKey)) {
      return res.status(400).json({
        message: "El dispositivo no tiene configuración suficiente para ejecutar acciones"
      });
    }
    
    let result = null;
    
    // Seleccionar el servicio adecuado según la marca
    if (device.brand === 'mikrotik') {
      result = await MikrotikService.executeAction(
        device.ipAddress, 
        device.apiPort, 
        device.username, 
        device.password,
        action
      );
    } else if (device.brand === 'ubiquiti') {
      result = await UbiquitiService.executeAction(
        device.ipAddress, 
        device.username, 
        device.password, 
        device.apiKey,
        action
      );
    } else {
      return res.status(400).json({
        message: `No hay soporte para dispositivos de marca ${device.brand}`
      });
    }
    
    return res.json({
      deviceId: device.id,
      name: device.name,
      action,
      result
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: `Error al ejecutar la acción en el dispositivo: ${error.message}`,
      error: error.message
    });
  }
};