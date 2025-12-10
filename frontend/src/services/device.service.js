// backend/src/services/device.service.js

const db = require('../models');
const Device = db.Device;
const DeviceCredential = db.DeviceCredential;
const CommandHistory = db.CommandHistory;
const DeviceMetric = db.DeviceMetric;
const DeviceCommand = db.DeviceCommand; // Nuevo modelo

// Servicios específicos
const MikrotikService = require('./mikrotik.service');
const logger = require('../utils/logger');

// Adaptadores para protocolos genéricos
const SSHClient = require('ssh2').Client;
const snmp = require('net-snmp');

/**
 * Servicio principal para gestión de dispositivos
 * Actúa como fachada unificada para todos los tipos de dispositivos
 */
class DeviceService {
  
  /**
   * Prueba la conexión a un dispositivo
   */
  async testConnection(device, credentials) {
    const startTime = Date.now();
    
    try {
      let result = false;
      let connectionInfo = null;
      
      // Mikrotik usa su servicio específico (solo API)
      if (device.brand.toLowerCase() === 'mikrotik') {
        result = await MikrotikService.testConnection(
          device.ipAddress,
          credentials.port || 8728,
          credentials.username,
          credentials.password
        );
        
        if (result) {
          connectionInfo = await MikrotikService.getDeviceInfo(
            device.ipAddress,
            credentials.port || 8728,
            credentials.username,
            credentials.password
          );
        }
      } else {
        // Otros dispositivos usan SSH/SNMP
        result = await this._testGenericConnection(device, credentials);
      }
      
      // Registrar intento
      await this._logCommand(device.id, null, 'testConnection', {}, {
        success: result,
        connectionInfo: connectionInfo,
        executionTime: Date.now() - startTime
      }, null);
      
      return {
        success: result,
        message: result ? 'Conexión establecida exitosamente' : 'No se pudo conectar al dispositivo',
        connectionInfo: connectionInfo,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Error testing connection to device ${device.id}: ${error.message}`);
      
      await this._logCommand(device.id, null, 'testConnection', {}, null, error.message);
      
      return {
        success: false,
        message: 'Error al probar conexión',
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Obtiene información detallada del dispositivo
   */
  async getDeviceInfo(deviceId, userId = null) {
    const startTime = Date.now();
    
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error(`Dispositivo con ID ${deviceId} no encontrado`);
      }
      
      const credentials = await this._getDeviceCredentials(deviceId);
      let deviceInfo = null;
      
      // Mikrotik usa su servicio específico
      if (device.brand.toLowerCase() === 'mikrotik') {
        const result = await MikrotikService.getDeviceInfo(
          device.ipAddress,
          credentials.port || 8728,
          credentials.username,
          credentials.password
        );
        deviceInfo = result.info;
      } else {
        // Otros dispositivos usan comandos de la BD
        deviceInfo = await this._executeCommandFromDB(device, credentials, 'get_device_info', {});
      }
      
      // Actualizar información del dispositivo
      if (deviceInfo) {
        await device.update({
          firmwareVersion: deviceInfo.version || device.firmwareVersion,
          modelHardware: deviceInfo.model || device.modelHardware,
          lastSeen: new Date(),
          status: 'online'
        });
      }
      
      // Registrar comando
      await this._logCommand(deviceId, userId, 'get_device_info', {}, {
        deviceInfo: deviceInfo,
        executionTime: Date.now() - startTime
      }, null);
      
      return {
        success: true,
        deviceInfo: deviceInfo,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Error getting device info for device ${deviceId}: ${error.message}`);
      await this._logCommand(deviceId, userId, 'get_device_info', {}, null, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecuta un comando en el dispositivo
   */
  async executeCommand(deviceId, command, params = {}, userId = null) {
    const startTime = Date.now();
    
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error(`Dispositivo con ID ${deviceId} no encontrado`);
      }
      
      const credentials = await this._getDeviceCredentials(deviceId);
      let result = null;
      
      // Mikrotik usa su servicio específico
      if (device.brand.toLowerCase() === 'mikrotik') {
        result = await this._executeMikrotikCommand(device, credentials, command, params);
      } else {
        // Otros dispositivos usan comandos de la BD
        result = await this._executeCommandFromDB(device, credentials, command, params);
      }
      
      // Actualizar último acceso
      await device.update({ lastSeen: new Date() });
      
      // Registrar comando
      await this._logCommand(deviceId, userId, command, params, result, null);
      
      return {
        success: true,
        result: result,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Error executing command ${command} on device ${deviceId}: ${error.message}`);
      await this._logCommand(deviceId, userId, command, params, null, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecuta comando desde la configuración en BD
   * @private
   */
  async _executeCommandFromDB(device, credentials, commandName, params) {
    // Buscar comando en la BD
    const command = await DeviceCommand.findOne({
      where: {
        brand: device.brand.toLowerCase(),
        deviceType: device.type,
        commandName: commandName,
        active: true
      }
    });
    
    if (!command) {
      throw new Error(`Comando ${commandName} no encontrado para ${device.brand} ${device.type}`);
    }
    
    // Ejecutar según el tipo de conexión disponible
    if (credentials.connectionType === 'ssh' && command.sshCommand) {
      return await this._executeSSHCommand(device, credentials, command.sshCommand, params);
    } else if ((credentials.connectionType === 'snmp' || credentials.snmpCommunity) && command.snmpOid) {
      return await this._executeSNMPCommand(device, credentials, command.snmpOid, command.snmpMode);
    } else {
      // Intentar con lo que esté disponible
      if (command.sshCommand && credentials.username) {
        return await this._executeSSHCommand(device, credentials, command.sshCommand, params);
      } else if (command.snmpOid && credentials.snmpCommunity) {
        return await this._executeSNMPCommand(device, credentials, command.snmpOid, command.snmpMode);
      } else {
        throw new Error(`No hay implementación disponible para el comando ${commandName}`);
      }
    }
  }
  
  /**
   * Ejecuta acciones específicas de Mikrotik (sin cambios)
   * @private
   */
  async _executeMikrotikCommand(device, credentials, command, params) {
    const { ipAddress } = device;
    const { username, password, port = 8728 } = credentials;
    
    switch (command) {
      case 'restart':
      case 'reboot':
        return await MikrotikService.executeAction(ipAddress, port, username, password, 'reboot');
        
      case 'backup':
        return await MikrotikService.executeAction(ipAddress, port, username, password, 'backup');
        
      case 'getPppoeUsers':
        return await MikrotikService.getPPPoEUsers(ipAddress, port, username, password);
        
      case 'getActiveSessions':
        return await MikrotikService.getActivePPPoESessions(ipAddress, port, username, password);
        
      case 'createPppoeUser':
        return await MikrotikService.createPPPoEUser(ipAddress, port, username, password, params);
        
      case 'updatePppoeSser':
        return await MikrotikService.updatePPPoEUser(ipAddress, port, username, password, params.id, params);
        
      case 'deletePppoeUser':
        return await MikrotikService.deletePPPoEUser(ipAddress, port, username, password, params.id);
        
      case 'configureQos':
        return await MikrotikService.configureQoS(ipAddress, port, username, password, params);
        
      case 'getIpPools':
        return await MikrotikService.getIPPools(ipAddress, port, username, password);
        
      case 'getProfiles':
        return await MikrotikService.getPPPoEProfiles(ipAddress, port, username, password);
        
      default:
        throw new Error(`Comando no soportado para Mikrotik: ${command}`);
    }
  }
  
  /**
   * Ejecuta un comando SSH
   * @private
   */
  async _executeSSHCommand(device, credentials, command, params = {}) {
    return new Promise((resolve, reject) => {
      const conn = new SSHClient();
      let output = '';
      
      // Reemplazar parámetros en el comando
      let finalCommand = command;
      for (const [key, value] of Object.entries(params)) {
        finalCommand = finalCommand.replace(`{${key}}`, value);
      }
      
      conn.on('ready', () => {
        conn.exec(finalCommand, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          
          stream.on('close', (code, signal) => {
            conn.end();
            if (code === 0) {
              resolve({ success: true, output: output.trim(), raw: output });
            } else {
              reject(new Error(`Command failed with code ${code}: ${output}`));
            }
          }).on('data', (data) => {
            output += data.toString();
          }).stderr.on('data', (data) => {
            output += data.toString();
          });
        });
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host: device.ipAddress,
        port: credentials.port || 22,
        username: credentials.username,
        password: credentials.password,
        timeout: 10000
      });
    });
  }
  
  /**
   * Ejecuta una consulta SNMP
   * @private
   */
  async _executeSNMPCommand(device, credentials, oid, mode = 'get') {
    return new Promise((resolve, reject) => {
      const session = snmp.createSession(device.ipAddress, credentials.snmpCommunity || 'public', {
        port: credentials.port || 161,
        version: credentials.snmpVersion === 'v1' ? snmp.Version1 : snmp.Version2c,
        timeout: 5000
      });
      
      if (mode === 'get') {
        session.get([oid], (error, varbinds) => {
          session.close();
          
          if (error) {
            return reject(error);
          }
          
          if (snmp.isVarbindError(varbinds[0])) {
            return reject(new Error(snmp.varbindError(varbinds[0])));
          }
          
          resolve({
            success: true,
            oid: oid,
            value: varbinds[0].value.toString(),
            type: varbinds[0].type
          });
        });
      } else if (mode === 'walk') {
        let results = [];
        
        session.walk(oid, (varbinds) => {
          varbinds.forEach(vb => {
            results.push({
              oid: vb.oid,
              value: vb.value.toString(),
              type: vb.type
            });
          });
        }, (error) => {
          session.close();
          
          if (error) {
            return reject(error);
          } else {
            resolve({
              success: true,
              results: results
            });
          }
        });
      }
    });
  }
  
  /**
   * Prueba conexión genérica (SSH/SNMP)
   * @private
   */
  async _testGenericConnection(device, credentials) {
    try {
      // Intentar SSH primero
      if (credentials.connectionType === 'ssh' || credentials.username) {
        const result = await this._executeSSHCommand(device, credentials, 'echo "CONNECTION_TEST_OK"');
        return result.success && result.output.includes('CONNECTION_TEST_OK');
      }
      
      // Intentar SNMP
      if (credentials.connectionType === 'snmp' || credentials.snmpCommunity) {
        const result = await this._executeSNMPCommand(device, credentials, '1.3.6.1.2.1.1.1.0'); // sysDescr
        return result.success;
      }
      
      return false;
    } catch (error) {
      logger.warn(`Generic connection test failed for device ${device.id}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Obtiene credenciales del dispositivo
   * @private
   */
  async _getDeviceCredentials(deviceId) {
    const credentials = await DeviceCredential.findOne({
      where: { deviceId, isActive: true }
    });
    
    if (!credentials) {
      throw new Error(`No se encontraron credenciales activas para el dispositivo ${deviceId}`);
    }
    
    return credentials;
  }
  
  /**
   * Registra comando ejecutado en el historial
   * @private
   */
  async _logCommand(deviceId, userId, command, parameters, result, error) {
    try {
      await CommandHistory.create({
        deviceId,
        userId,
        command,
        parameters,
        result,
        error,
        success: !error,
        executionTime: result?.executionTime || null,
        connectionType: result?.connectionType || 'unknown'
      });
    } catch (logError) {
      logger.error(`Error logging command history: ${logError.message}`);
    }
  }
  
  /**
   * Guarda métricas en la base de datos
   * @private
   */
  async _saveMetrics(deviceId, metrics) {
    try {
      const metricData = {
        deviceId,
        collectionMethod: 'api',
        recordedAt: new Date(),
        status: 'online'
      };
      
      // Adaptar métricas según el formato
      if (metrics.cpu) {
        metricData.cpuUsage = metrics.cpu[0]?.value || null;
      }
      
      if (metrics.memory) {
        metricData.memoryUsage = metrics.memory[0]?.value || null;
      }
      
      if (metrics.traffic) {
        metricData.interfaceTraffic = metrics.traffic;
      }
      
      if (metrics.sysUpTime) {
        metricData.uptime = parseInt(metrics.sysUpTime) || null;
      }
      
      await DeviceMetric.create(metricData);
    } catch (error) {
      logger.error(`Error saving metrics for device ${deviceId}: ${error.message}`);
    }
  }
  
  /**
   * Obtiene métricas del dispositivo
   */
  async getDeviceMetrics(deviceId, period = '1h', userId = null) {
    const startTime = Date.now();
    
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error(`Dispositivo con ID ${deviceId} no encontrado`);
      }
      
      const credentials = await this._getDeviceCredentials(deviceId);
      let metrics = null;
      
      // Mikrotik usa su servicio específico
      if (device.brand.toLowerCase() === 'mikrotik') {
        metrics = await MikrotikService.getMetrics(
          device.ipAddress,
          credentials.port || 8728,
          credentials.username,
          credentials.password,
          period
        );
      } else {
        // Otros dispositivos: obtener métricas via SNMP desde comandos en BD
        metrics = await this._getGenericMetricsFromDB(device, credentials);
      }
      
      // Guardar métricas
      if (metrics) {
        await this._saveMetrics(deviceId, metrics);
      }
      
      // Registrar comando
      await this._logCommand(deviceId, userId, 'get_metrics', { period }, {
        metricsCollected: !!metrics,
        executionTime: Date.now() - startTime
      }, null);
      
      return {
        success: true,
        metrics: metrics,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`Error getting metrics for device ${deviceId}: ${error.message}`);
      await this._logCommand(deviceId, userId, 'get_metrics', { period }, null, error.message);
      throw error;
    }
  }
  
  /**
   * Obtiene métricas usando comandos de la BD
   * @private
   */
  async _getGenericMetricsFromDB(device, credentials) {
    try {
      const metrics = {};
      
      // Buscar comandos de métricas en la BD
      const metricCommands = await DeviceCommand.findAll({
        where: {
          brand: device.brand.toLowerCase(),
          deviceType: device.type,
          commandName: {
            [db.Sequelize.Op.like]: 'get_metric_%'
          },
          active: true
        }
      });
      
      // Ejecutar cada comando de métrica
      for (const cmd of metricCommands) {
        try {
          let result;
          if (cmd.snmpOid) {
            result = await this._executeSNMPCommand(device, credentials, cmd.snmpOid, cmd.snmpMode);
          } else if (cmd.sshCommand) {
            result = await this._executeSSHCommand(device, credentials, cmd.sshCommand);
          }
          
          if (result && result.success) {
            // Extraer nombre de la métrica del commandName
            const metricName = cmd.commandName.replace('get_metric_', '');
            metrics[metricName] = result.value || result.output;
          }
        } catch (error) {
          logger.warn(`Failed to get metric ${cmd.commandName} for device ${device.id}: ${error.message}`);
        }
      }
      
      return Object.keys(metrics).length > 0 ? metrics : null;
    } catch (error) {
      logger.error(`Error getting metrics from DB for device ${device.id}: ${error.message}`);
      return null;
    }
  }
}

module.exports = new DeviceService();