import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class CommandService {
  // ===============================
  // COMANDOS COMUNES
  // ===============================
  
  getAllCommands(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Parámetros de paginación
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    
    // Filtros
    if (params.category) queryParams.append('category', params.category);
    if (params.permissionLevel) queryParams.append('permissionLevel', params.permissionLevel);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.search) queryParams.append('search', params.search);

    return axios.get(API_URL + 'common-commands?' + queryParams.toString(), { headers: authHeader() });
  }

  getCommand(id) {
    return axios.get(API_URL + 'common-commands/' + id, { headers: authHeader() });
  }

  createCommand(command) {
    return axios.post(API_URL + 'common-commands', command, { headers: authHeader() });
  }

  updateCommand(id, command) {
    return axios.put(API_URL + 'common-commands/' + id, command, { headers: authHeader() });
  }

  deleteCommand(id) {
    return axios.delete(API_URL + 'common-commands/' + id, { headers: authHeader() });
  }

  toggleCommand(id) {
    // Si el backend no tiene un endpoint específico para toggle, usar PATCH
    return axios.patch(API_URL + 'common-commands/' + id + '/toggle', {}, { headers: authHeader() });
  }

  // ===============================
  // COMANDOS POR CATEGORÍA
  // ===============================

  getCommandsByCategory(category) {
    return axios.get(API_URL + 'common-commands/category/' + category, { headers: authHeader() });
  }

  // ===============================
  // IMPLEMENTACIONES DE COMANDOS
  // ===============================
  
  getAllImplementations(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.familyId) queryParams.append('familyId', params.familyId);
    if (params.commandId) queryParams.append('commandId', params.commandId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'command-implementations?' + queryParams.toString(), { headers: authHeader() });
  }

  getImplementation(id) {
    return axios.get(API_URL + 'command-implementations/' + id, { headers: authHeader() });
  }

  createImplementation(implementation) {
    return axios.post(API_URL + 'command-implementations', implementation, { headers: authHeader() });
  }

  updateImplementation(id, implementation) {
    return axios.put(API_URL + 'command-implementations/' + id, implementation, { headers: authHeader() });
  }

  deleteImplementation(id) {
    return axios.delete(API_URL + 'command-implementations/' + id, { headers: authHeader() });
  }

  toggleImplementation(id) {
    return axios.patch(API_URL + 'command-implementations/' + id + '/toggle', {}, { headers: authHeader() });
  }

  // ===============================
  // IMPLEMENTACIONES POR COMANDO
  // ===============================

  getCommandImplementations(commandId) {
    return axios.get(API_URL + 'common-commands/' + commandId + '/implementations', { headers: authHeader() });
  }

  getImplementationsByBrand(brandId) {
    return axios.get(API_URL + 'command-implementations/brand/' + brandId, { headers: authHeader() });
  }

  getImplementationsByFamily(familyId) {
    return axios.get(API_URL + 'command-implementations/family/' + familyId, { headers: authHeader() });
  }

  // ===============================
  // TESTING DE IMPLEMENTACIONES
  // ===============================

  testImplementation(implementationId, deviceId = null) {
    const data = { implementationId };
    if (deviceId) data.deviceId = deviceId;
    
    return axios.post(API_URL + 'command-implementations/' + implementationId + '/test', data, { headers: authHeader() });
  }

  getImplementationStats(implementationId) {
    return axios.get(API_URL + 'command-implementations/' + implementationId + '/stats', { headers: authHeader() });
  }

  // ===============================
  // PARÁMETROS DE COMANDOS
  // ===============================

  getImplementationParameters(implementationId) {
    return axios.get(API_URL + 'command-implementations/' + implementationId + '/parameters', { headers: authHeader() });
  }

  createParameter(implementationId, parameter) {
    return axios.post(API_URL + 'command-implementations/' + implementationId + '/parameters', parameter, { headers: authHeader() });
  }

  updateParameter(parameterId, parameter) {
    return axios.put(API_URL + 'command-parameters/' + parameterId, parameter, { headers: authHeader() });
  }

  deleteParameter(parameterId) {
    return axios.delete(API_URL + 'command-parameters/' + parameterId, { headers: authHeader() });
  }

  // ===============================
  // MARCAS Y FAMILIAS DE DISPOSITIVOS
  // ===============================

  getAllBrands(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'device-brands?' + queryParams.toString(), { headers: authHeader() });
  }

  getBrand(id) {
    return axios.get(API_URL + 'device-brands/' + id, { headers: authHeader() });
  }

  createBrand(brand) {
    return axios.post(API_URL + 'device-brands', brand, { headers: authHeader() });
  }

  updateBrand(id, brand) {
    return axios.put(API_URL + 'device-brands/' + id, brand, { headers: authHeader() });
  }

  toggleBrand(id) {
    return axios.patch(API_URL + 'device-brands/' + id + '/toggle', {}, { headers: authHeader() });
  }

  deleteBrand(id) {
    return axios.delete(API_URL + 'device-brands/' + id, { headers: authHeader() });
  }

  // Familias de dispositivos
  getAllFamilies(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'device-families?' + queryParams.toString(), { headers: authHeader() });
  }

  getFamiliesByBrand(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/families', { headers: authHeader() });
  }

  getFamily(id) {
    return axios.get(API_URL + 'device-families/' + id, { headers: authHeader() });
  }

  createFamily(family) {
    return axios.post(API_URL + 'device-families', family, { headers: authHeader() });
  }

  updateFamily(id, family) {
    return axios.put(API_URL + 'device-families/' + id, family, { headers: authHeader() });
  }

  toggleFamily(id) {
    return axios.patch(API_URL + 'device-families/' + id + '/toggle', {}, { headers: authHeader() });
  }

  deleteFamily(id) {
    return axios.delete(API_URL + 'device-families/' + id, { headers: authHeader() });
  }

  // ===============================
  // SNMP OIDS
  // ===============================

  getAllSnmpOids(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.familyId) queryParams.append('familyId', params.familyId);
    if (params.category) queryParams.append('category', params.category);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'snmp-oids?' + queryParams.toString(), { headers: authHeader() });
  }

  getSnmpOidsByBrand(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/snmp-oids', { headers: authHeader() });
  }

  getSnmpOidsByFamily(familyId) {
    return axios.get(API_URL + 'device-families/' + familyId + '/snmp-oids', { headers: authHeader() });
  }

  createSnmpOid(oid) {
    return axios.post(API_URL + 'snmp-oids', oid, { headers: authHeader() });
  }

  updateSnmpOid(id, oid) {
    return axios.put(API_URL + 'snmp-oids/' + id, oid, { headers: authHeader() });
  }

  deleteSnmpOid(id) {
    return axios.delete(API_URL + 'snmp-oids/' + id, { headers: authHeader() });
  }

  // ===============================
  // VERIFICACIONES Y UTILIDADES
  // ===============================

  checkImplementationAvailability(commandId, brandId, familyId = null) {
    let queryParams = new URLSearchParams();
    queryParams.append('commandId', commandId);
    queryParams.append('brandId', brandId);
    if (familyId) queryParams.append('familyId', familyId);

    return axios.get(API_URL + 'common-commands/' + commandId + '/check-implementation?' + queryParams.toString(), { headers: authHeader() });
  }

  getAvailableImplementationsForDevice(deviceId) {
    return axios.get(API_URL + 'devices/' + deviceId + '/available-implementations', { headers: authHeader() });
  }

  // ===============================
  // EJECUTAR COMANDOS EN DISPOSITIVOS
  // ===============================

  executeCommandOnDevice(deviceId, commandId, parameters = {}) {
    return axios.post(API_URL + 'devices/' + deviceId + '/execute-command', {
      commandId,
      parameters
    }, { headers: authHeader() });
  }

  executeImplementationOnDevice(deviceId, implementationId, parameters = {}) {
    return axios.post(API_URL + 'devices/' + deviceId + '/execute-implementation', {
      implementationId,
      parameters
    }, { headers: authHeader() });
  }

  // ===============================
  // ESTADÍSTICAS Y REPORTES
  // ===============================

  getCommandsStatistics() {
    return axios.get(API_URL + 'common-commands/statistics', { headers: authHeader() });
  }

  getImplementationsStatistics() {
    return axios.get(API_URL + 'command-implementations/statistics', { headers: authHeader() });
  }

  getBrandImplementationsCoverage(brandId) {
    return axios.get(API_URL + 'device-brands/' + brandId + '/implementation-coverage', { headers: authHeader() });
  }

  // ===============================
  // IMPORTAR/EXPORTAR
  // ===============================

  exportCommands(format = 'json') {
    return axios.get(API_URL + 'common-commands/export?format=' + format, {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  exportImplementations(format = 'json') {
    return axios.get(API_URL + 'command-implementations/export?format=' + format, {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  importCommands(file) {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(API_URL + 'common-commands/import', formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // ===============================
  // VALIDACIONES
  // ===============================

  validateCommandData(command) {
    const errors = [];
    
    if (!command.name) errors.push('El nombre es obligatorio');
    if (!command.displayName) errors.push('El nombre para mostrar es obligatorio');
    if (!command.description) errors.push('La descripción es obligatoria');
    if (!command.category) errors.push('La categoría es obligatoria');
    if (command.permissionLevel === null || command.permissionLevel === undefined) {
      errors.push('El nivel de permiso es obligatorio');
    }
    
    return errors;
  }

  validateImplementationData(implementation) {
    const errors = [];
    
    if (!implementation.commonCommandId) errors.push('El comando común es obligatorio');
    if (!implementation.brandId) errors.push('La marca es obligatoria');
    if (!implementation.connectionType) errors.push('El tipo de conexión es obligatorio');
    if (!implementation.implementation) errors.push('La implementación es obligatoria');
    
    return errors;
  }

  // ===============================
  // UTILIDADES
  // ===============================

  getCategoryDisplayName(category) {
    const names = {
      system: 'Sistema',
      network: 'Red',
      wireless: 'Inalámbrico',
      interface: 'Interfaces',
      monitoring: 'Monitoreo',
      backup: 'Respaldo',
      maintenance: 'Mantenimiento',
      security: 'Seguridad',
      configuration: 'Configuración',
      diagnostics: 'Diagnósticos'
    };
    return names[category] || category;
  }

  getPermissionLevelName(level) {
    const names = {
      1: 'Básico',
      2: 'Intermedio',
      3: 'Avanzado',
      4: 'Crítico',
      5: 'Administrador'
    };
    return names[level] || `Nivel ${level}`;
  }

  getConnectionTypeDisplayName(type) {
    const names = {
      ssh: 'SSH',
      snmp: 'SNMP',
      api: 'API',
      RouterOs: 'RouterOS API',
      unms_api: 'UNMS API',
      web: 'Web Interface',
      telnet: 'Telnet'
    };
    return names[type] || type?.toUpperCase();
  }

  // ===============================
  // HELPERS PARA FORMULARIOS
  // ===============================

  getAvailableCategories() {
    return [
      { value: 'system', label: 'Sistema' },
      { value: 'network', label: 'Red' },
      { value: 'wireless', label: 'Inalámbrico' },
      { value: 'interface', label: 'Interfaces' },
      { value: 'monitoring', label: 'Monitoreo' },
      { value: 'backup', label: 'Respaldo' },
      { value: 'maintenance', label: 'Mantenimiento' },
      { value: 'security', label: 'Seguridad' },
      { value: 'configuration', label: 'Configuración' },
      { value: 'diagnostics', label: 'Diagnósticos' }
    ];
  }

  getAvailablePermissionLevels() {
    return [
      { value: 1, label: 'Básico (1)' },
      { value: 2, label: 'Intermedio (2)' },
      { value: 3, label: 'Avanzado (3)' },
      { value: 4, label: 'Crítico (4)' },
      { value: 5, label: 'Administrador (5)' }
    ];
  }

  getAvailableConnectionTypes() {
    return [
      { value: 'ssh', label: 'SSH' },
      { value: 'snmp', label: 'SNMP' },
      { value: 'api', label: 'API Genérica' },
      { value: 'RouterOs', label: 'RouterOS API (Mikrotik)' },
      { value: 'unms_api', label: 'UNMS API (Ubiquiti)' },
      { value: 'web', label: 'Web Interface' },
      { value: 'telnet', label: 'Telnet' }
    ];
  }
}

export default new CommandService();