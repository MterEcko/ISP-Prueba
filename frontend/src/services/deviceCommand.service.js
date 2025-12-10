// backend/src/services/deviceCommand.service.js
const { Client } = require('ssh2');
const snmp = require('net-snmp');
const db = require('../models');
const logger = require('../utils/logger');

class DeviceCommandService {
  // Ejecutar comando en cualquier dispositivo
  async executeCommand(deviceId, commandName, parameters = {}, userId = null) {
    const device = await db.Device.findByPk(deviceId);
    const credentials = await db.DeviceCredential.findOne({ 
      where: { deviceId, isActive: true } 
    });
    
    if (!device || !credentials) {
      throw new Error('Dispositivo o credenciales no encontrados');
    }
    
    // Buscar comando en BD
    const command = await db.DeviceCommand.findOne({
      where: {
        brand: device.brand,
        deviceType: device.type,
        commandName: commandName,
        active: true
      }
    });
    
    if (!command) {
      throw new Error(`Comando ${commandName} no encontrado para ${device.brand} ${device.type}`);
    }
    
    let result;
    
    // Ejecutar según el tipo de conexión
    if (credentials.connectionType === 'ssh' && command.sshCommand) {
      result = await this.executeSSH(device, credentials, command, parameters);
    } else if (credentials.connectionType === 'snmp' && command.snmpOid) {
      result = await this.executeSNMP(device, credentials, command, parameters);
    } else {
      throw new Error('Tipo de conexión no soportado o comando no disponible');
    }
    
    // Guardar en historial
    await db.CommandHistory.create({
      deviceId,
      userId,
      command: commandName,
      parameters,
      result: result.data,
      success: result.success,
      error: result.error,
      connectionType: credentials.connectionType,
      executionTime: result.executionTime
    });
    
    return result;
  }
  
  // Ejecutar comando SSH
  async executeSSH(device, credentials, command, parameters) {
    const startTime = Date.now();
    const conn = new Client();
    
    return new Promise((resolve) => {
      let output = '';
      
      conn.on('ready', () => {
        // Reemplazar parámetros en el comando
        let finalCommand = command.sshCommand;
        for (const [key, value] of Object.entries(parameters)) {
          finalCommand = finalCommand.replace(`{${key}}`, value);
        }
        
        conn.exec(finalCommand, (err, stream) => {
          if (err) {
            conn.end();
            resolve({
              success: false,
              error: err.message,
              executionTime: Date.now() - startTime
            });
            return;
          }
          
          stream.on('data', (data) => {
            output += data.toString();
          });
          
          stream.on('close', () => {
            conn.end();
            
            // Parsear respuesta si hay parser
            let parsedData = output;
            if (command.responseParser) {
              try {
                parsedData = this.parseResponse(output, command.responseParser);
              } catch (e) {
                logger.error('Error parsing response:', e);
              }
            }
            
            resolve({
              success: true,
              data: parsedData,
              rawOutput: output,
              executionTime: Date.now() - startTime
            });
          });
        });
      });
      
      conn.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          executionTime: Date.now() - startTime
        });
      });
      
      // Conectar
      conn.connect({
        host: device.ipAddress,
        port: credentials.port || 22,
        username: credentials.username,
        password: credentials.password
      });
    });
  }
  
  // Ejecutar comando SNMP
  async executeSNMP(device, credentials, command, parameters) {
    const startTime = Date.now();
    
    const session = snmp.createSession(
      device.ipAddress, 
      credentials.snmpCommunity || 'public',
      {
        port: credentials.port || 161,
        version: credentials.snmpVersion === 'v1' ? snmp.Version1 : snmp.Version2c
      }
    );
    
    return new Promise((resolve) => {
      const oid = command.snmpOid;
      
      if (command.snmpMode === 'get') {
        session.get([oid], (error, varbinds) => {
          session.close();
          
          if (error) {
            resolve({
              success: false,
              error: error.message,
              executionTime: Date.now() - startTime
            });
          } else {
            const data = varbinds[0] ? varbinds[0].value : null;
            resolve({
              success: true,
              data: data,
              executionTime: Date.now() - startTime
            });
          }
        });
      } else if (command.snmpMode === 'walk') {
        let results = [];
        
        session.walk(oid, (varbinds) => {
          varbinds.forEach(vb => {
            results.push({
              oid: vb.oid,
              value: vb.value
            });
          });
        }, (error) => {
          session.close();
          
          if (error) {
            resolve({
              success: false,
              error: error.message,
              executionTime: Date.now() - startTime
            });
          } else {
            resolve({
              success: true,
              data: results,
              executionTime: Date.now() - startTime
            });
          }
        });
      }
    });
  }
  
  // Parser genérico de respuestas
  parseResponse(output, parser) {
    // Si es un regex
    if (parser.startsWith('/') && parser.endsWith('/')) {
      const regex = new RegExp(parser.slice(1, -1));
      const match = output.match(regex);
      return match ? match[1] || match[0] : output;
    }
    
    // Si es JSON
    if (parser === 'json') {
      return JSON.parse(output);
    }
    
    // Si es líneas
    if (parser === 'lines') {
      return output.split('\n').filter(line => line.trim());
    }
    
    return output;
  }
  
  // Test de conexión
  async testConnection(device, credentials) {
    try {
      if (credentials.connectionType === 'ssh') {
        return await this.testSSH(device, credentials);
      } else if (credentials.connectionType === 'snmp') {
        return await this.testSNMP(device, credentials);
      }
      return { success: false, message: 'Tipo de conexión no soportado' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  async testSSH(device, credentials) {
    const conn = new Client();
    
    return new Promise((resolve) => {
      conn.on('ready', () => {
        conn.end();
        resolve({ success: true, message: 'Conexión SSH exitosa' });
      });
      
      conn.on('error', (err) => {
        resolve({ success: false, message: err.message });
      });
      
      conn.connect({
        host: device.ipAddress,
        port: credentials.port || 22,
        username: credentials.username,
        password: credentials.password,
        readyTimeout: 5000
      });
    });
  }
  
  async testSNMP(device, credentials) {
    const session = snmp.createSession(
      device.ipAddress, 
      credentials.snmpCommunity || 'public'
    );
    
    return new Promise((resolve) => {
      // OID estándar sysDescr
      session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
        session.close();
        
        if (error) {
          resolve({ success: false, message: error.message });
        } else {
          resolve({ success: true, message: 'Conexión SNMP exitosa' });
        }
      });
    });
  }
}

module.exports = new DeviceCommandService();