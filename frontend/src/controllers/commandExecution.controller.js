// backend/src/controllers/commandExecution.controller.js
const db = require('../models');
const Device = db.Device;
const DeviceCommand = db.DeviceCommand;
const DeviceCredential = db.DeviceCredential;
const CommandHistory = db.CommandHistory;
const SnmpOid = db.SnmpOid;

// Importar clientes para diferentes protocolos
const snmp = require('net-snmp');
const { NodeSSH } = require('node-ssh');
const { RouterOSAPI } = require('routeros');

// Ejecutar comando en dispositivo
exports.executeCommand = async (req, res) => {
  try {
    const { commandId, parameters = {} } = req.body;
    const deviceId = req.params.id;
    const userId = req.userId || 1; // Del middleware de auth o default

    // Verificar dispositivo
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    // Verificar comando
    const command = await DeviceCommand.findByPk(commandId);
    if (!command) {
      return res.status(404).json({
        success: false,
        message: 'Comando no encontrado'
      });
    }

    // Obtener credenciales del dispositivo según el tipo de comando
    const connectionType = command.commandType;
    const credentials = await DeviceCredential.findOne({
      where: { 
        deviceId: deviceId,
        connectionType: connectionType,
        isActive: true 
      }
    });

    if (!credentials) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron credenciales ${connectionType} para este dispositivo`
      });
    }

    let executionResult;
    const startTime = Date.now();

    // Ejecutar comando según el tipo
    switch (connectionType) {
      case 'snmp':
        executionResult = await executeSnmpCommand(device, credentials, command, parameters);
        break;
      case 'ssh':
        executionResult = await executeSshCommand(device, credentials, command, parameters);
        break;
      case 'api':
        if (device.brand === 'mikrotik') {
          executionResult = await executeMikrotikApiCommand(device, credentials, command, parameters);
        } else {
          throw new Error(`API no soportada para marca ${device.brand}`);
        }
        break;
      default:
        throw new Error(`Tipo de conexión no soportado: ${connectionType}`);
    }

    const executionTime = Date.now() - startTime;
    executionResult.executionTime = executionTime;
    executionResult.timestamp = new Date();

    // Registrar en historial
    await CommandHistory.create({
      deviceId: deviceId,
      userId: userId,
      command: command.commandName,
      parameters: parameters,
      result: executionResult,
      success: executionResult.success,
      executionTime: executionTime,
      connectionType: connectionType,
      ipAddress: device.ipAddress
    });

    return res.json({
      success: true,
      message: 'Comando ejecutado exitosamente',
      data: executionResult
    });

  } catch (error) {
    console.error('Error al ejecutar comando:', error);
    
    // Registrar error en historial
    if (req.params.id && req.body.commandId) {
      try {
        await CommandHistory.create({
          deviceId: req.params.id,
          userId: req.userId || 1,
          command: req.body.commandId,
          parameters: req.body.parameters || {},
          result: { error: error.message },
          success: false,
          executionTime: 0,
          connectionType: 'unknown',
          error: error.message
        });
      } catch (historyError) {
        console.error('Error guardando historial de error:', historyError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Error al ejecutar comando',
      error: error.message
    });
  }
};

// Ejecutar comando SNMP
async function executeSnmpCommand(device, credentials, command, parameters) {
  return new Promise((resolve, reject) => {
    let session;
    
    try {
      // Configurar sesión SNMP
      const options = {
        port: credentials.port || 161,
        retries: 1,
        timeout: 5000,
        version: snmp.Version2c
      };

      if (credentials.snmpVersion === 'v1') {
        options.version = snmp.Version1;
      } else if (credentials.snmpVersion === 'v3') {
        options.version = snmp.Version3;
        // TODO: Agregar configuración v3 (usuario, auth, priv)
      }

      session = snmp.createSession(device.ipAddress, credentials.snmpCommunity || 'public', options);

      // Determinar OID a consultar
      let oidToQuery = command.snmpOid;
      
      // Si no hay OID en el comando, buscar en la tabla SnmpOid
      if (!oidToQuery) {
        // TODO: Implementar búsqueda en SnmpOid por comando
        throw new Error('No se encontró OID para este comando');
      }

      // Ejecutar consulta SNMP
      session.get([oidToQuery], (error, varbinds) => {
        if (error) {
          session.close();
          reject(new Error(`Error SNMP: ${error.message}`));
          return;
        }

        if (varbinds.length === 0) {
          session.close();
          reject(new Error('No se recibieron datos SNMP'));
          return;
        }

        const varbind = varbinds[0];
        let value = varbind.value;
        let parsedValue = value;

        // Parsear según el tipo de dato
        if (snmp.isVarbindError(varbind)) {
          session.close();
          reject(new Error(`Error en varbind: ${snmp.varbindError(varbind)}`));
          return;
        }

        // Conversiones básicas según el tipo
        if (varbind.type === snmp.ObjectType.Integer) {
          parsedValue = parseInt(value);
        } else if (varbind.type === snmp.ObjectType.OctetString) {
          parsedValue = value.toString();
        } else if (varbind.type === snmp.ObjectType.TimeTicks) {
          // Convertir centisegundos a formato legible
          const seconds = parseInt(value) / 100;
          const days = Math.floor(seconds / 86400);
          const hours = Math.floor((seconds % 86400) / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          parsedValue = `${days}d ${hours}h ${minutes}m`;
        }

        session.close();
        resolve({
          success: true,
          output: `Comando ${command.commandName} ejecutado exitosamente`,
          data: {
            oid: oidToQuery,
            rawValue: value,
            parsedValue: parsedValue,
            type: varbind.type,
            command: command.commandName
          }
        });
      });

    } catch (error) {
      if (session) session.close();
      reject(error);
    }
  });
}

// Ejecutar comando SSH
async function executeSshCommand(device, credentials, command, parameters) {
  const ssh = new NodeSSH();
  
  try {
    // Conectar por SSH con algoritmos compatibles
    await ssh.connect({
      host: device.ipAddress,
      username: credentials.username,
      password: credentials.password,
      port: credentials.port || 22,
      readyTimeout: 10000,
      // ✅ ALGORITMOS SEGUROS Y COMPATIBLES
      algorithms: {
        kex: [
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1', 
          'diffie-hellman-group-exchange-sha256',
          'ecdh-sha2-nistp256'
        ],
        cipher: [
          'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
          'aes128-cbc', 'aes192-cbc', 'aes256-cbc',
          '3des-cbc'
          // ❌ REMOVIDO: 'blowfish-cbc' (no soportado)
        ],
        serverHostKey: [
          'ssh-rsa', 'ssh-dss'
        ],
        hmac: [
          'hmac-sha1', 'hmac-sha2-256', 'hmac-sha2-512'
        ]
      },
      strictVendor: false
    });

    // Ejecutar comando
    const sshCommand = command.sshCommand || command.commandName;
    const result = await ssh.execCommand(sshCommand);

    ssh.dispose();

    if (result.code !== 0) {
      throw new Error(`Comando SSH falló: ${result.stderr || 'Sin salida de error'}`);
    }

    return {
      success: true,
      output: `Comando SSH ${command.commandName} ejecutado exitosamente`,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
        command: sshCommand
      }
    };

  } catch (error) {
    ssh.dispose();
    throw new Error(`Error SSH: ${error.message}`);
  }
}

// Ejecutar comando Mikrotik API
async function executeMikrotikApiCommand(device, credentials, command, parameters) {
  const api = new RouterOSAPI({
    host: device.ipAddress,
    user: credentials.username,
    password: credentials.password,
    port: credentials.port || 8728
  });

  try {
    await api.connect();

    let result;
    
    // Mapear comandos a rutas de API de Mikrotik
    switch (command.commandName) {
      case 'get_system_info':
        result = await api.write('/system/resource/print');
        break;
      case 'get_interfaces':
        result = await api.write('/interface/print');
        break;
      case 'get_cpu_usage':
        result = await api.write('/system/resource/print');
        break;
      case 'get_memory_usage':
        result = await api.write('/system/resource/print');
        break;
      case 'getPppoeUsers':
        result = await api.write('/ppp/secret/print');
        break;
      case 'getActiveSessions':
        result = await api.write('/ppp/active/print');
        break;
      case 'reboot':
      case 'reboot_updated':
        result = await api.write('/system/reboot');
        break;
      default:
        throw new Error(`Comando Mikrotik no implementado: ${command.commandName}`);
    }

    api.close();

    return {
      success: true,
      output: `Comando Mikrotik API ${command.commandName} ejecutado exitosamente`,
      data: result
    };

  } catch (error) {
    api.close();
    throw new Error(`Error Mikrotik API: ${error.message}`);
  }
}

// Obtener historial de comandos para un dispositivo
exports.getCommandHistory = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: history } = await CommandHistory.findAndCountAll({
      where: { deviceId },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de comandos:', error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener historial de comandos",
      error: error.message
    });
  }
};