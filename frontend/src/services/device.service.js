import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class DeviceService {
  // ===============================
  // GESTIÓN DE DISPOSITIVOS
  // ===============================

  getAllDevices(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    if (params.type) queryParams.append('type', params.type);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.status) queryParams.append('status', params.status);
    if (params.name) queryParams.append('name', params.name);
    if (params.ipAddress) queryParams.append('ipAddress', params.ipAddress);
    if (params.macAddress) queryParams.append('macAddress', params.macAddress);
    if (params.serialNumber) queryParams.append('serialNumber', params.serialNumber);
    
    return axios.get(API_URL + 'devices?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }


  createDevice(device) {
    return axios.post(API_URL + 'devices', device, { headers: authHeader() });
  }

  testDeviceConnection(id, credentials = {}) {
    return axios.post(API_URL + 'devices/' + id + '/test-connection', credentials, { headers: authHeader() });
  }

  getDevice(id) {
    return axios.get(API_URL + 'devices/' + id, { headers: authHeader() });
  }

  updateDevice(id, device) {
    return axios.put(API_URL + 'devices/' + id, device, { headers: authHeader() });
  }

  deleteDevice(id) {
    return axios.delete(API_URL + 'devices/' + id, { headers: authHeader() });
  }

  // ===============================
  // MONITOREO Y MÉTRICAS
  // ===============================

  getDeviceStatus(id) {
    return axios.get(API_URL + 'devices/' + id + '/status', { headers: authHeader() });
  }

  getDeviceInfo(id) {
    return axios.get(API_URL + 'devices/' + id + '/info', { headers: authHeader() });
  }

  getDeviceMetrics(id, period = '24h') {
    return axios.get(API_URL + 'devices/' + id + '/metrics?period=' + period, { headers: authHeader() });
  }

  executeAction(id, action, parameters = {}) {
    return axios.post(API_URL + 'devices/' + id + '/actions', {
      action,
      parameters
    }, { headers: authHeader() });
  }



  // ===============================
  // COMANDOS Y EJECUCIÓN
  // ===============================

  getCommandHistory(deviceId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.limit) queryParams.append('limit', params.limit);

    return axios.get(API_URL + 'devices/' + deviceId + '/command-history?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceAvailableCommands(deviceId) {
    return axios.get(API_URL + 'devices/' + deviceId + '/available-commands', { headers: authHeader() });
  }

  executeDeviceCommand(deviceId, command, parameters = {}) {
    return axios.post(API_URL + 'devices/' + deviceId + '/execute-command', {
      command,
      parameters
    }, { headers: authHeader() });
  }

  // ===============================
  // DEVICE CREDENTIALS
  // ===============================

  createDeviceCredentials(deviceId, credentials) {
    return axios.post(API_URL + 'devices/' + deviceId + '/credentials', credentials, { headers: authHeader() });
  }

  getDeviceCredentials(deviceId) {
    return axios.get(API_URL + 'devices/' + deviceId + '/credentials', { headers: authHeader() });
  }

  updateDeviceCredentials(credentialId, credentials) {
    return axios.put(API_URL + 'device-credentials/' + credentialId, credentials, { headers: authHeader() });
  }

  rotateCredentials(credentialId, newCredentials) {
    return axios.post(API_URL + 'device-credentials/' + credentialId + '/rotate', newCredentials, { headers: authHeader() });
  }

  deleteDeviceCredentials(credentialId) {
    return axios.delete(API_URL + 'device-credentials/' + credentialId, { headers: authHeader() });
  }

  testCredentialConnection(credentials) {
    return axios.post(API_URL + 'device-credentials/test-connection', credentials, { headers: authHeader() });
  }

  // ===============================
  // DEVICE METRICS
  // ===============================

  getAllDeviceMetrics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.deviceId) queryParams.append('deviceId', params.deviceId);
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return axios.get(API_URL + 'device-metrics?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceMetricsById(deviceId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.period) queryParams.append('period', params.period);

    return axios.get(API_URL + 'devices/' + deviceId + '/metrics?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getMetricById(metricId) {
    return axios.get(API_URL + 'device-metrics/' + metricId, { headers: authHeader() });
  }

  createDeviceMetric(metric) {
    return axios.post(API_URL + 'device-metrics', metric, { headers: authHeader() });
  }

  deleteDeviceMetric(metricId) {
    return axios.delete(API_URL + 'device-metrics/' + metricId, { headers: authHeader() });
  }

  exportDeviceMetrics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.deviceId) queryParams.append('deviceId', params.deviceId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.format) queryParams.append('format', params.format);

    return axios.get(API_URL + 'device-metrics/export?' + queryParams.toString(), { 
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  // ===============================
  // DEVICE BRANDS
  // ===============================

  getAllDeviceBrands(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'device-brands?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceBrand(id) {
    return axios.get(API_URL + 'device-brands/' + id, { headers: authHeader() });
  }

  createDeviceBrand(brand) {
    return axios.post(API_URL + 'device-brands', brand, { headers: authHeader() });
  }

  updateDeviceBrand(id, brand) {
    return axios.put(API_URL + 'device-brands/' + id, brand, { headers: authHeader() });
  }

  toggleDeviceBrandActive(id) {
    return axios.patch(API_URL + 'device-brands/' + id + '/toggle', {}, { headers: authHeader() });
  }

  deleteDeviceBrand(id) {
    return axios.delete(API_URL + 'device-brands/' + id, { headers: authHeader() });
  }

  getBrandFamilies(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/families', { headers: authHeader() });
  }

  getBrandCommands(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/commands', { headers: authHeader() });
  }

  getBrandSnmpOids(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/snmp-oids', { headers: authHeader() });
  }

  // ===============================
  // DEVICE FAMILIES
  // ===============================

  getAllDeviceFamilies(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'device-families?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceFamiliesByBrand(brandId, params = {}) {
    let queryParams = new URLSearchParams();
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'device-brands/' + brandId + '/families?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceFamily(id) {
    return axios.get(API_URL + 'device-families/' + id, { headers: authHeader() });
  }

  createDeviceFamily(family) {
    return axios.post(API_URL + 'device-families', family, { headers: authHeader() });
  }

  updateDeviceFamily(id, family) {
    return axios.put(API_URL + 'device-families/' + id, family, { headers: authHeader() });
  }


  deleteDeviceFamily(id) {
    return axios.delete(API_URL + 'device-families/' + id, { headers: authHeader() });
  }

  toggleDeviceFamilyActive(id) {
    return axios.patch(API_URL + 'device-families/' + id + '/toggle', {}, { headers: authHeader() });
  }



  getFamilyCommandImplementations(familyId) {
    return axios.get(API_URL + 'device-families/' + familyId + '/command-implementations', { headers: authHeader() });
  }

  getFamilySnmpOids(familyId) {
    return axios.get(API_URL + 'device-families/' + familyId + '/snmp-oids', { headers: authHeader() });
  }

  getFamilyDevices(familyId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);

    return axios.get(API_URL + 'device-families/' + familyId + '/devices?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // ===============================
  // DEVICE COMMANDS
  // ===============================

  getDeviceCommands(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.deviceType) queryParams.append('deviceType', params.deviceType);

    return axios.get(API_URL + 'device-commands?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  createDeviceCommand(command) {
    return axios.post(API_URL + 'device-commands', command, { headers: authHeader() });
  }

  updateDeviceCommand(id, command) {
    return axios.put(API_URL + 'device-commands/' + id, command, { headers: authHeader() });
  }

  deactivateDeviceCommand(id) {
    return axios.patch(API_URL + 'device-commands/' + id + '/deactivate', {}, { headers: authHeader() });
  }


  // ===============================
  // SNMPOID
  // ===============================

  getAllSNMPOids() {
    return axios.get(API_URL + 'snmp-oids/', { headers: authHeader() });
  }

  createSNMPOid() {
    return axios.post(API_URL + 'snmp-oids/', { headers: authHeader() });
  }

  getSNMPOidsbyId(id) {
    return axios.get(API_URL + 'snmp-oids/' + id , { headers: authHeader() });
  }

  updateSNMPOid(id) {
    return axios.put(API_URL + 'snmp-oids/' + id , { headers: authHeader() });
  }

  deleteSNMPOid(id) {
    return axios.delete(API_URL + 'snmp-oids/' + id , { headers: authHeader() });
  }

  getSNMPOidsbyBrand(brandId) {
    return axios.get(API_URL + 'brands/' + brandId + '/snmp-oids' , { headers: authHeader() });
  }

  getSNMPOidsbyFamily(familyId) {
    return axios.get(API_URL + 'families/' + familyId + '/snmp-oids' , { headers: authHeader() });
  }


  // ===============================
  // BÚSQUEDA Y ESTADÍSTICAS
  // ===============================

  searchDevices(searchParams = {}) {
    let queryParams = new URLSearchParams();
    
    if (searchParams.globalSearch) queryParams.append('globalSearch', searchParams.globalSearch);
    if (searchParams.type) queryParams.append('type', searchParams.type);
    if (searchParams.brand) queryParams.append('brand', searchParams.brand);
    if (searchParams.status) queryParams.append('status', searchParams.status);
    if (searchParams.nodeId) queryParams.append('nodeId', searchParams.nodeId);
    if (searchParams.sectorId) queryParams.append('sectorId', searchParams.sectorId);
    if (searchParams.page) queryParams.append('page', searchParams.page);
    if (searchParams.size) queryParams.append('size', searchParams.size);

    return axios.get(API_URL + 'devices/search?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  getDeviceStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    if (params.period) queryParams.append('period', params.period);

    return axios.get(API_URL + 'devices/statistics?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // ===============================
  // FUNCIONES DE COMPATIBILIDAD (LEGACY)
  // ===============================

  // Mantener compatibilidad con versiones anteriores
  changeDeviceStatus(id, status) {
    return this.executeAction(id, 'changeStatus', { status });
  }

  getClientDevices(clientId) {
    return this.getAllDevices({ clientId });
  }

  assignDeviceToClient(deviceId, clientId) {
    return this.updateDevice(deviceId, { clientId });
  }

  unassignDeviceFromClient(deviceId) {
    return this.updateDevice(deviceId, { clientId: null });
  }

  pingDevice(id) {
    return this.executeAction(id, 'ping');
  }

  rebootDevice(id) {
    return this.executeAction(id, 'restart');
  }

  getDeviceConfiguration(id) {
    return this.getDeviceInfo(id);
  }

  updateDeviceConfiguration(id, configuration) {
    return this.updateDevice(id, { specificConfig: configuration });
  }



  // ===============================
  // UTILIDADES Y VALIDACIONES
  // ===============================

  validateDeviceData(deviceData) {
    const errors = [];

    if (!deviceData.name?.trim()) {
      errors.push('El nombre del dispositivo es requerido');
    }

    if (!deviceData.type) {
      errors.push('El tipo de dispositivo es requerido');
    }

    if (!deviceData.brand) {
      errors.push('La marca del dispositivo es requerida');
    }

    if (!deviceData.ipAddress) {
      errors.push('La dirección IP es requerida');
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(deviceData.ipAddress)) {
      errors.push('La dirección IP no tiene un formato válido');
    }

    if (deviceData.macAddress && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(deviceData.macAddress)) {
      errors.push('La dirección MAC no tiene un formato válido');
    }

    return errors;
  }

  formatDeviceType(type) {
    const typeMap = {
      'router': 'Router',
      'switch': 'Switch',
      'antenna': 'Antena',
      'cpe': 'CPE',
      'sector': 'Sector',
      'fiberOnt': 'ONT',
      'fiberOlt': 'OLT',
      'other': 'Otro'
    };

    return typeMap[type] || type;
  }

  formatDeviceStatus(status) {
    const statusMap = {
      'online': { label: 'En Línea', class: 'status-online', color: '#4CAF50' },
      'offline': { label: 'Desconectado', class: 'status-offline', color: '#F44336' },
      'maintenance': { label: 'Mantenimiento', class: 'status-maintenance', color: '#2196F3' },
      'unknown': { label: 'Desconocido', class: 'status-unknown', color: '#757575' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  formatDeviceBrand(brand) {
    const brandMap = {
      'mikrotik': 'Mikrotik',
      'ubiquiti': 'Ubiquiti',
      'cambium': 'Cambium',
      'tplink': 'TP-Link',
      'mimosa': 'Mimosa',
      'huawei': 'Huawei',
      'zte': 'ZTE',
      'other': 'Otra'
    };

    return brandMap[brand] || brand;
  }

  getDeviceTypeOptions() {
    return [
      { value: 'router', label: 'Router' },
      { value: 'switch', label: 'Switch' },
      { value: 'antenna', label: 'Antena' },
      { value: 'cpe', label: 'CPE' },
      { value: 'sector', label: 'Sector' },
      { value: 'fiberOnt', label: 'ONT' },
      { value: 'fiberOlt', label: 'OLT' },
      { value: 'other', label: 'Otro' }
    ];
  }

  getDeviceBrandOptions() {
    return [
      { value: 'mikrotik', label: 'Mikrotik' },
      { value: 'ubiquiti', label: 'Ubiquiti' },
      { value: 'cambium', label: 'Cambium' },
      { value: 'tplink', label: 'TP-Link' },
      { value: 'mimosa', label: 'Mimosa' },
      { value: 'huawei', label: 'Huawei' },
      { value: 'zte', label: 'ZTE' },
      { value: 'other', label: 'Otra' }
    ];
  }

  getDeviceStatusOptions() {
    return [
      { value: 'online', label: 'En Línea' },
      { value: 'offline', label: 'Desconectado' },
      { value: 'maintenance', label: 'Mantenimiento' },
      { value: 'unknown', label: 'Desconocido' }
    ];
  }
}

export default new DeviceService();