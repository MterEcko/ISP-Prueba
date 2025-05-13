// Controlador para operaciones específicas de clientes con Mikrotik
const MikrotikService = require('../services/mikrotik.service');
const logger = require('../utils/logger');
const db = require('../models');
const Client = db.Client;
const Device = db.Device;

const ClientMikrotikController = {
  // Crear usuario PPPoE para un cliente en un dispositivo específico
  createClientPPPoE: async (req, res) => {
    try {
      const { clientId, deviceId } = req.params;
      const { profile, bandwidth, comment } = req.body;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener información del dispositivo
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
      
      // Generar username basado en el cliente
      const username = client.contractNumber || `client_${clientId}`;
      // Generar password (puedes usar el mismo username o generar uno aleatorio)
      const password = client.contractNumber || 'default_pass';
      
      const userData = {
        name: username,
        password: password,
        profile: profile || 'default',
        comment: comment || `Cliente: ${client.firstName} ${client.lastName}`
      };
      
      const result = await MikrotikService.createPPPoEUser(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        userData
      );
      
      // Actualizar cliente con información PPPoE
      await Client.update(
        { 
          mikrotikUsername: username,
          mikrotikProfile: profile,
          deviceId: deviceId
        },
        { where: { id: clientId } }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Usuario PPPoE creado exitosamente para el cliente',
        data: {
          clientId,
          username,
          profile,
          mikrotikId: result.id
        }
      });
    } catch (error) {
      logger.error(`Error en createClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al crear usuario PPPoE para el cliente',
        error: error.message
      });
    }
  },
  
  // Actualizar usuario PPPoE de un cliente
  updateClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;
      const updateData = req.body;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener dispositivo asociado al cliente
      const device = await Device.findByPk(client.deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'El cliente no tiene un dispositivo Mikrotik asociado'
        });
      }
      
      // Obtener usuarios PPPoE del dispositivo
      const users = await MikrotikService.getPPPoEUsers(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password
      );
      
      // Buscar el usuario del cliente
      const userToUpdate = users.find(user => user.name === client.mikrotikUsername);
      if (!userToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'Usuario PPPoE del cliente no encontrado en Mikrotik'
        });
      }
      
      await MikrotikService.updatePPPoEUser(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        userToUpdate.id,
        updateData
      );
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE del cliente actualizado exitosamente'
      });
    } catch (error) {
      logger.error(`Error en updateClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario PPPoE del cliente',
        error: error.message
      });
    }
  },
  
  // Eliminar usuario PPPoE de un cliente
  deleteClientPPPoE: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener dispositivo asociado al cliente
      const device = await Device.findByPk(client.deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'El cliente no tiene un dispositivo Mikrotik asociado'
        });
      }
      
      // Obtener usuarios PPPoE del dispositivo
      const users = await MikrotikService.getPPPoEUsers(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password
      );
      
      // Buscar el usuario del cliente
      const userToDelete = users.find(user => user.name === client.mikrotikUsername);
      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Usuario PPPoE del cliente no encontrado en Mikrotik'
        });
      }
      
      await MikrotikService.deletePPPoEUser(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        userToDelete.id
      );
      
      // Limpiar información PPPoE del cliente
      await Client.update(
        { 
          mikrotikUsername: null,
          mikrotikProfile: null,
          deviceId: null
        },
        { where: { id: clientId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE del cliente eliminado exitosamente'
      });
    } catch (error) {
      logger.error(`Error en deleteClientPPPoE: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario PPPoE del cliente',
        error: error.message
      });
    }
  },
  
  // Configurar límites de ancho de banda para un cliente
  setClientBandwidth: async (req, res) => {
    try {
      const { clientId } = req.params;
      const { uploadLimit, downloadLimit } = req.body;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener dispositivo asociado al cliente
      const device = await Device.findByPk(client.deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'El cliente no tiene un dispositivo Mikrotik asociado'
        });
      }
      
      // Configurar QoS para el cliente
      const qosData = {
        name: `Client_${clientId}_QoS`,
        target: client.mikrotikUsername,
        maxLimit: `${uploadLimit}M/${downloadLimit}M`,
        comment: `Límites para cliente ${client.firstName} ${client.lastName}`
      };
      
      await MikrotikService.configureQoS(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        qosData
      );
      
      return res.status(200).json({
        success: true,
        message: 'Límites de ancho de banda configurados exitosamente'
      });
    } catch (error) {
      logger.error(`Error en setClientBandwidth: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar límites de ancho de banda',
        error: error.message
      });
    }
  },
  
  // Obtener estadísticas de tráfico para un cliente
  getClientTrafficStats: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener dispositivo asociado al cliente
      const device = await Device.findByPk(client.deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'El cliente no tiene un dispositivo Mikrotik asociado'
        });
      }
      
      // Obtener estadísticas de tráfico
      const stats = await MikrotikService.getTrafficStatistics(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        client.mikrotikUsername
      );
      
      return res.status(200).json({
        success: true,
        data: {
          clientId,
          username: client.mikrotikUsername,
          stats
        }
      });
    } catch (error) {
      logger.error(`Error en getClientTrafficStats: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de tráfico del cliente',
        error: error.message
      });
    }
  },
  
  // Reiniciar sesión PPPoE de un cliente
  restartClientPPPoESession: async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Obtener información del cliente
      const client = await Client.findByPk(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: `Cliente con ID ${clientId} no encontrado`
        });
      }
      
      // Obtener dispositivo asociado al cliente
      const device = await Device.findByPk(client.deviceId);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'El cliente no tiene un dispositivo Mikrotik asociado'
        });
      }
      
      // Obtener sesiones activas
      const sessions = await MikrotikService.getActivePPPoESessions(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password
      );
      
      // Buscar la sesión del cliente
      const clientSession = sessions.find(session => session.name === client.mikrotikUsername);
      if (!clientSession) {
        return res.status(404).json({
          success: false,
          message: 'Sesión PPPoE del cliente no encontrada'
        });
      }
      
      await MikrotikService.restartPPPoESession(
        device.ipAddress,
        device.apiPort || 8728,
        device.username,
        device.password,
        clientSession.id
      );
      
      return res.status(200).json({
        success: true,
        message: 'Sesión PPPoE del cliente reiniciada exitosamente'
      });
    } catch (error) {
      logger.error(`Error en restartClientPPPoESession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al reiniciar sesión PPPoE del cliente',
        error: error.message
      });
    }
  },
  
  // Sincronizar todos los clientes con Mikrotik
  syncAllClientsWithMikrotik: async (req, res) => {
    try {
      // Obtener todos los dispositivos Mikrotik
      const devices = await Device.findAll({
        where: { brand: 'mikrotik' }
      });
      
      if (devices.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron dispositivos Mikrotik'
        });
      }
      
      let syncResults = [];
      
      for (const device of devices) {
        try {
          // Obtener usuarios PPPoE del dispositivo
          const pppoeUsers = await MikrotikService.getPPPoEUsers(
            device.ipAddress,
            device.apiPort || 8728,
            device.username,
            device.password
          );
          
          // Obtener clientes asociados a este dispositivo
          const clients = await Client.findAll({
            where: { deviceId: device.id }
          });
          
          syncResults.push({
            deviceId: device.id,
            deviceName: device.name,
            pppoeUsers: pppoeUsers.length,
            clientsInDb: clients.length,
            status: 'success'
          });
        } catch (error) {
          syncResults.push({
            deviceId: device.id,
            deviceName: device.name,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Sincronización completada',
        results: syncResults
      });
    } catch (error) {
      logger.error(`Error en syncAllClientsWithMikrotik: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al sincronizar clientes con Mikrotik',
        error: error.message
      });
    }
  }
};

module.exports = ClientMikrotikController;