// frontend/src/services/ipPool.service.js
import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class IpPoolService {
  // Obtener todos los IP pools
  getAllIpPools(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.mikrotikRouterId) queryParams.append('mikrotikRouterId', params.mikrotikRouterId);
    if (params.poolType) queryParams.append('poolType', params.poolType);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'ip-pools?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // Obtener IP pool por ID
  getIpPoolById(id) {
    return axios.get(API_URL + 'ip-pools/' + id, { 
      headers: authHeader() 
    });
  }

  // Crear un nuevo IP pool
  createIpPool(poolData) {
    return axios.post(API_URL + 'ip-pools', poolData, { 
      headers: authHeader() 
    });
  }

  // Actualizar un IP pool (incluyendo renombrar)
  updateIpPool(id, poolData) {
    return axios.put(API_URL + 'ip-pools/' + id, poolData, { 
      headers: authHeader() 
    });
  }

  // Eliminar un IP pool
  deleteIpPool(id) {
    return axios.delete(API_URL + 'ip-pools/' + id, { 
      headers: authHeader() 
    });
  }

  // Obtener pools por router Mikrotik
  getPoolsByMikrotikRouter(mikrotikRouterId) {
    return axios.get(API_URL + 'ip-pools/mikrotik/' + mikrotikRouterId, { 
      headers: authHeader() 
    });
  }

  // Obtener pools por tipo (active, suspended, cutService)
  getPoolsByType(poolType) {
    return axios.get(API_URL + 'ip-pools/type/' + poolType, { 
      headers: authHeader() 
    });
  }

  // Sincronizar pools desde un router Mikrotik
  syncPoolsFromMikrotik(mikrotikRouterId) {
    return axios.post(
      API_URL + 'ip-pools/sync-from-mikrotik/' + mikrotikRouterId, 
      {}, 
      { headers: authHeader() }
    );
  }

  // Sincronizar un pool específico con el router
  syncPoolWithRouter(poolId) {
    return axios.post(
      API_URL + 'ip-pools/' + poolId + '/sync', 
      {}, 
      { headers: authHeader() }
    );
  }

  // Obtener IPs disponibles en un pool
  getPoolAvailableIPs(poolId) {
    return axios.get(API_URL + 'ip-pools/' + poolId + '/available-ips', { 
      headers: authHeader() 
    });
  }

  // Obtener clientes en un pool
  getPoolClients(poolId) {
    return axios.get(API_URL + 'ip-pools/' + poolId + '/clients', { 
      headers: authHeader() 
    });
  }

  // Renombrar un pool (función específica para cambiar nombres)
  renamePool(poolId, newName, newType = null) {
    const updateData = {
      poolName: newName
    };
    
    if (newType) {
      updateData.poolType = newType;
    }
    
    return axios.put(API_URL + 'ip-pools/' + poolId, updateData, { 
      headers: authHeader() 
    });
  }

  // Cambiar tipo de pool (active, suspended, cutService)
  changePoolType(poolId, newType) {
    return axios.put(API_URL + 'ip-pools/' + poolId, {
      poolType: newType
    }, { 
      headers: authHeader() 
    });
  }

  // Activar/desactivar un pool
  togglePoolStatus(poolId, active) {
    return axios.put(API_URL + 'ip-pools/' + poolId, {
      active: active
    }, { 
      headers: authHeader() 
    });
  }

  // Obtener estadísticas de pools por router
  getPoolStatistics(mikrotikRouterId = null) {
    const url = mikrotikRouterId 
      ? API_URL + 'ip-pools/statistics/' + mikrotikRouterId
      : API_URL + 'ip-pools/statistics';
      
    return axios.get(url, { 
      headers: authHeader() 
    });
  }

  // Función auxiliar para formatear datos de pool
  formatPoolData(poolData) {
    return {
      id: poolData.id,
      name: poolData.poolName,
      displayName: this.getPoolDisplayName(poolData.poolName, poolData.poolType),
      type: poolData.poolType,
      typeLabel: this.getPoolTypeLabel(poolData.poolType),
      network: poolData.networkAddress,
      range: `${poolData.startIp} - ${poolData.endIp}`,
      gateway: poolData.gateway,
      dns: `${poolData.dnsPrimary}, ${poolData.dnsSecondary}`,
      router: poolData.MikrotikRouter?.name || 'N/A',
      routerId: poolData.mikrotikRouterId,
      active: poolData.active,
      lastSync: poolData.lastSyncWithMikrotik,
      originalName: poolData.mikrotikPoolName // Nombre original en Mikrotik
    };
  }

  // Obtener nombre amigable para mostrar
  // eslint-disable-next-line no-unused-vars
  getPoolDisplayName(poolName, poolType) {
    // Si el nombre ya fue personalizado, usarlo
    const customNames = {
      'PPPOE_POOL': 'Clientes PPPoE',
      'DHCPPlatanar417': 'DHCP Platanar',
      'REPETIDORES': 'Repetidores',
      'morosos': 'Clientes Morosos',
      'suspendidos': 'Clientes Suspendidos',
      'cortados': 'Servicio Cortado'
    };

    return customNames[poolName] || poolName;
  }

  // Obtener etiqueta del tipo de pool
  getPoolTypeLabel(poolType) {
    const typeLabels = {
      'active': 'Activos',
      'suspended': 'Suspendidos', 
      'cutService': 'Cortados'
    };

    return typeLabels[poolType] || poolType;
  }

  // Obtener color para el tipo de pool (para UI)
  getPoolTypeColor(poolType) {
    const typeColors = {
      'active': '#4CAF50',      // Verde
      'suspended': '#FF9800',   // Naranja
      'cutService': '#F44336'   // Rojo
    };

    return typeColors[poolType] || '#9E9E9E';
  }

  // Validar datos de pool antes de enviar
  validatePoolData(poolData) {
    const errors = [];

    if (!poolData.poolName?.trim()) {
      errors.push('El nombre del pool es requerido');
    }

    if (!poolData.networkAddress?.trim()) {
      errors.push('La dirección de red es requerida');
    }

    if (!poolData.startIp?.trim()) {
      errors.push('La IP inicial es requerida');
    }

    if (!poolData.endIp?.trim()) {
      errors.push('La IP final es requerida');
    }

    if (!poolData.mikrotikRouterId) {
      errors.push('El router Mikrotik es requerido');
    }

    // Validar formato IP básico
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (poolData.startIp && !ipRegex.test(poolData.startIp)) {
      errors.push('Formato de IP inicial inválido');
    }

    if (poolData.endIp && !ipRegex.test(poolData.endIp)) {
      errors.push('Formato de IP final inválido');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Función para obtener sugerencias de nombres según el tipo
  getPoolNameSuggestions(poolType) {
    const suggestions = {
      'active': [
        'clientesActivos',
        'usuarios',
        'servicioNormal',
        'planBasico',
        'planPremium'
      ],
      'suspended': [
        'suspendidos',
        'morosos',
        'pagosPendientes',
        'revision',
        'temporal'
      ],
      'cutService': [
        'cortados',
        'noServicio',
        'cancelados',
        'deudores',
        'bloqueados'
      ]
    };

    return suggestions[poolType] || [];
  }
}

export default new IpPoolService();