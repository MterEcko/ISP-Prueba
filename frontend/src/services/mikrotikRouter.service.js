import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class MikrotikRouterService {
  // Obtener todos los routers Mikrotik
  getAllMikrotikRouters(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(`${API_URL}mikrotik-routers?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  // Obtener router por ID
  getMikrotikRouter(id) {
    return axios.get(`${API_URL}mikrotik-routers/${id}`, {
      headers: authHeader()
    });
  }

  // Crear nuevo router
  createMikrotikRouter(routerData) {
    return axios.post(`${API_URL}mikrotik-routers`, routerData, {
      headers: authHeader()
    });
  }

  // Actualizar router
  updateMikrotikRouter(id, routerData) {
    return axios.put(`${API_URL}mikrotik-routers/${id}`, routerData, {
      headers: authHeader()
    });
  }

  // Eliminar router
  deleteMikrotikRouter(id) {
    return axios.delete(`${API_URL}mikrotik-routers/${id}`, {
      headers: authHeader()
    });
  }

  // Probar conexión
  testConnection(routerData) {
    return axios.post(`${API_URL}mikrotik-routers/test-connection`, routerData, {
      headers: authHeader()
    });
  }

  // Obtener información del dispositivo
  getDeviceInfo(id) {
    return axios.get(`${API_URL}mikrotik-routers/${id}/device-info`, {
      headers: authHeader()
    });
  }

  // Obtener estadísticas de tráfico
  getTrafficStatistics(routerId, interfaceName = null) {
    const url = interfaceName 
      ? `mikrotik-routers/${routerId}/traffic?interfaceName=${interfaceName}`
      : `mikrotik-routers/${routerId}/traffic`;
      
    return axios.get(API_URL + url, {
      headers: authHeader()
    });
  }

  // Obtener pools IP de un router
  getRouterPools(routerId) {
    return axios.get(`${API_URL}mikrotik-routers/${routerId}/pools`, {
      headers: authHeader()
    });
  }

  // Obtener usuarios PPPoE
  getPPPoEUsers(routerId) {
    return axios.get(`${API_URL}mikrotik-routers/${routerId}/pppoe-users`, {
      headers: authHeader()
    });
  }

  // Obtener sesiones activas
  getActiveSessions(routerId) {
    return axios.get(`${API_URL}mikrotik-routers/${routerId}/active-sessions`, {
      headers: authHeader()
    });
  }

  // Sincronizar pools
  syncPools(routerId) {
    return axios.post(`${API_URL}mikrotik-routers/${routerId}/sync-pools`, {}, {
      headers: authHeader()
    });
  }

  // Obtener métricas del router
  getRouterMetrics(routerId) {
    return axios.get(`${API_URL}mikrotik-routers/${routerId}/metrics`, {
      headers: authHeader()
    });
  }

  // Validar datos del router
  validateRouterData(routerData) {
    const errors = [];
    
    if (!routerData.name) {
      errors.push('El nombre del router es obligatorio');
    }
    
    if (!routerData.ipAddress) {
      errors.push('La dirección IP es obligatoria');
    } else if (!this.isValidIP(routerData.ipAddress)) {
      errors.push('La dirección IP no es válida');
    }
    
    if (!routerData.username) {
      errors.push('El nombre de usuario es obligatorio');
    }
    
    if (!routerData.password) {
      errors.push('La contraseña es obligatoria');
    }
    
    if (routerData.apiPort && !this.isValidPort(routerData.apiPort)) {
      errors.push('El puerto API no es válido');
    }
    
    return errors;
  }

  // Validar IP
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  // Validar puerto
  isValidPort(port) {
    const portNumber = parseInt(port);
    return !isNaN(portNumber) && portNumber >= 1 && portNumber <= 65535;
  }

  // Formatear nombre para mostrar
  getRouterDisplayName(routerName, nodeName) {
    if (nodeName) {
      return `${routerName} (${nodeName})`;
    }
    return routerName;
  }

  // Obtener color de estado
  getStatusColor(status) {
    switch (status) {
      case 'online':
        return '#27ae60';
      case 'offline':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  }

  // Obtener sugerencias de nombres
  getRouterNameSuggestions(nodeName) {
    if (!nodeName) {
      return [
        'Router_Principal',
        'Mikrotik_01',
        'RB_Central',
        'CCR_Main',
        'hEX_Gateway'
      ];
    }
    
    const suggestions = [
      `Router_${nodeName}`,
      `MT_${nodeName}`,
      `Principal_${nodeName}`,
      `Torre_${nodeName}`,
      `Mikrotik_${nodeName}`,
      `RB_${nodeName}`,
      `CCR_${nodeName}`,
      `hEX_${nodeName}`
    ];
    
    return suggestions;
  }
}

export default new MikrotikRouterService();