// backend/src/services/snmp.service.js
const snmp = require('net-snmp');

class SNMPService {
  constructor() {
    this.sessions = new Map(); // Cache de sesiones SNMP
  }

  /**
   * Crear sesión SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {string} version - Versión SNMP (v1, v2c, v3)
   * @param {number} port - Puerto SNMP (por defecto 161)
   * @param {number} timeout - Timeout en ms
   * @param {number} retries - Número de reintentos
   */
  createSession(ipAddress, community = 'public', version = 'v2c', port = 161, timeout = 5000, retries = 1) {
    const sessionKey = `${ipAddress}:${port}:${community}`;
    
    // Verificar si ya existe una sesión
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    // Configuración de sesión según versión
    let sessionOptions = {
      port: port,
      retries: retries,
      timeout: timeout
    };

    // Configurar versión SNMP
    switch (version.toLowerCase()) {
      case 'v1':
        sessionOptions.version = snmp.Version1;
        break;
      case 'v2c':
        sessionOptions.version = snmp.Version2c;
        break;
      case 'v3':
        sessionOptions.version = snmp.Version3;
        break;
      default:
        sessionOptions.version = snmp.Version2c;
    }

    // Crear sesión
    const session = snmp.createSession(ipAddress, community, sessionOptions);
    
    // Guardar en cache
    this.sessions.set(sessionKey, session);
    
    return session;
  }

  /**
   * Ejecutar comando GET SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {string} oid - OID a consultar
   * @param {object} options - Opciones adicionales
   */
  async snmpGet(ipAddress, community, oid, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        version = 'v2c',
        port = 161,
        timeout = 5000,
        retries = 1
      } = options;

      try {
        const session = this.createSession(ipAddress, community, version, port, timeout, retries);
        
        session.get([oid], (error, varbinds) => {
          if (error) {
            console.error(`SNMP GET Error for ${ipAddress}:`, error.message);
            reject({
              success: false,
              error: error.message,
              ipAddress,
              oid
            });
          } else {
            const varbind = varbinds[0];
            
            if (snmp.isVarbindError(varbind)) {
              reject({
                success: false,
                error: snmp.varbindError(varbind),
                ipAddress,
                oid
              });
            } else {
              resolve({
                success: true,
                oid: varbind.oid,
                type: varbind.type,
                value: this.parseValue(varbind.value, varbind.type),
                rawValue: varbind.value,
                ipAddress
              });
            }
          }
        });
      } catch (error) {
        reject({
          success: false,
          error: error.message,
          ipAddress,
          oid
        });
      }
    });
  }

  /**
   * Ejecutar múltiples GET SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {Array} oids - Array de OIDs a consultar
   * @param {object} options - Opciones adicionales
   */
  async snmpGetMultiple(ipAddress, community, oids, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        version = 'v2c',
        port = 161,
        timeout = 5000,
        retries = 1
      } = options;

      try {
        const session = this.createSession(ipAddress, community, version, port, timeout, retries);
        
        session.get(oids, (error, varbinds) => {
          if (error) {
            console.error(`SNMP GET Multiple Error for ${ipAddress}:`, error.message);
            reject({
              success: false,
              error: error.message,
              ipAddress,
              oids
            });
          } else {
            const results = varbinds.map(varbind => {
              if (snmp.isVarbindError(varbind)) {
                return {
                  success: false,
                  oid: varbind.oid,
                  error: snmp.varbindError(varbind)
                };
              } else {
                return {
                  success: true,
                  oid: varbind.oid,
                  type: varbind.type,
                  value: this.parseValue(varbind.value, varbind.type),
                  rawValue: varbind.value
                };
              }
            });

            resolve({
              success: true,
              ipAddress,
              results
            });
          }
        });
      } catch (error) {
        reject({
          success: false,
          error: error.message,
          ipAddress,
          oids
        });
      }
    });
  }

  /**
   * Ejecutar WALK SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {string} baseOid - OID base para el walk
   * @param {object} options - Opciones adicionales
   */
  async snmpWalk(ipAddress, community, baseOid, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        version = 'v2c',
        port = 161,
        timeout = 5000,
        retries = 1,
        maxRepetitions = 20
      } = options;

      try {
        const session = this.createSession(ipAddress, community, version, port, timeout, retries);
        const results = [];
        
        function feedCallback(varbinds) {
          for (let varbind of varbinds) {
            if (snmp.isVarbindError(varbind)) {
              console.error('WALK Error:', snmp.varbindError(varbind));
            } else {
              results.push({
                oid: varbind.oid,
                type: varbind.type,
                value: this.parseValue(varbind.value, varbind.type),
                rawValue: varbind.value
              });
            }
          }
        }

        function doneCallback(error) {
          if (error) {
            reject({
              success: false,
              error: error.message,
              ipAddress,
              baseOid
            });
          } else {
            resolve({
              success: true,
              ipAddress,
              baseOid,
              results
            });
          }
        }

        session.walk(baseOid, maxRepetitions, feedCallback.bind(this), doneCallback);
      } catch (error) {
        reject({
          success: false,
          error: error.message,
          ipAddress,
          baseOid
        });
      }
    });
  }

  /**
   * Ejecutar SET SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {Array} varbinds - Array de objetos {oid, type, value}
   * @param {object} options - Opciones adicionales
   */
  async snmpSet(ipAddress, community, varbinds, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        version = 'v2c',
        port = 161,
        timeout = 5000,
        retries = 1
      } = options;

      try {
        const session = this.createSession(ipAddress, community, version, port, timeout, retries);
        
        session.set(varbinds, (error, varbinds) => {
          if (error) {
            console.error(`SNMP SET Error for ${ipAddress}:`, error.message);
            reject({
              success: false,
              error: error.message,
              ipAddress,
              varbinds
            });
          } else {
            const results = varbinds.map(varbind => ({
              oid: varbind.oid,
              type: varbind.type,
              value: this.parseValue(varbind.value, varbind.type),
              rawValue: varbind.value
            }));

            resolve({
              success: true,
              ipAddress,
              results
            });
          }
        });
      } catch (error) {
        reject({
          success: false,
          error: error.message,
          ipAddress,
          varbinds
        });
      }
    });
  }

  /**
   * Parsear valor según el tipo SNMP
   * @param {*} value - Valor crudo
   * @param {number} type - Tipo SNMP
   */
  parseValue(value, type) {
    switch (type) {
      case snmp.ObjectType.Boolean:
        return Boolean(value);
      case snmp.ObjectType.Integer:
        return parseInt(value);
      case snmp.ObjectType.OctetString:
        return value.toString();
      case snmp.ObjectType.Counter:
      case snmp.ObjectType.Counter64:
        return parseInt(value);
      case snmp.ObjectType.Gauge:
        return parseInt(value);
      case snmp.ObjectType.TimeTicks:
        // Convertir centisegundos a formato legible
        const totalSeconds = Math.floor(value / 100);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return {
          raw: value,
          seconds: totalSeconds,
          formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
        };
      case snmp.ObjectType.IpAddress:
        return value.toString();
      default:
        return value.toString();
    }
  }

  /**
   * Probar conectividad SNMP
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {object} options - Opciones adicionales
   */
  async testConnection(ipAddress, community = 'public', options = {}) {
    try {
      // Probar con OID system description (estándar)
      const result = await this.snmpGet(ipAddress, community, '1.3.6.1.2.1.1.1.0', options);
      
      return {
        success: true,
        message: 'Conexión SNMP establecida exitosamente',
        deviceDescription: result.value,
        ipAddress,
        community: community.replace(/./g, '*') // Ocultar community por seguridad
      };
    } catch (error) {
      return {
        success: false,
        message: 'No se pudo establecer conexión SNMP',
        error: error.error || error.message,
        ipAddress
      };
    }
  }

  /**
   * Obtener información básica del dispositivo
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {object} options - Opciones adicionales
   */
  async getDeviceInfo(ipAddress, community = 'public', options = {}) {
    try {
      const basicOids = [
        '1.3.6.1.2.1.1.1.0', // sysDescr
        '1.3.6.1.2.1.1.5.0', // sysName
        '1.3.6.1.2.1.1.3.0', // sysUpTime
        '1.3.6.1.2.1.1.4.0', // sysContact
        '1.3.6.1.2.1.1.6.0'  // sysLocation
      ];

      const result = await this.snmpGetMultiple(ipAddress, community, basicOids, options);
      
      if (result.success) {
        const deviceInfo = {};
        result.results.forEach((item, index) => {
          if (item.success) {
            switch (index) {
              case 0: deviceInfo.description = item.value; break;
              case 1: deviceInfo.name = item.value; break;
              case 2: deviceInfo.uptime = item.value; break;
              case 3: deviceInfo.contact = item.value; break;
              case 4: deviceInfo.location = item.value; break;
            }
          }
        });

        return {
          success: true,
          ipAddress,
          deviceInfo
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || error.error,
        ipAddress
      };
    }
  }

  /**
   * Cerrar sesión específica
   * @param {string} ipAddress - IP del dispositivo
   * @param {string} community - Community string
   * @param {number} port - Puerto
   */
  closeSession(ipAddress, community = 'public', port = 161) {
    const sessionKey = `${ipAddress}:${port}:${community}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      session.close();
      this.sessions.delete(sessionKey);
    }
  }

  /**
   * Cerrar todas las sesiones
   */
  closeAllSessions() {
    this.sessions.forEach(session => {
      try {
        session.close();
      } catch (error) {
        console.error('Error cerrando sesión SNMP:', error);
      }
    });
    this.sessions.clear();
  }
}

// Crear instancia singleton
const snmpService = new SNMPService();

module.exports = snmpService;