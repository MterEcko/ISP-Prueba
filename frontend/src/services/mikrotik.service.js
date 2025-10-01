// frontend/src/services/mikrotik.service.js - Versión mejorada

import axios from 'axios';
import authHeader from './auth-header';
import { handleApiError } from '../utils/apiErrorHandler';

import { API_URL } from './frontend_apiConfig';

class MikrotikService {
  constructor() {
    // Configurar interceptor para manejar errores específicos de Mikrotik
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Interceptor específico para errores de Mikrotik
    axios.interceptors.response.use(
      response => response,
      error => {
        if (error.config && error.config.url && error.config.url.includes('/mikrotik/')) {
          const errorInfo = handleApiError(error);
          if (errorInfo.mikrotikError) {
            console.warn('Mikrotik Connection Error:', errorInfo.error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== OPERACIONES BÁSICAS =====
  
  // Probar conexión con un dispositivo Mikrotik
  async testConnection(ipAddress, username, password, apiPort = 8728) {
    try {
      return await axios.post(API_URL + 'mikrotik/test-connection', {
        ipAddress,
        username,
        password,
        apiPort
      }, { headers: authHeader() });
    } catch (error) {
      console.error('Error testing Mikrotik connection:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // Obtener información del dispositivo
  async getDeviceInfo(ipAddress, username, password, apiPort = 8728) {
    try {
      return await axios.post(API_URL + 'mikrotik/device-info', {
        ipAddress,
        username,
        password,
        apiPort
      }, { headers: authHeader() });
    } catch (error) {
      console.error('Error getting device info:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // ===== GESTIÓN DE DISPOSITIVOS =====
  
  // Obtener métricas de un dispositivo
  async getDeviceMetrics(deviceId, period = '1h') {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/metrics?period=${period}`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting device metrics:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // Obtener estadísticas de tráfico
  async getTrafficStatistics(deviceId, interfaceName) {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/traffic?interfaceName=${interfaceName}`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting traffic statistics:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // ===== GESTIÓN DE PPPoE =====
  
  // Obtener todos los usuarios PPPoE de un dispositivo
  async getPPPoEUsers(deviceId) {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/pppoe-users`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting PPPoE users:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // Obtener sesiones PPPoE activas
  async getActivePPPoESessions(deviceId) {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/active-sessions`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting active PPPoE sessions:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // Crear usuario PPPoE
  async createPPPoEUser(deviceId, userData) {
    try {
      return await axios.post(API_URL + `mikrotik/devices/${deviceId}/pppoe-users`, userData, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error creating PPPoE user:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  async deletePPPoEUser(deviceId, mikrotikUserId) {

	try {
      console.log('🗑️ Eliminando usuario PPPoE:', { deviceId, mikrotikUserId });
      return await axios.delete(API_URL + `mikrotik/devices/${deviceId}/pppoe-users/${mikrotikUserId}`, mikrotikUserId, {
        headers: authHeader()
      });
    } catch(error) {
      console.error('Error eliminando usuario PPPoe:', error);
      throw this.handleMikrotikError(error);	  

    }		
  }
  
    // Método alternativo usando la ruta de cliente específica
  async deleteClientPPPoE(clientId) {
    try {
      console.log('🗑️ Eliminando PPPoE de cliente:', clientId);
      
      const response = await axios.delete(
        `${API_URL}client-mikrotik/clients/${clientId}/pppoe`, 
        {
          headers: authHeader()
        }
      );
      
      console.log('✅ PPPoE de cliente eliminado exitosamente:', response.data);
      return response;
      
    } catch(error) {
      console.error('❌ Error eliminando PPPoE de cliente:', error);
      throw this.handleMikrotikError ? this.handleMikrotikError(error) : error;	  
    }
  }
  
  // Obtener perfiles PPPoE disponibles
  async getPPPoEProfiles(deviceId) {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/pppoe-profiles`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting PPPoE profiles:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // Obtener IP Pools disponibles
  async getIPPools(deviceId) {
    try {
      return await axios.get(API_URL + `mikrotik/devices/${deviceId}/ip-pools`, {
        headers: authHeader()
      });
    } catch (error) {
      console.error('Error getting IP pools:', error);
      throw this.handleMikrotikError(error);
    }
  }
  
  // ===== SINCRONIZACIÓN DE PERFILES =====
async syncAllProfiles() {
  try {
    return await axios.post(API_URL + 'mikrotik/sync/pppoe-profiles', {}, {
      headers: authHeader()
    });
  } catch (error) {
    console.error('Error sincronizando todos los perfiles:', error);
    throw this.handleMikrotikError(error);
  }
}
  
  // ===== MANEJO DE ERRORES ESPECÍFICOS =====
  
  handleMikrotikError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Error desconocido';
      
      switch (status) {
        case 401:
          return new Error('Error de autenticación con el router Mikrotik. Verifique las credenciales.');
        case 404:
          return new Error('Router Mikrotik no encontrado o no accesible.');
        case 500:
          return new Error('Error interno en el router Mikrotik.');
        case 502:
        case 503:
          return new Error('Router Mikrotik no responde. Verifique la conexión de red.');
        default:
          return new Error(`Error ${status}: ${message}`);
      }
    } else if (error.request) {
      return new Error('No se puede conectar con el router Mikrotik. Verifique la red.');
    } else {
      return new Error('Error de configuración en la solicitud.');
    }
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