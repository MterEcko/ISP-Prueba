import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class ServicePackageService {
  // ===============================
  // GESTIÓN DE PAQUETES DE SERVICIO
  // ===============================

  // Obtener todos los paquetes de servicio
  getAllServicePackages(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    console.log('🔄 Obteniendo paquetes con params:', params);
    
    return axios.get(`${API_URL}service-packages?${queryParams.toString()}`, {
      headers: authHeader()
    }).then(response => {
      console.log('✅ Respuesta de paquetes:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Error obteniendo paquetes:', error);
      throw error;
    });
  }


  // Obtener paquete por ID
  getServicePackage(id) {
    console.log('🔄 Solicitando paquete por ID:', id);

    return axios.get(`${API_URL}service-packages/${id}`, {
      headers: authHeader()
    }).then(response => {
      console.log('✅ Respuesta de getServicePackage:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Error en getServicePackage:', error);
      throw error;
    });
  }

  // Crear nuevo paquete de servicio
  createServicePackage(packageData) {
    const normalizedData = this.normalizePackageData(packageData);
    console.log('🔄 Creando paquete con datos:', normalizedData);

    return axios.post(`${API_URL}service-packages`, normalizedData, {
      headers: authHeader()
    });
  }

  // Actualizar paquete de servicio
  updateServicePackage(id, packageData) {
    const normalizedData = this.normalizePackageData(packageData);
    console.log('🔄 Actualizando paquete ID:', id);

    return axios.put(`${API_URL}service-packages/${id}`, normalizedData, {
      headers: authHeader()
    });
  }

  // Eliminar paquete de servicio
  deleteServicePackage(id) {
    return axios.delete(`${API_URL}service-packages/${id}`, {
      headers: authHeader()
    });
  }
  
    validatePackageInZone(packageId, zoneId) {
    return axios.get(`${API_URL}service-packages/${packageId}/validate-zone/${zoneId}`, {
      headers: authHeader()
    });
  }

  validatePackageInNode(packageId, nodeId) {
    return axios.get(`${API_URL}service-packages/${packageId}/validate-node/${nodeId}`, {
      headers: authHeader()
    });
  }

  // ===============================
  // GESTIÓN DE PERFILES MIKROTIK
  // ===============================

  // Obtener perfiles Mikrotik de un paquete
  getPackageProfiles(packageId) {
    console.log('🔄 Obteniendo perfiles del paquete ID:', packageId);

    return axios.get(`${API_URL}service-packages/${packageId}/profiles`, {
      headers: authHeader()
    }).then(response => {
      console.log('✅ Perfiles del paquete:', response.data);
      return response;
    });
  }




updatePackageProfile(packageId, mikrotikRouterId, profileUpdates) {
  console.log('🔄 Actualizando perfil específico:', { packageId, mikrotikRouterId, profileUpdates });
  
  return axios.put(`${API_URL}service-packages/${packageId}/profiles/${mikrotikRouterId}`, {
    profileUpdates: profileUpdates  // ✅ IMPORTANTE: Envolver en objeto como espera el backend
  }, {
    headers: authHeader()
  });
}

// ✅ CORREGIR: El método createPackageProfiles debe enviar la estructura correcta
createPackageProfiles(packageId, profileConfiguration = []) {
  console.log('🔄 Creando perfiles para paquete ID:', packageId);
  console.log('📋 Configuración:', profileConfiguration);

  return axios.post(`${API_URL}service-packages/${packageId}/profiles`, {
    profileConfigurations: profileConfiguration  // ✅ ESTRUCTURA CORRECTA
  }, {
    headers: authHeader()
  });
}

  // Sincronizar paquete con routers Mikrotik
  syncPackageWithRouters(packageId) {
    return axios.post(`${API_URL}service-packages/${packageId}/sync`, {}, {
      headers: authHeader()
    });
  }

  // ===============================
  // ESTADÍSTICAS Y REPORTES
  // ===============================

  // Obtener estadísticas generales de paquetes
  getPackageStatistics() {
    console.log('🔄 Obteniendo estadísticas de paquetes');

    return axios.get(`${API_URL}service-packages/statistics`, {
      headers: authHeader()
    }).then(response => {
      console.log('✅ Estadísticas:', response.data);
      return response;
    });
  }

  // Obtener clientes que usan un paquete
  getPackageClients(packageId) {
    return axios.get(`${API_URL}service-packages/${packageId}/clients`, {
      headers: authHeader()
    });
  }

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  // Normalizar datos del paquete
  normalizePackageData(packageData) {
    return {
      name: packageData.name,
      description: packageData.description || '',
      price: parseFloat(packageData.price || 0),
      downloadSpeedMbps: parseInt(packageData.downloadSpeedMbps || 0),
      uploadSpeedMbps: parseInt(packageData.uploadSpeedMbps || 0),
      dataLimitGb: packageData.dataLimitGb ? parseInt(packageData.dataLimitGb) : null,
      billingCycle: packageData.billingCycle || 'monthly',
      hasJellyfin: Boolean(packageData.hasJellyfin),
      active: packageData.active !== undefined ? Boolean(packageData.active) : true,
      zoneId: packageData.zoneId || null,
      profileConfigurations: packageData.profileConfigurations || undefined
    };
  }
}

export default new ServicePackageService();