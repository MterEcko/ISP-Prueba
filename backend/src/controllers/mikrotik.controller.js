// Controlador para operaciones relacionadas con dispositivos Mikrotik
const MikrotikService = require('../services/mikrotik.service');
const logger = require('../utils/logger');
const db = require('../models'); // Importamos los modelos desde el index
const Device = db.Device; // Obtenemos el modelo Device

const MikrotikController = {
  // Probar conexión con un dispositivo Mikrotik
  testConnection: async (req, res) => {
    try {
      const { ipAddress, apiPort, username, password } = req.body;
      
      if (!ipAddress || !username ) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere dirección IP y usuario'
        });
      }
      
      const result = await MikrotikService.testConnection(
        ipAddress, 
        apiPort || 8728, 
        username, 
        password
      );
      
      return res.status(200).json({
        success: result,
        message: result ? 'Conexión exitosa' : 'No se pudo conectar al dispositivo'
      });
    } catch (error) {
      logger.error(`Error en testConnection: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al probar conexión',
        error: error.message
      });
    }
  },
  
  // Obtener información del dispositivo
  getDeviceInfo: async (req, res) => {
    try {
      const { ipAddress, apiPort, username, password } = req.body;
      
      if (!ipAddress || !username ) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere dirección IP y usuario '
        });
      }
      
      const result = await MikrotikService.getDeviceInfo(
        ipAddress, 
        apiPort || 8728, 
        username, 
        password
      );
      
      return res.status(200).json({
        success: result.connected,
        data: result.info
      });
    } catch (error) {
      logger.error(`Error en getDeviceInfo: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del dispositivo',
        error: error.message
      });
    }
  },
  
  // Obtener métricas del dispositivo
  getMetrics: async (req, res) => {
    try {
      const { id } = req.params;
      const { period } = req.query;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${id} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const result = await MikrotikService.getMetrics(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        period || '1h'
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Error en getMetrics: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener métricas del dispositivo',
        error: error.message
      });
    }
  },
  
  // Obtener usuarios PPPoE
  getPPPoEUsers: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${id} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const users = await MikrotikService.getPPPoEUsers(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      logger.error(`Error en getPPPoEUsers: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios PPPoE',
        error: error.message
      });
    }
  },
  
  // Obtener sesiones PPPoE activas
  getActivePPPoESessions: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${id} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const sessions = await MikrotikService.getActivePPPoESessions(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: sessions.length,
        data: sessions
      });
    } catch (error) {
      logger.error(`Error en getActivePPPoESessions: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener sesiones PPPoE activas',
        error: error.message
      });
    }
  },
  
  // Crear usuario PPPoE
  createPPPoEUser: async (req, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      // Validar datos requeridos
      if (!userData.name || !userData.password || !userData.profile) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren name, password y profile para crear un usuario PPPoE'
        });
      }
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${id} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const user = await MikrotikService.createPPPoEUser(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        userData
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Usuario PPPoE creado exitosamente',
        data: user
      });
    } catch (error) {
      logger.error(`Error en createPPPoEUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al crear usuario PPPoE',
        error: error.message
      });
    }
  },
  
  // Actualizar usuario PPPoE
  updatePPPoEUser: async (req, res) => {
    try {
      const { deviceId, userId } = req.params;
      const userData = req.body;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const user = await MikrotikService.updatePPPoEUser(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        userId,
        userData
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE actualizado exitosamente',
        data: user
      });
    } catch (error) {
      logger.error(`Error en updatePPPoEUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario PPPoE',
        error: error.message
      });
    }
  },
  
  // Eliminar usuario PPPoE
  deletePPPoEUser: async (req, res) => {
    try {
      const { deviceId, userId } = req.params;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      await MikrotikService.deletePPPoEUser(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        userId
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE eliminado exitosamente'
      });
    } catch (error) {
      logger.error(`Error en deletePPPoEUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario PPPoE',
        error: error.message
      });
    }
  },
  
  // Obtener perfiles PPPoE
  getPPPoEProfiles: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${id} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const profiles = await MikrotikService.getPPPoEProfiles(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: profiles.length,
        data: profiles
      });
    } catch (error) {
      logger.error(`Error en getPPPoEProfiles: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfiles PPPoE',
        error: error.message
      });
    }
  },
  
  // Configurar QoS
  configureQoS: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const qosData = req.body;
      
      // Validar datos requeridos
      if (!qosData.name || !qosData.target || !qosData.maxLimit) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren name, target y maxLimit para configurar QoS'
        });
      }
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const rule = await MikrotikService.configureQoS(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        qosData
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Regla QoS configurada exitosamente',
        data: rule
      });
    } catch (error) {
      logger.error(`Error en configureQoS: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar QoS',
        error: error.message
      });
    }
  },
  
  // Obtener estadísticas de tráfico
  getTrafficStatistics: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { interfaceName } = req.query;
      
      if (!interfaceName) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere el nombre de la interfaz'
        });
      }
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const stats = await MikrotikService.getTrafficStatistics(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        interfaceName
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error en getTrafficStatistics: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tráfico',
        error: error.message
      });
    }
  },
  
  // Reiniciar sesión PPPoE
  restartPPPoESession: async (req, res) => {
    try {
      const { deviceId, sessionId } = req.params;
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      await MikrotikService.restartPPPoESession(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        sessionId
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Sesión PPPoE reiniciada exitosamente'
      });
    } catch (error) {
      logger.error(`Error en restartPPPoESession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al reiniciar sesión PPPoE',
        error: error.message
      });
    }
  },
  
  // Ejecutar acción en el dispositivo
  executeAction: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { action } = req.body;
      
      // Validar acción
      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere especificar la acción a ejecutar'
        });
      }
      
      // Obtener dispositivo de la base de datos
      const device = await Device.findByPk(deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo con ID ${deviceId} no encontrado`
        });
      }
      
      // Asegurarse de que el dispositivo tiene credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        return res.status(400).json({
          success: false,
          message: 'El dispositivo no tiene configuradas las credenciales API'
        });
      }
      
      const result = await MikrotikService.executeAction(
        device.ipAddress, 
        device.apiPort || 8728, 
        device.username, 
        device.password,
        action
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: result.message,
        details: result.details
      });
    } catch (error) {
      logger.error(`Error en executeAction: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al ejecutar acción en el dispositivo',
        error: error.message
      });
    }
  }
};

module.exports = MikrotikController;