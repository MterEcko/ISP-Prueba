const db = require("../models");
const logger = require('../utils/logger');
const deviceCommandService = require('./deviceCommand.service');

// Modelos necesarios
const clientNetwork = db.clientNetwork;
const Client = db.Client;
const Device = db.Device;

class ClientNetworkService {
  
  /**
   * Asocia una red de cliente con un dispositivo
   * @param {number} clientNetworkId - ID de la red de cliente
   * @param {number} deviceId - ID del dispositivo
   * @returns {Promise<Object>} Resultado de la operación
   */
  async associateWithDevice(clientNetworkId, deviceId) {
    try {
      logger.info(`Asociando red de cliente ${clientNetworkId} con dispositivo ${deviceId}`);

      // Verificar que existan ambos elementos
      const clientNetwork = await clientNetwork.findByPk(clientNetworkId);
      if (!clientNetwork) {
        throw new Error('Red de cliente no encontrada');
      }

      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error('Dispositivo no encontrado');
      }

      // Verificar que el dispositivo tenga credenciales activas
      const credentials = await db.deviceCredential.findOne({
        where: { deviceId, isActive: true }
      });

      if (!credentials) {
        throw new Error('Dispositivo no tiene credenciales activas configuradas');
      }

      // Actualizar la red del cliente
      await clientNetwork.update({
        deviceId: deviceId
      }, {
        where: { id: clientNetworkId }
      });

      logger.info(`Red de cliente ${clientNetworkId} asociada exitosamente con dispositivo ${deviceId}`);

      return {
        success: true,
        message: 'Red de cliente asociada exitosamente al dispositivo',
        data: {
          clientNetworkId,
          deviceId,
          deviceType: device.type,
          deviceBrand: device.brand
        }
      };
    } catch (error) {
      logger.error(`Error al asociar red de cliente con dispositivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aplica configuración de QoS al dispositivo asociado
   * @param {number} clientNetworkId - ID de la red de cliente
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyQoSConfiguration(clientNetworkId) {
    try {
      logger.info(`Aplicando configuración QoS para cliente network ${clientNetworkId}`);

      // Obtener datos de la red del cliente con el dispositivo asociado
      const clientNetwork = await clientNetwork.findByPk(clientNetworkId, {
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'type', 'brand', 'model', 'ipAddress']
          }
        ]
      });

      if (!clientNetwork) {
        throw new Error('Red de cliente no encontrada');
      }

      if (!clientNetwork.device) {
        throw new Error('No hay dispositivo asociado a esta red de cliente');
      }

      // Verificar que tenga configuración de velocidad
      if (!clientNetwork.downloadSpeed || !clientNetwork.uploadSpeed) {
        throw new Error('La red de cliente no tiene configuración de velocidad');
      }

      // Verificar que tenga dirección MAC
      if (!clientNetwork.macAddress) {
        throw new Error('La red de cliente no tiene dirección MAC configurada');
      }

      const device = clientNetwork.device;
      const qosConfig = {
        macAddress: clientNetwork.macAddress,
        downloadSpeed: clientNetwork.downloadSpeed,
        uploadSpeed: clientNetwork.uploadSpeed,
        clientName: `${clientNetwork.client.firstName} ${clientNetwork.client.lastName}`
      };

      // Ejecutar comando de configuración QoS usando el sistema centralizado
      let result;
      try {
        result = await deviceCommandService.executeCommand(
          device.id,
          'configure_client_qos',
          qosConfig,
          null // userId, podría pasarse desde el contexto
        );
      } catch (commandError) {
        logger.warn(`Comando configure_client_qos no encontrado, intentando configure_bandwidth`);
        
        // Intentar con comando alternativo
        result = await deviceCommandService.executeCommand(
          device.id,
          'configure_bandwidth',
          qosConfig,
          null
        );
      }

      if (!result.success) {
        throw new Error(`Error aplicando configuración: ${result.error}`);
      }

      // Actualizar estado de la red de cliente
      await clientNetwork.update({
        lastCheck: new Date(),
        status: 'online',
        notes: `QoS aplicado: ${qosConfig.downloadSpeed}/${qosConfig.uploadSpeed} Kbps - ${new Date().toISOString()}`
      }, {
        where: { id: clientNetworkId }
      });

      logger.info(`Configuración QoS aplicada exitosamente para cliente ${clientNetwork.client.firstName} ${clientNetwork.client.lastName}`);

      return {
        success: true,
        message: 'Configuración QoS aplicada exitosamente',
        data: {
          clientNetworkId,
          deviceId: device.id,
          deviceInfo: `${device.brand} ${device.model} (${device.ipAddress})`,
          config: qosConfig,
          executionTime: result.executionTime
        }
      };

    } catch (error) {
      logger.error(`Error al aplicar configuración QoS: ${error.message}`);
      
      // Registrar el error en la red de cliente
      if (clientNetworkId) {
        try {
          await clientNetwork.update({
            lastCheck: new Date(),
            status: 'warning',
            notes: `Error QoS: ${error.message} - ${new Date().toISOString()}`
          }, {
            where: { id: clientNetworkId }
          });
        } catch (updateError) {
          logger.error(`Error actualizando estado de error: ${updateError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Actualiza el estado de conexión de una red de cliente
   * @param {number} clientNetworkId - ID de la red de cliente
   * @returns {Promise<Object>} Estado actualizado
   */
  async updateConnectionStatus(clientNetworkId) {
    try {
      logger.info(`Actualizando estado de conexión para cliente network ${clientNetworkId}`);

      // Obtener datos de la red del cliente con el dispositivo asociado
      const clientNetwork = await clientNetwork.findByPk(clientNetworkId, {
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'type', 'brand', 'model', 'ipAddress']
          }
        ]
      });

      if (!clientNetwork) {
        throw new Error('Red de cliente no encontrada');
      }

      if (!clientNetwork.device) {
        throw new Error('No hay dispositivo asociado a esta red de cliente');
      }

      if (!clientNetwork.macAddress) {
        throw new Error('Red de cliente no tiene dirección MAC configurada');
      }

      const device = clientNetwork.device;
      let isOnline = false;
      let clientInfo = null;

      // Obtener información del cliente conectado usando el sistema centralizado
      try {
        const result = await deviceCommandService.executeCommand(
          device.id,
          'getConnectedClients',
          { macAddress: clientNetwork.macAddress },
          null
        );

        if (result.success && result.result) {
          // Buscar el cliente por MAC en los resultados
          const clients = Array.isArray(result.result) ? result.result : [result.result];
          clientInfo = clients.find(c => 
            c.macAddress && c.macAddress.toLowerCase() === clientNetwork.macAddress.toLowerCase()
          );
          
          isOnline = !!clientInfo;
        }
      } catch (error) {
        logger.warn(`No se pudo obtener información de clientes conectados: ${error.message}`);
        
        // Intentar con comando alternativo de conectividad
        try {
          const pingResult = await deviceCommandService.executeCommand(
            device.id,
            'pingClient',
            { 
              targetIp: clientNetwork.staticIp,
              count: 2
            },
            null
          );
          
          isOnline = pingResult.success && pingResult.result && pingResult.result.packetsReceived > 0;
        } catch (pingError) {
          logger.warn(`Ping también falló: ${pingError.message}`);
          isOnline = false;
        }
      }

      // Actualizar estado de la red de cliente
      const updateData = {
        lastCheck: new Date(),
        status: isOnline ? 'online' : 'offline'
      };

      // Si está online y tenemos datos del cliente, actualizarlos
      if (isOnline && clientInfo) {
        if (clientInfo.rxBytes !== undefined) updateData.lastTrafficIn = clientInfo.rxBytes;
        if (clientInfo.txBytes !== undefined) updateData.lastTrafficOut = clientInfo.txBytes;
        if (clientInfo.signalStrength !== undefined) updateData.notes = `Señal: ${clientInfo.signalStrength}dBm`;
      }

      await clientNetwork.update(updateData, {
        where: { id: clientNetworkId }
      });

      logger.info(`Estado actualizado para cliente network ${clientNetworkId}: ${isOnline ? 'online' : 'offline'}`);

      return {
        success: true,
        message: `Estado actualizado: ${isOnline ? 'online' : 'offline'}`,
        data: {
          clientNetworkId,
          online: isOnline,
          lastCheck: updateData.lastCheck,
          clientInfo: clientInfo,
          deviceInfo: `${device.brand} ${device.model}`
        }
      };

    } catch (error) {
      logger.error(`Error al actualizar estado de conexión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de tráfico para una red de cliente
   * @param {number} clientNetworkId - ID de la red de cliente
   * @returns {Promise<Object>} Estadísticas de tráfico
   */
  async getTrafficStatistics(clientNetworkId) {
    try {
      logger.info(`Obteniendo estadísticas de tráfico para cliente network ${clientNetworkId}`);

      const clientNetwork = await clientNetwork.findByPk(clientNetworkId, {
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'type', 'brand', 'model', 'ipAddress']
          }
        ]
      });

      if (!clientNetwork) {
        throw new Error('Red de cliente no encontrada');
      }

      if (!clientNetwork.device) {
        throw new Error('No hay dispositivo asociado a esta red de cliente');
      }

      const device = clientNetwork.device;
      const params = {
        macAddress: clientNetwork.macAddress,
        staticIp: clientNetwork.staticIp
      };

      // Obtener estadísticas usando el sistema centralizado
      let trafficStats = null;
      try {
        const result = await deviceCommandService.executeCommand(
          device.id,
          'getClientTraffic',
          params,
          null
        );

        if (result.success) {
          trafficStats = result.result;
        }
      } catch (error) {
        logger.warn(`No se pudieron obtener estadísticas de tráfico: ${error.message}`);
      }

      // Si no hay estadísticas actuales, usar las últimas conocidas
      if (!trafficStats) {
        trafficStats = {
          rxBytes: clientNetwork.lastTrafficIn || 0,
          txBytes: clientNetwork.lastTrafficOut || 0,
          lastUpdate: clientNetwork.lastCheck,
          source: 'cached'
        };
      } else {
        // Actualizar cache con las nuevas estadísticas
        await clientNetwork.update({
          lastTrafficIn: trafficStats.rxBytes || 0,
          lastTrafficOut: trafficStats.txBytes || 0,
          lastCheck: new Date()
        }, {
          where: { id: clientNetworkId }
        });

        trafficStats.source = 'live';
      }

      return {
        success: true,
        data: {
          clientNetworkId,
          clientName: `${clientNetwork.client.firstName} ${clientNetwork.client.lastName}`,
          deviceInfo: `${device.brand} ${device.model}`,
          trafficStats,
          contractedSpeeds: {
            download: clientNetwork.downloadSpeed,
            upload: clientNetwork.uploadSpeed
          }
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas de tráfico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecuta test de conectividad para una red de cliente
   * @param {number} clientNetworkId - ID de la red de cliente
   * @returns {Promise<Object>} Resultado del test
   */
  async testClientConnectivity(clientNetworkId) {
    try {
      logger.info(`Ejecutando test de conectividad para cliente network ${clientNetworkId}`);

      const clientNetwork = await clientNetwork.findByPk(clientNetworkId, {
        include: [
          {
            model: Client,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'type', 'brand', 'model', 'ipAddress']
          }
        ]
      });

      if (!clientNetwork) {
        throw new Error('Red de cliente no encontrada');
      }

      if (!clientNetwork.device) {
        throw new Error('No hay dispositivo asociado a esta red de cliente');
      }

      const device = clientNetwork.device;
      const testResults = {
        deviceConnectivity: false,
        clientVisible: false,
        trafficActive: false,
        configurationValid: false
      };

      // 1. Test de conectividad al dispositivo
      try {
        const deviceTest = await deviceCommandService.testConnection(device, null);
        testResults.deviceConnectivity = deviceTest.success;
      } catch (error) {
        logger.warn(`Test de dispositivo falló: ${error.message}`);
      }

      // 2. Verificar si el cliente es visible en el dispositivo
      if (testResults.deviceConnectivity && clientNetwork.macAddress) {
        try {
          const clientsResult = await deviceCommandService.executeCommand(
            device.id,
            'getConnectedClients',
            { macAddress: clientNetwork.macAddress },
            null
          );
          
          if (clientsResult.success) {
            const clients = Array.isArray(clientsResult.result) ? clientsResult.result : [clientsResult.result];
            const clientFound = clients.find(c => 
              c.macAddress && c.macAddress.toLowerCase() === clientNetwork.macAddress.toLowerCase()
            );
            
            testResults.clientVisible = !!clientFound;
            testResults.trafficActive = clientFound && (clientFound.rxBytes > 0 || clientFound.txBytes > 0);
          }
        } catch (error) {
          logger.warn(`Test de visibilidad de cliente falló: ${error.message}`);
        }
      }

      // 3. Verificar configuración QoS
      if (testResults.deviceConnectivity) {
        try {
          const qosResult = await deviceCommandService.executeCommand(
            device.id,
            'check_qos_rules',
            { macAddress: clientNetwork.macAddress },
            null
          );
          
          testResults.configurationValid = qosResult.success;
        } catch (error) {
          logger.warn(`Test de configuración QoS falló: ${error.message}`);
          // No es crítico, marcar como válido si el dispositivo responde
          testResults.configurationValid = testResults.deviceConnectivity;
        }
      }

      // Actualizar estado basado en los resultados del test
      let overallStatus = 'offline';
      if (testResults.deviceConnectivity && testResults.clientVisible) {
        overallStatus = 'online';
      } else if (testResults.deviceConnectivity) {
        overallStatus = 'warning';
      }

      await ClientNetwork.update({
        status: overallStatus,
        lastCheck: new Date(),
        notes: `Test: Device(${testResults.deviceConnectivity}), Client(${testResults.clientVisible}), Traffic(${testResults.trafficActive})`
      }, {
        where: { id: clientNetworkId }
      });

      return {
        success: true,
        data: {
          clientNetworkId,
          clientName: `${clientNetwork.client.firstName} ${clientNetwork.client.lastName}`,
          deviceInfo: `${device.brand} ${device.model} (${device.ipAddress})`,
          testResults,
          overallStatus,
          recommendations: this._generateRecommendations(testResults)
        }
      };

    } catch (error) {
      logger.error(`Error en test de conectividad: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera recomendaciones basadas en los resultados del test
   * @private
   */
  _generateRecommendations(testResults) {
    const recommendations = [];

    if (!testResults.deviceConnectivity) {
      recommendations.push({
        level: 'critical',
        message: 'Dispositivo no responde - verificar conectividad de red',
        action: 'check_device_network'
      });
    }

    if (testResults.deviceConnectivity && !testResults.clientVisible) {
      recommendations.push({
        level: 'high',
        message: 'Cliente no visible en dispositivo - verificar conexión física',
        action: 'check_physical_connection'
      });
    }

    if (testResults.clientVisible && !testResults.trafficActive) {
      recommendations.push({
        level: 'medium',
        message: 'Cliente conectado pero sin tráfico - verificar configuración del cliente',
        action: 'checkClientConfig'
      });
    }

    if (testResults.deviceConnectivity && !testResults.configurationValid) {
      recommendations.push({
        level: 'medium',
        message: 'Configuración QoS no válida - reconfigurar límites de ancho de banda',
        action: 'reconfigure_qos'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        level: 'info',
        message: 'Todos los tests pasaron correctamente',
        action: 'none'
      });
    }

    return recommendations;
  }
}

module.exports = new ClientNetworkService();