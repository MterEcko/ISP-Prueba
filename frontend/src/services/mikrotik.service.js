import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class MikrotikService {
  // ===== OPERACIONES BÁSICAS =====
  
  // Probar conexión con un dispositivo Mikrotik
  testConnection(ipAddress, username, password, apiPort = 8728) {
    return axios.post(API_URL + 'mikrotik/test-connection', {
      ipAddress,
      username,
      password,
      apiPort
    }, { headers: authHeader() });
  }
  
  // Obtener información del dispositivo
  getDeviceInfo(ipAddress, username, password, apiPort = 8728) {
    return axios.post(API_URL + 'mikrotik/device-info', {
      ipAddress,
      username,
      password,
      apiPort
    }, { headers: authHeader() });
  }
  
  // ===== GESTIÓN DE DISPOSITIVOS =====
  
  // Obtener métricas de un dispositivo
  getDeviceMetrics(deviceId, period = '1h') {
    return axios.get(API_URL + `mikrotik/devices/${deviceId}/metrics?period=${period}`, {
      headers: authHeader()
    });
  }
  
  // Obtener estadísticas de tráfico
  getTrafficStatistics(deviceId, interfaceName) {
    return axios.get(API_URL + `mikrotik/devices/${deviceId}/traffic?interfaceName=${interfaceName}`, {
      headers: authHeader()
    });
  }
  
  // Ejecutar acción en el dispositivo
  executeDeviceAction(deviceId, action) {
    return axios.post(API_URL + `mikrotik/devices/${deviceId}/execute-action`, {
      action
    }, { headers: authHeader() });
  }
  
  // ===== GESTIÓN DE PPPoE =====
  
  // Obtener todos los usuarios PPPoE de un dispositivo
  getPPPoEUsers(deviceId) {
    return axios.get(API_URL + `mikrotik/devices/${deviceId}/pppoe-users`, {
      headers: authHeader()
    });
  }
  
  // Obtener sesiones PPPoE activas
  getActivePPPoESessions(deviceId) {
    return axios.get(API_URL + `mikrotik/devices/${deviceId}/active-sessions`, {
      headers: authHeader()
    });
  }
  
  // Crear usuario PPPoE
  createPPPoEUser(deviceId, userData) {
    return axios.post(API_URL + `mikrotik/devices/${deviceId}/pppoe-users`, userData, {
      headers: authHeader()
    });
  }
  
  // Actualizar usuario PPPoE
  updatePPPoEUser(deviceId, userId, userData) {
    return axios.put(API_URL + `mikrotik/devices/${deviceId}/pppoe-users/${userId}`, userData, {
      headers: authHeader()
    });
  }
  
  // Eliminar usuario PPPoE
  deletePPPoEUser(deviceId, userId) {
    return axios.delete(API_URL + `mikrotik/devices/${deviceId}/pppoe-users/${userId}`, {
      headers: authHeader()
    });
  }
  
  // Reiniciar sesión PPPoE
  restartPPPoESession(deviceId, sessionId) {
    return axios.post(API_URL + `mikrotik/devices/${deviceId}/restart-session/${sessionId}`, {}, {
      headers: authHeader()
    });
  }
  
  // Obtener perfiles PPPoE disponibles
  getPPPoEProfiles(deviceId) {
    return axios.get(API_URL + `mikrotik/devices/${deviceId}/pppoe-profiles`, {
      headers: authHeader()
    });
  }
  
  // ===== GESTIÓN DE QoS =====
  
  // Configurar QoS para un cliente
  configureQoS(deviceId, qosData) {
    return axios.post(API_URL + `mikrotik/devices/${deviceId}/qos`, qosData, {
      headers: authHeader()
    });
  }
  
  // ===== OPERACIONES ESPECÍFICAS PARA CLIENTES =====
  
  // Crear usuario PPPoE para un cliente específico
  createClientPPPoE(clientId, deviceId, connectionData) {
    return axios.post(API_URL + `client-mikrotik/clients/${clientId}/devices/${deviceId}/pppoe`, connectionData, {
      headers: authHeader()
    });
  }
  
  // Actualizar configuración PPPoE de un cliente
  updateClientPPPoE(clientId, updateData) {
    return axios.put(API_URL + `client-mikrotik/clients/${clientId}/pppoe`, updateData, {
      headers: authHeader()
    });
  }
  
  // Eliminar configuración PPPoE de un cliente
  deleteClientPPPoE(clientId) {
    return axios.delete(API_URL + `client-mikrotik/clients/${clientId}/pppoe`, {
      headers: authHeader()
    });
  }
  
  // Configurar límites de ancho de banda para un cliente
  setClientBandwidth(clientId, bandwidthData) {
    return axios.post(API_URL + `client-mikrotik/clients/${clientId}/bandwidth`, bandwidthData, {
      headers: authHeader()
    });
  }
  
  // Obtener estadísticas de tráfico de un cliente
  getClientTrafficStats(clientId) {
    return axios.get(API_URL + `client-mikrotik/clients/${clientId}/traffic`, {
      headers: authHeader()
    });
  }
  
  // Reiniciar sesión PPPoE de un cliente
  restartClientPPPoESession(clientId) {
    return axios.post(API_URL + `client-mikrotik/clients/${clientId}/restart-pppoe`, {}, {
      headers: authHeader()
    });
  }
  
  // Sincronizar todos los clientes con Mikrotik
  syncAllClientsWithMikrotik() {
    return axios.post(API_URL + 'client-mikrotik/sync-all', {}, {
      headers: authHeader()
    });
  }
  
  // ===== MÉTODOS DE UTILIDAD =====
  
  // Validar formato de IP
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
  
  // Validar puerto API
  isValidPort(port) {
    const portNumber = parseInt(port);
    return !isNaN(portNumber) && portNumber >= 1 && portNumber <= 65535;
  }
  
  // Formatear bytes a unidades legibles
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Formatear tiempo de actividad
  formatUptime(uptime) {
    if (!uptime) return 'No disponible';
    
    const weeks = Math.floor(uptime / (7 * 24 * 60 * 60));
    const days = Math.floor((uptime % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    let result = '';
    if (weeks > 0) result += `${weeks}w `;
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    
    return result.trim() || '0m';
  }
}

export default new MikrotikService();