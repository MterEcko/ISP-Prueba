// backend/src/controllers/deviceCredential.controller.js

const db = require('../models');
const DeviceCredential = db.DeviceCredential;
const Device = db.Device;
const Op = db.Sequelize.Op;

// Servicios de conexión
const MikrotikService = require('../services/mikrotik.service');
//const UbiquitiService = require('../services/ubiquiti.service');


// Crear nuevas credenciales para un dispositivo
exports.create = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const {
      connectionType,
      username,
      password,
      port,
      apiKey,
      sshKeyPath,
      snmpVersion,
      snmpCommunity,
      snmpSecurityLevel,
      snmpAuthProtocol,
      snmpAuthKey,
      snmpPrivProtocol,
      snmpPrivKey,
      notes
    } = req.body;
    
    // Verificar que el dispositivo existe
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Verificar si ya existen credenciales activas para este dispositivo
    const existingCredentials = await DeviceCredential.findOne({
      where: { deviceId, isActive: true }
    });
    
//    if (existingCredentials) {
//      return res.status(400).json({
//        message: "Ya existen credenciales activas para este dispositivo. Actualice las existentes o desactívelas primero."
//      });
//    }
    

    // Validar campos básicos
    if (!connectionType) {
      return res.status(400).json({
        message: "Se requiere especificar el tipo de conexión"
      });
    }

    if (!username && !apiKey && connectionType !== 'snmp') {
      return res.status(400).json({
        message: "Se requiere usuario, API key o configuración SNMP"
      });
    }
    // Validaciones según el tipo de conexión
    if (connectionType === 'ssh' && (!username || !password)) {
      return res.status(400).json({
        message: "Para conexión SSH se requiere usuario y contraseña"
      });
    }
    
    if (connectionType === 'snmp' && !snmpCommunity) {
      return res.status(400).json({
        message: "Para conexión SNMP se requiere community string"
      });
    }
    
    // Crear las credenciales
    const deviceCredential = await DeviceCredential.create({
      deviceId,
      connectionType,
      username,
      password, // En producción, esto debería encriptarse
      port: port || (connectionType === 'ssh' ? 22 : connectionType === 'snmp' ? 161 : null),
      apiKey,
      sshKeyPath,
      snmpVersion: snmpVersion || 'v2c',
      snmpCommunity,
      snmpSecurityLevel,
      snmpAuthProtocol,
      snmpAuthKey,
      snmpPrivProtocol,
      snmpPrivKey,
      notes,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      lastUsed: null,
      rotationDate: null
    });
    
    return res.status(201).json({
      message: "Credenciales creadas exitosamente",
      deviceCredential: {
        id: deviceCredential.id,
        deviceId: deviceCredential.deviceId,
        connectionType: deviceCredential.connectionType,
        port: deviceCredential.port,
        isActive: deviceCredential.isActive,
        createdAt: deviceCredential.createdAt
      }
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al crear credenciales de dispositivo",
      error: error.message
    });
  }
};

// También falta el método findByDevice
exports.findByDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    
    // Verificar que el dispositivo existe
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Obtener todas las credenciales del dispositivo
    const credentials = await DeviceCredential.findAll({
      where: { deviceId },
      attributes: [
        'id', 
        'connectionType', 
        'username',
        'password',		
        'port', 
        'isActive', 
        'lastUsed', 
        'rotationDate',
        'createdAt',
        'updatedAt'
      ],
      order: [['isActive', 'DESC'], ['createdAt', 'DESC']]
    });
    
    return res.json({
      deviceId,
      deviceName: device.name,
      credentials
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener credenciales del dispositivo",
      error: error.message
    });
  }
};

// También falta el método update
exports.update = async (req, res) => {
  try {
    const credentialId = req.params.id;
    const updateData = req.body;
    
    // Verificar si las credenciales existen
    const deviceCredential = await DeviceCredential.findByPk(credentialId);
    
    if (!deviceCredential) {
      return res.status(404).json({
        message: `Credenciales con ID ${credentialId} no encontradas`
      });
    }
    
    // No permitir cambiar el deviceId
    delete updateData.deviceId;
    
    // Actualizar credenciales
    await deviceCredential.update(updateData);
    
    return res.json({
      message: "Credenciales actualizadas exitosamente",
      deviceCredential: {
        id: deviceCredential.id,
        connectionType: deviceCredential.connectionType,
        isActive: deviceCredential.isActive,
        updatedAt: deviceCredential.updatedAt
      }
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al actualizar credenciales de dispositivo",
      error: error.message
    });
  }
};

// También falta el método delete
exports.delete = async (req, res) => {
  try {
    const credentialId = req.params.id;
    
    // Verificar si las credenciales existen
    const deviceCredential = await DeviceCredential.findByPk(credentialId);
    
    if (!deviceCredential) {
      return res.status(404).json({
        message: `Credenciales con ID ${credentialId} no encontradas`
      });
    }
    
    // Eliminar credenciales
    await deviceCredential.destroy();
    
    return res.json({
      message: "Credenciales eliminadas exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar credenciales de dispositivo",
      error: error.message
    });
  }
};

// Método anterior de rotación de credenciales (continuación)
exports.rotateCredentials = async (req, res) => {
  try {
    const credentialId = req.params.id;
    const { 
      newUsername, 
      newPassword, 
      newApiKey 
    } = req.body;
    
    // Verificar si las credenciales existen
    const deviceCredential = await DeviceCredential.findByPk(credentialId, {
      include: [{ model: Device, as: 'device' }]
    });
    
    if (!deviceCredential) {
      return res.status(404).json({
        message: `Credenciales con ID ${credentialId} no encontradas`
      });
    }
    
    const device = deviceCredential.device;
    
    // Validar nuevas credenciales según el tipo de dispositivo
    let connectionTest = false;
    
    if (device.brand === 'mikrotik') {
      connectionTest = await MikrotikService.testConnection(
        device.ipAddress, 
        deviceCredential.port, 
        newUsername || deviceCredential.username, 
        newPassword || deviceCredential.password
      );
    } else if (device.brand === 'ubiquiti') {
      connectionTest = await UbiquitiService.testConnection(
        device.ipAddress, 
        newUsername || deviceCredential.username, 
        newPassword || deviceCredential.password, 
        newApiKey || deviceCredential.apiKey
      );
    } else {
      return res.status(400).json({
        message: `No se soporta rotación de credenciales para ${device.brand}`
      });
    }
    
    // Si la prueba de conexión falla, no rotar credenciales
    if (!connectionTest) {
      return res.status(400).json({
        message: "Las nuevas credenciales no permiten conexión al dispositivo"
      });
    }
    
    // Preparar datos para actualización
    const updateData = {
      rotationDate: new Date()
    };
    
    // Actualizar solo los campos proporcionados
    if (newUsername) updateData.username = newUsername;
    if (newPassword) updateData.password = newPassword;
    if (newApiKey) updateData.apiKey = newApiKey;
    
    // Actualizar credenciales
    await deviceCredential.update(updateData);
    
    return res.json({
      message: "Credenciales de dispositivo rotadas exitosamente",
      rotationDate: updateData.rotationDate
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al rotar credenciales de dispositivo",
      error: error.message
    });
  }
};

// Probar conexión con las credenciales
exports.testConnection = async (req, res) => {
  try {
    const { 
      deviceId, 
      connectionType, 
      username, 
      password, 
      port,
      apiKey,
      snmpCommunity
    } = req.body;
    
    // Verificar que el dispositivo exista
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    let connectionResult = false;
    let connectionInfo = null;
    
    // Probar conexión según el tipo
    switch (connectionType || device.brand) {
      case 'mikrotik':
        connectionResult = await MikrotikService.testConnection(
          device.ipAddress, 
          port || device.apiPort, 
          username, 
          password
        );
        connectionInfo = await MikrotikService.getDeviceInfo(
          device.ipAddress, 
          port || device.apiPort, 
          username, 
          password
        );
        break;
      
      case 'ubiquiti':
        connectionResult = await UbiquitiService.testConnection(
          device.ipAddress, 
          username, 
          password, 
          apiKey
        );
        connectionInfo = await UbiquitiService.getDeviceInfo(
          device.ipAddress, 
          username, 
          password, 
          apiKey
        );
        break;
      
      case 'snmp':
        connectionResult = await SNMPService.testConnection(
          device.ipAddress, 
          snmpCommunity, 
          port || 161,
          username,
          password
        );
        break;
      
      default:
        return res.status(400).json({
          message: `Tipo de conexión no soportado: ${connectionType || device.brand}`
        });
    }
    
    // Registro del intento de conexión
    await DeviceCredential.create({
      deviceId,
      connectionType: connectionType || device.brand,
      username,
      isActive: connectionResult,
      lastUsed: new Date(),
      notes: connectionResult 
        ? 'Conexión de prueba exitosa' 
        : 'Conexión de prueba fallida'
    });
    
    return res.json({
      success: connectionResult,
      message: connectionResult 
        ? 'Conexión establecida exitosamente' 
        : 'No se pudo establecer conexión',
      deviceInfo: connectionInfo
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al probar la conexión del dispositivo",
      error: error.message
    });
  }
};

// Crear un servicio SNMP simulado para pruebas
const SNMPService = {
  async testConnection(host, community, port = 161, username = null, password = null) {
    // TODO: Implementar prueba de conexión SNMP real
    // Por ahora, simulamos una conexión exitosa
    return true;
  }
};

module.exports = {
  create: exports.create,
  findByDevice: exports.findByDevice,
  update: exports.update,
  rotateCredentials: exports.rotateCredentials,
  delete: exports.delete,
  testConnection: exports.testConnection
};