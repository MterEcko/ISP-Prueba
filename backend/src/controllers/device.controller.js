// backend/src/controllers/device.controller.js

const db = require('../models');
const Device = db.Device;
const DeviceCredential = db.DeviceCredential;
const Node = db.Node;
const Sector = db.Sector;
const Client = db.Client;
const Op = db.Sequelize.Op;

// Usar el nuevo servicio unificado
const DeviceService = require('../services/device.service');
const logger = require('../utils/logger');

// Crear un nuevo dispositivo
exports.create = async (req, res) => {
 const transaction = await db.sequelize.transaction();

 try {
   // ===== EXTRACCIÓN COMPLETA DE TODOS LOS CAMPOS =====
   const { 
     // Campos básicos obligatorios
     name, 
     type, 
     brand, 
     model, 
     ipAddress, 
     
     // Campos adicionales del modelo
     macAddress,
     username,
     password,
     apiKey,
     apiPort,
     apiType,
     apiVersion,
     modelHardware,
     firmwareVersion,
     isFiberDevice,
     status,
     lastSeen,
     location,
     latitude,
     longitude,
     notes,
     
     // Campos JSON
     connectionParams,
     monitoringData,
     specificConfig,
     metadata,
     
     // Relaciones
     nodeId, 
     sectorId,
     
     // Credenciales (para compatibilidad con versión anterior)
     credentials 
   } = req.body;
   
   // Validar campos obligatorios
   if (!name || !type || !brand || !ipAddress) {
     return res.status(400).json({
       message: "Nombre, tipo, marca e IP son campos obligatorios"
     });
   }
   
   // ===== PREPARAR DATOS PARA LA CREACIÓN =====
   const deviceData = {
     // Campos básicos
     name,
     type,
     brand,
     model: model || null,
     ipAddress,
     
     // Campos adicionales (usar valores del frontend o defaults)
     macAddress: macAddress || null,
     username: username || null,
     password: password || null,
     apiKey: apiKey || null,
     apiPort: apiPort || (brand.toLowerCase() === 'mikrotik' ? 8728 : 22),
     apiType: apiType || null,
     apiVersion: apiVersion || null,
     modelHardware: modelHardware || null,
     firmwareVersion: firmwareVersion || null,
     isFiberDevice: isFiberDevice || false,
     status: status || 'unknown',
     lastSeen: lastSeen || null,
     location: location || null,
     latitude: latitude || null,
     longitude: longitude || null,
     notes: notes || null,
     
     // Campos JSON (asegurar que sean objetos, no strings)
     connectionParams: typeof connectionParams === 'object' ? connectionParams : {},
     monitoringData: typeof monitoringData === 'object' ? monitoringData : {},
     specificConfig: typeof specificConfig === 'object' ? specificConfig : {},
     metadata: typeof metadata === 'object' ? metadata : {},
     
     // Relaciones
     nodeId: nodeId || null,
     sectorId: sectorId || null
   };
   
   console.log('Datos preparados para crear dispositivo:', deviceData);
   
   // ===== CREAR DISPOSITIVO =====
   const device = await Device.create(deviceData, { transaction });
   
   // ===== CREAR REGISTRO EN MIKROTIKROUTERS SI ES MIKROTIK =====
   if (brand.toLowerCase() === 'mikrotik') {
     const MikrotikRouter = db.MikrotikRouter;
     await MikrotikRouter.create({
       deviceId: device.id,
       nodeId: nodeId || null,
       name: name,
       ipAddress: ipAddress,
       username: username || 'admin',
       passwordEncrypted: password || '',
       apiPort: apiPort || 8728,
       active: true
     }, { transaction });
   }

   // ===== CREAR CREDENCIALES SI SE PROPORCIONAN =====
   if (username && password) {
     await DeviceCredential.create({
       deviceId: device.id,
       connectionType: brand.toLowerCase() === 'mikrotik' ? 'RouterOs' : 'ssh',
       username: username,
       password: password,
       port: apiPort || (brand.toLowerCase() === 'mikrotik' ? 8728 : 22),
       isActive: true
     }, { transaction });
   }

   // ===== OBTENER DISPOSITIVO CON INFORMACIÓN RELACIONADA =====
   const deviceWithDetails = await Device.findByPk(device.id, {
     include: [
       { model: Node, attributes: ['id', 'name'] },
       { model: Sector, attributes: ['id', 'name'] }
     ],
     transaction
   });
   
   await transaction.commit();
   
   return res.status(201).json({
     message: "Dispositivo creado exitosamente",
     device: deviceWithDetails
   });
   
 } catch (error) {
   await transaction.rollback();
   logger.error('Error creating device:', error);
   
   // Log detallado para debugging
   console.error('Error completo:', error);
   console.error('Stack trace:', error.stack);
   console.error('Datos recibidos:', req.body);
   
   return res.status(500).json({
     message: "Error al crear el dispositivo",
     error: error.message,
     details: error.errors ? error.errors.map(e => e.message) : []
   });
 }
};

// Obtener todos los dispositivos
exports.findAll = async (req, res) => {
 try {
   const { page = 1, size = 10, brand, type, status, nodeId, sectorId } = req.query;
   const limit = parseInt(size);
   const offset = (parseInt(page) - 1) * limit;

   // Construir condiciones de filtrado
   const condition = {};
   if (brand) condition.brand = brand;
   if (type) condition.type = type;
   if (status) condition.status = status;
   if (nodeId) condition.nodeId = nodeId;
   if (sectorId) condition.sectorId = sectorId;

   // Obtener dispositivos
   const { count, rows: devices } = await Device.findAndCountAll({
     where: condition,
     limit,
     offset,
     include: [
       { model: Node, attributes: ['id', 'name'] },
       { model: Sector, attributes: ['id', 'name'] },
       { model: Client, attributes: ['id', 'firstName', 'lastName'] }
     ],
     order: [['createdAt', 'DESC']]
   });

   return res.json({
     totalItems: count,
     devices,
     currentPage: parseInt(page),
     totalPages: Math.ceil(count / limit)
   });
 } catch (error) {
   logger.error('Error finding devices:', error);
   return res.status(500).json({
     message: "Error al obtener dispositivos",
     error: error.message
   });
 }
};

// Obtener dispositivo por ID
exports.findOne = async (req, res) => {
 try {
   const id = req.params.id;
   
   const device = await Device.findByPk(id, {
     include: [
       { model: Node, attributes: ['id', 'name'] },
       { model: Sector, attributes: ['id', 'name'] },
       { model: Client, attributes: ['id', 'firstName', 'lastName'] }
     ]
   });

   if (!device) {
     return res.status(404).json({
       message: `Dispositivo con ID ${id} no encontrado`
     });
   }

   return res.json(device);
 } catch (error) {
   logger.error('Error finding device:', error);
   return res.status(500).json({
     message: "Error al obtener el dispositivo",
     error: error.message
   });
 }
};

// Actualizar dispositivo
// Actualizar dispositivo y sincronizar con MikrotikRouter si aplica
exports.update = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const id = req.params.id;
    const updateData = req.body;
    
    // Obtener el device con información de si es Mikrotik
    const device = await Device.findByPk(id, {
      include: [
        {
          model: db.MikrotikRouter,
          as: 'mikrotikRouter',
          required: false
        }
      ]
    });
    
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${id} no encontrado`
      });
    }
    
    // Actualizar Device
    await device.update(updateData, { transaction });
    
    // Si es un dispositivo Mikrotik, sincronizar con MikrotikRouter
    if (device.brand === 'mikrotik' && device.mikrotikRouter) {
      const mikrotikUpdateData = {};
      
      // Sincronizar campos compartidos: Device → MikrotikRouter
      if (updateData.name) mikrotikUpdateData.name = updateData.name;
      if (updateData.ipAddress) mikrotikUpdateData.ipAddress = updateData.ipAddress;
      if (updateData.nodeId) mikrotikUpdateData.nodeId = updateData.nodeId;
      
      // Actualizar MikrotikRouter si hay campos para sincronizar
      if (Object.keys(mikrotikUpdateData).length > 0) {
        await db.MikrotikRouter.update(mikrotikUpdateData, {
          where: { deviceId: id },
          transaction
        });
      }
    }
    
    await transaction.commit();
    
    return res.json({ 
      message: "Dispositivo actualizado exitosamente",
      synchronized: device.brand === 'mikrotik' ? 'MikrotikRouter también actualizado' : 'No requiere sincronización'
    });
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating device:', error);
    return res.status(500).json({
      message: "Error al actualizar el dispositivo",
      error: error.message
    });
  }
};
// Eliminar dispositivo
exports.delete = async (req, res) => {
 try {
   const id = req.params.id;
   
   const deleted = await Device.destroy({
     where: { id: id }
   });

   if (deleted === 0) {
     return res.status(404).json({
       message: `Dispositivo con ID ${id} no encontrado`
     });
   }

   return res.json({ message: "Dispositivo eliminado exitosamente" });
 } catch (error) {
   logger.error('Error deleting device:', error);
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
   const userId = req.userId; // Del middleware de autenticación
   
   const device = await Device.findByPk(deviceId);
   if (!device) {
     return res.status(404).json({
       message: `Dispositivo con ID ${deviceId} no encontrado`
     });
   }
   
   const credentials = await DeviceCredential.findOne({
     where: { deviceId, isActive: true }
   });
   
   if (!credentials) {
     return res.status(404).json({
       message: "No se encontraron credenciales para este dispositivo"
     });
   }
   
   // Usar el nuevo servicio unificado
   const result = await DeviceService.testConnection(device, credentials);
   
   // Actualizar estado del dispositivo
   await device.update({
     status: result.success ? 'online' : 'offline',
     lastSeen: result.success ? new Date() : device.lastSeen
   });
   
   return res.json({
     deviceId: device.id,
     name: device.name,
     status: result.success ? 'online' : 'offline',
     lastSeen: result.success ? new Date() : device.lastSeen,
     message: result.message,
     executionTime: result.executionTime
   });
   
 } catch (error) {
   logger.error('Error checking device status:', error);
   return res.status(500).json({
     message: "Error al verificar estado del dispositivo",
     error: error.message
   });
 }
};

// Obtener información del dispositivo
exports.getDeviceInfo = async (req, res) => {
 try {
   const deviceId = req.params.id;
   const userId = req.userId;
   
   // Usar el nuevo servicio unificado
   const result = await DeviceService.getDeviceInfo(deviceId, userId);
   
   return res.json({
     deviceId: deviceId,
     success: result.success,
     deviceInfo: result.deviceInfo,
     executionTime: result.executionTime
   });
   
 } catch (error) {
   logger.error('Error getting device info:', error);
   return res.status(500).json({
     message: "Error al obtener información del dispositivo",
     error: error.message
   });
 }
};

// Obtener métricas del dispositivo
exports.getMetrics = async (req, res) => {
 try {
   const deviceId = req.params.id;
   const { period = '1h' } = req.query;
   const userId = req.userId;
   
   // Usar el nuevo servicio unificado
   const result = await DeviceService.getDeviceMetrics(deviceId, period, userId);
   
   return res.json({
     deviceId: deviceId,
     success: result.success,
     metrics: result.metrics,
     period: period,
     executionTime: result.executionTime
   });
   
 } catch (error) {
   logger.error('Error getting device metrics:', error);
   return res.status(500).json({
     message: "Error al obtener métricas del dispositivo",
     error: error.message
   });
 }
};

// Ejecutar acción en el dispositivo
exports.executeAction = async (req, res) => {
 try {
   const deviceId = req.params.id;
   const { action, parameters = {} } = req.body;
   const userId = req.userId;
   
   if (!action) {
     return res.status(400).json({
       message: "Se requiere especificar la acción a ejecutar"
     });
   }
   
   // Usar el nuevo servicio unificado
   const result = await DeviceService.executeCommand(deviceId, action, parameters, userId);
   
   return res.json({
     deviceId: deviceId,
     action: action,
     success: result.success,
     result: result.result,
     executionTime: result.executionTime
   });
   
 } catch (error) {
   logger.error('Error executing device action:', error);
   return res.status(500).json({
     message: `Error al ejecutar la acción en el dispositivo: ${error.message}`,
     error: error.message
   });
 }
};

// Probar conexión con credenciales específicas
exports.testConnectionWithCredentials = async (req, res) => {
 try {
   const deviceId = req.params.id;
   const credentials = req.body;
   
   const device = await Device.findByPk(deviceId);
   if (!device) {
     return res.status(404).json({
       message: `Dispositivo con ID ${deviceId} no encontrado`
     });
   }
   
   // Usar el nuevo servicio unificado
   const result = await DeviceService.testConnection(device, credentials);
   
   return res.json(result);
   
 } catch (error) {
   logger.error('Error testing connection with credentials:', error);
   return res.status(500).json({
     message: "Error al probar la conexión con las credenciales",
     error: error.message
   });
 }
};

// Obtener comandos disponibles para un dispositivo
exports.getAvailableCommands = async (req, res) => {
 try {
   const deviceId = req.params.id;
   
   const device = await Device.findByPk(deviceId);
   if (!device) {
     return res.status(404).json({
       message: `Dispositivo con ID ${deviceId} no encontrado`
     });
   }
   
   // Comandos básicos disponibles para todos los dispositivos
   let commands = [
     {
       name: 'restart',
       description: 'Reiniciar dispositivo',
       category: 'system',
       requiresConfirmation: true,
       affectsService: true
     },
     {
       name: 'get_device_info',
       description: 'Obtener información del dispositivo',
       category: 'information',
       requiresConfirmation: false,
       affectsService: false
     },
     {
       name: 'get_system_info',
       description: 'Obtener información del sistema',
       category: 'information',
       requiresConfirmation: false,
       affectsService: false
     }
   ];
   
   // Comandos específicos para Mikrotik
   if (device.brand.toLowerCase() === 'mikrotik') {
     commands = commands.concat([
       {
         name: 'backup',
         description: 'Crear copia de seguridad',
         category: 'maintenance',
         requiresConfirmation: false,
         affectsService: false
       },
       {
         name: 'getPppoeUsers',
         description: 'Obtener usuarios PPPoE',
         category: 'network',
         requiresConfirmation: false,
         affectsService: false
       },
       {
         name: 'getActiveSessions',
         description: 'Obtener sesiones activas',
         category: 'network',
         requiresConfirmation: false,
         affectsService: false
       },
       {
         name: 'getIpPools',
         description: 'Obtener pools de IP',
         category: 'network',
         requiresConfirmation: false,
         affectsService: false
       },
       {
         name: 'getProfiles',
         description: 'Obtener perfiles PPPoE',
         category: 'network',
         requiresConfirmation: false,
         affectsService: false
       },
       {
         name: 'createPppoeUser',
         description: 'Crear usuario PPPoE',
         category: 'network',
         requiresConfirmation: true,
         affectsService: true,
         parameters: [
           { name: 'name', type: 'string', required: true },
           { name: 'password', type: 'string', required: true },
           { name: 'profile', type: 'string', required: true },
           { name: 'comment', type: 'string', required: false }
         ]
       },
       {
         name: 'configureQos',
         description: 'Configurar QoS',
         category: 'network',
         requiresConfirmation: true,
         affectsService: true,
         parameters: [
           { name: 'name', type: 'string', required: true },
           { name: 'target', type: 'string', required: true },
           { name: 'maxLimit', type: 'string', required: true }
         ]
       }
     ]);
   }
   
   return res.json({
     deviceId: deviceId,
     brand: device.brand,
     commands: commands
   });
   
 } catch (error) {
   logger.error('Error getting available commands:', error);
   return res.status(500).json({
     message: "Error al obtener comandos disponibles",
     error: error.message
   });
 }
};

module.exports = {
 create: exports.create,
 findAll: exports.findAll,
 findOne: exports.findOne,
 update: exports.update,
 delete: exports.delete,
 checkStatus: exports.checkStatus,
 getDeviceInfo: exports.getDeviceInfo,
 getMetrics: exports.getMetrics,
 executeAction: exports.executeAction,
 testConnectionWithCredentials: exports.testConnectionWithCredentials,
 getAvailableCommands: exports.getAvailableCommands
};