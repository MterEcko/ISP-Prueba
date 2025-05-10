import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class DeviceService {
  // Obtener dispositivos con filtros
  getDevices(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Añadir parámetros
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.type) queryParams.append('type', params.type);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.status) queryParams.append('status', params.status);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.search) queryParams.append('search', params.search);
    
    return axios.get(API_URL + 'devices?' + queryParams.toString(), {
      headers: authHeader()
    });
  }
  
  // Obtener un dispositivo por ID
  getDevice(id) {
    return axios.get(API_URL + 'devices/' + id, {
      headers: authHeader()
    });
  }
  
  // Crear un nuevo dispositivo
  createDevice(device) {
    return axios.post(API_URL + 'devices', device, {
      headers: authHeader()
    });
  }
  
  // Actualizar un dispositivo
  updateDevice(id, device) {
    return axios.put(API_URL + 'devices/' + id, device, {
      headers: authHeader()
    });
  }
  
  // Eliminar un dispositivo
  deleteDevice(id) {
    return axios.delete(API_URL + 'devices/' + id, {
      headers: authHeader()
    });
  }
  
  // Verificar estado de un dispositivo
  checkDeviceStatus(id) {
    return axios.get(API_URL + 'devices/' + id + '/status', {
      headers: authHeader()
    });
  }
  
  // Obtener métricas de un dispositivo
  getDeviceMetrics(id, period = '1h') {
    return axios.get(API_URL + 'devices/' + id + '/metrics?period=' + period, {
      headers: authHeader()
    });
  }
  
  // Ejecutar acción en un dispositivo
  executeDeviceAction(id, action) {
    return axios.post(API_URL + 'devices/' + id + '/actions', { action }, {
      headers: authHeader()
    });
  }
}

export default new DeviceService();