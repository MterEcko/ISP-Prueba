import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class TpLinkService {
  // === Dispositivos Pharos ===
  
  // Obtener todos los dispositivos Pharos
  getAllPharosDevices(params = {}) {
    let queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.name) queryParams.append('name', params.name);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    if (params.status) queryParams.append('status', params.status);
    
    return axios.get(API_URL + 'tplink/pharos?' + queryParams.toString(), { headers: authHeader() });
  }
  
  // Obtener un dispositivo Pharos por ID
  getPharosDevice(id) {
    return axios.get(API_URL + 'tplink/pharos/' + id, { headers: authHeader() });
  }
  
  // Crear un nuevo dispositivo Pharos
  createPharosDevice(device) {
    return axios.post(API_URL + 'tplink/pharos', device, { headers: authHeader() });
  }
  
  // Actualizar un dispositivo Pharos
  updatePharosDevice(id, device) {
    return axios.put(API_URL + 'tplink/pharos/' + id, device, { headers: authHeader() });
  }
  
  // Eliminar un dispositivo Pharos
  deletePharosDevice(id) {
    return axios.delete(API_URL + 'tplink/pharos/' + id, { headers: authHeader() });
  }
  
  // Cambiar estado de un dispositivo Pharos
  changePharosDeviceStatus(id, active) {
    return axios.patch(API_URL + 'tplink/pharos/' + id + '/status', { active }, { headers: authHeader() });
  }
  
  // Obtener información del dispositivo Pharos
  getPharosDeviceInfo(id) {
    return axios.get(API_URL + 'tplink/pharos/' + id + '/info', { headers: authHeader() });
  }
  
  // Obtener clientes conectados a un dispositivo Pharos
  getPharosConnectedClients(id) {
    return axios.get(API_URL + 'tplink/pharos/' + id + '/clients', { headers: authHeader() });
  }
  
  // Obtener estadísticas de tráfico de un dispositivo Pharos
  getPharosTrafficStats(id) {
    return axios.get(API_URL + 'tplink/pharos/' + id + '/traffic', { headers: authHeader() });
  }
  
  // Reiniciar un dispositivo Pharos
  rebootPharosDevice(id) {
    return axios.post(API_URL + 'tplink/pharos/' + id + '/reboot', {}, { headers: authHeader() });
  }
  
  // Configurar QoS para un cliente en dispositivo Pharos
  configurePharosClientQoS(id, macAddress, downloadSpeed, uploadSpeed) {
    return axios.post(
      API_URL + 'tplink/pharos/' + id + '/qos', 
      { macAddress, download: downloadSpeed, upload: uploadSpeed }, 
      { headers: authHeader() }
    );
  }
  
  // === Controladores Omada ===
  
  // Obtener todos los controladores Omada
  getAllOmadaControllers(params = {}) {
    let queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.name) queryParams.append('name', params.name);
    if (params.active !== undefined) queryParams.append('active', params.active);
    
    return axios.get(API_URL + 'tplink/omada/controllers?' + queryParams.toString(), { headers: authHeader() });
  }
  
  // Obtener un controlador Omada por ID
  getOmadaController(id) {
    return axios.get(API_URL + 'tplink/omada/controllers/' + id, { headers: authHeader() });
  }
  
  // Crear un nuevo controlador Omada
  createOmadaController(controller) {
    return axios.post(API_URL + 'tplink/omada/controllers', controller, { headers: authHeader() });
  }
  
  // Actualizar un controlador Omada
  updateOmadaController(id, controller) {
    return axios.put(API_URL + 'tplink/omada/controllers/' + id, controller, { headers: authHeader() });
  }
  
  // Eliminar un controlador Omada
  deleteOmadaController(id) {
    return axios.delete(API_URL + 'tplink/omada/controllers/' + id, { headers: authHeader() });
  }
  
  // Cambiar estado de un controlador Omada
  changeOmadaControllerStatus(id, active) {
    return axios.patch(
      API_URL + 'tplink/omada/controllers/' + id + '/status', 
      { active }, 
      { headers: authHeader() }
    );
  }
  
  // Obtener sitios de un controlador Omada
  getOmadaSites(id) {
    return axios.get(API_URL + 'tplink/omada/controllers/' + id + '/sites', { headers: authHeader() });
  }
  
  // Obtener dispositivos de un sitio Omada
  getOmadaDevices(id, siteId) {
    return axios.get(
      API_URL + 'tplink/omada/controllers/' + id + '/sites/' + siteId + '/devices', 
      { headers: authHeader() }
    );
  }
  
  // Obtener clientes de un sitio Omada
  getOmadaClients(id, siteId) {
    return axios.get(
      API_URL + 'tplink/omada/controllers/' + id + '/sites/' + siteId + '/clients', 
      { headers: authHeader() }
    );
  }
  
  // Obtener información de un cliente específico en Omada
  getOmadaClientInfo(id, siteId, clientMac) {
    return axios.get(
      API_URL + 'tplink/omada/controllers/' + id + '/sites/' + siteId + '/clients/' + clientMac, 
      { headers: authHeader() }
    );
  }
  
  // Configurar límite de tráfico para un cliente en Omada
  configureOmadaTrafficLimit(id, siteId, clientMac, downloadSpeed, uploadSpeed) {
    return axios.post(
      API_URL + 'tplink/omada/controllers/' + id + '/sites/' + siteId + '/clients/' + clientMac + '/traffic-limit', 
      { download: downloadSpeed, upload: uploadSpeed }, 
      { headers: authHeader() }
    );
  }
  
  // Sincronizar dispositivos desde un controlador Omada
  syncOmadaDevices(id) {
    return axios.post(
      API_URL + 'tplink/omada/controllers/' + id + '/sync', 
      {}, 
      { headers: authHeader() }
    );
  }
  
  // === Redes de clientes con TP-Link ===
  
  // Asociar red de cliente con dispositivo TP-Link
  associateClientNetworkWithTpLink(clientNetworkId, deviceId) {
    return axios.post(
      API_URL + 'client-networks/' + clientNetworkId + '/tplink', 
      { deviceId }, 
      { headers: authHeader() }
    );
  }
  
  // Aplicar configuración de velocidad al dispositivo TP-Link
  applyTpLinkSpeedConfig(clientNetworkId) {
    return axios.post(
      API_URL + 'client-networks/' + clientNetworkId + '/tplink/apply-speed', 
      {}, 
      { headers: authHeader() }
    );
  }
  
  // Actualizar estado de conexión con TP-Link
  updateTpLinkConnectionStatus(clientNetworkId) {
    return axios.get(
      API_URL + 'client-networks/' + clientNetworkId + '/tplink/status', 
      { headers: authHeader() }
    );
  }
  
  // === Dashboard y Estadísticas ===
  
  // Obtener datos para el dashboard
  getDashboardData() {
    return axios.get(API_URL + 'tplink/dashboard', { headers: authHeader() });
  }
  
  // Obtener todos los dispositivos TP-Link (Pharos y Omada)
  getAllDevices() {
    return axios.get(API_URL + 'tplink/devices', { headers: authHeader() });
  }
  
  // Obtener estadísticas generales
  getStats() {
    return axios.get(API_URL + 'tplink/stats', { headers: authHeader() });
  }
}

export default new TpLinkService();