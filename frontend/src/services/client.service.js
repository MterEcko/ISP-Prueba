import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class ClientService {
  getAllClients(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Parámetros de paginación
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    
    // Parámetros de ordenamiento
    if (params.sortField) queryParams.append('sortField', params.sortField);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    
    // Búsqueda global
    if (params.globalSearch) queryParams.append('globalSearch', params.globalSearch);
    
    // Filtros jerárquicos
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    
    // Filtros de estado
    if (params.status) queryParams.append('status', params.status);
    if (params.active !== undefined) queryParams.append('active', params.active);
    
    // Filtros por columna específica
    if (params.name) queryParams.append('name', params.name);
    if (params.address) queryParams.append('address', params.address);
    if (params.contact) queryParams.append('contact', params.contact);
    if (params.email) queryParams.append('email', params.email);
    if (params.phone) queryParams.append('phone', params.phone);
    if (params.billingDay) queryParams.append('billingDay', params.billingDay);
    
    // Filtros de servicios
    if (params.servicePackageId) queryParams.append('servicePackageId', params.servicePackageId);
    if (params.ipAddress) queryParams.append('ipAddress', params.ipAddress);

    return axios.get(API_URL + 'clients?' + queryParams.toString(), { headers: authHeader() });
  }

  getClient(id) {
    return axios.get(API_URL + 'clients/' + id, { headers: authHeader() });
  }

  createClient(client) {
    return axios.post(API_URL + 'clients', client, { headers: authHeader() });
  }

  updateClient(id, client) {
    return axios.put(API_URL + 'clients/' + id, client, { headers: authHeader() });
  }

  changeClientStatus(id, active) {
    return axios.patch(API_URL + 'clients/' + id + '/status', { active }, { headers: authHeader() });
  }

  deleteClient(id) {
    return axios.delete(API_URL + 'clients/' + id, { headers: authHeader() });
  }

  // =====================================
  // NUEVOS MÉTODOS PARA ACCIONES MASIVAS
  // =====================================

  bulkUpdateStatus(clientIds, status) {
    return axios.post(API_URL + 'clients/bulk/status', {
      clientIds,
      status
    }, { headers: authHeader() });
  }

  bulkSendEmail(clientIds, emailData) {
    return axios.post(API_URL + 'clients/bulk/email', {
      clientIds,
      subject: emailData.subject,
      message: emailData.message,
      templateId: emailData.templateId
    }, { headers: authHeader() });
  }

  bulkSendWhatsApp(clientIds, messageData) {
    return axios.post(API_URL + 'clients/bulk/whatsapp', {
      clientIds,
      message: messageData.message,
      templateId: messageData.templateId
    }, { headers: authHeader() });
  }

  bulkSuspendServices(clientIds, reason = 'Suspensión administrativa') {
    return axios.post(API_URL + 'clients/bulk/suspend-services', {
      clientIds,
      reason
    }, { headers: authHeader() });
  }

  bulkReactivateServices(clientIds) {
    return axios.post(API_URL + 'clients/bulk/reactivate-services', {
      clientIds
    }, { headers: authHeader() });
  }

  // =====================================
  // MÉTODOS PARA OBTENER DATOS AUXILIARES
  // =====================================

  getZones() {
    return axios.get(API_URL + 'zones', { headers: authHeader() });
  }

  getNodes(zoneId = null) {
    const params = zoneId ? `?zoneId=${zoneId}` : '';
    return axios.get(API_URL + 'nodes' + params, { headers: authHeader() });
  }

  getSectors(nodeId = null) {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    return axios.get(API_URL + 'sectors' + params, { headers: authHeader() });
  }

  getServicePackages() {
    return axios.get(API_URL + 'service-packages', { headers: authHeader() });
  }

  // Estadísticas de clientes
  getClientStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);
    if (params.period) queryParams.append('period', params.period);

    return axios.get(API_URL + 'clients/statistics?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // Verificar duplicados
  checkDuplicateClient(params) {
    let queryParams = new URLSearchParams();
    
    if (params.email) queryParams.append('email', params.email);
    if (params.phone) queryParams.append('phone', params.phone);
    if (params.contractNumber) queryParams.append('contractNumber', params.contractNumber);

    return axios.get(API_URL + 'clients/check-duplicate?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // =====================================
  // DOCUMENTOS DE CLIENTE (SIN CAMBIOS)
  // =====================================

  getClientDocuments(clientId) {
    return axios.get(API_URL + 'clients/' + clientId + '/documents', { headers: authHeader() });
  }

  uploadDocument(clientId, formData) {
    return axios.post(API_URL + 'clients/' + clientId + '/documents', formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  downloadDocument(id) {
    return axios.get(API_URL + 'documents/' + id + '/download', {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  deleteDocument(id) {
    return axios.delete(API_URL + 'documents/' + id, { headers: authHeader() });
  }

  // =====================================
  // NUEVOS MÉTODOS REQUERIDOS POR ClientDetail.vue
  // =====================================

  // Actualizar campo específico del cliente
  updateClientField(clientId, fieldName, newValue) {
    return axios.patch(API_URL + 'clients/' + clientId + '/field', {
      fieldName,
      value: newValue
    }, { headers: authHeader() });
  }

  // Obtener contactos de comunicación del cliente
  getClientContacts(clientId) {
    return axios.get(API_URL + 'clients/' + clientId + '/contacts', { headers: authHeader() });
  }

  // Crear contacto de comunicación
  createClientContact(clientId, contactData) {
    return axios.post(API_URL + 'clients/' + clientId + '/contacts', contactData, { headers: authHeader() });
  }

  // Actualizar contacto de comunicación
  updateClientContact(contactId, contactData) {
    return axios.put(API_URL + 'communication-contacts/' + contactId, contactData, { headers: authHeader() });
  }

  // Eliminar contacto de comunicación
  deleteClientContact(contactId) {
    return axios.delete(API_URL + 'communication-contacts/' + contactId, { headers: authHeader() });
  }

  // Generar documento específico para cliente
  generateClientDocument(clientId, documentType, templateData = {}) {
    return axios.post(API_URL + 'clients/' + clientId + '/generate-document', {
      documentType,
      templateData
    }, { 
      headers: authHeader(),
      responseType: 'blob' 
    });
  }

  // Obtener logs de actividad del cliente, actualmente no funciona 
  getClientLogs(clientId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.action) queryParams.append('action', params.action);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(API_URL + 'clients/' + clientId + '/logs?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // =====================================
  // MÉTODOS DE INTEGRACIÓN CON OTROS SERVICIOS
  // =====================================

  // Obtener información completa del cliente (con todas las relaciones), actualmente no funciona 
  getClientFullInfo(clientId) {
    return axios.get(API_URL + 'clients/' + clientId + '/full-info', { headers: authHeader() });
  }

  // Obtener resumen de actividad del cliente, actualmente no funciona 
  getClientActivitySummary(clientId, period = '30d') {
    return axios.get(API_URL + 'clients/' + clientId + '/activity-summary?period=' + period, { 
      headers: authHeader() 
    });
  }

  // Obtener historial de facturación del cliente, actualmente no funciona 
  getClientBillingHistory(clientId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(API_URL + 'clients/' + clientId + '/billing-history?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // Obtener tickets del cliente, actualmente no funciona 
  getClientTickets(clientId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);

    return axios.get(API_URL + 'clients/' + clientId + '/tickets?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // =====================================
  // MÉTODOS PARA HERRAMIENTAS TÉCNICAS
  // =====================================

  // Ejecutar ping al cliente, actualmente no funciona 
  pingClient(clientId) {
    return axios.post(API_URL + 'clients/' + clientId + '/ping', {}, { headers: authHeader() });
  }

  // Obtener información de conectividad del cliente, actualmente no funciona 
  getClientConnectivity(clientId) {
    return axios.get(API_URL + 'clients/' + clientId + '/connectivity', { headers: authHeader() });
  }

  // Obtener estadísticas de tráfico del cliente, actualmente no funciona 
  getClientTraffic(clientId, period = '24h') {
    return axios.get(API_URL + 'clients/' + clientId + '/traffic?period=' + period, { 
      headers: authHeader() 
    });
  }

  // Reiniciar servicios del cliente, actualmente no funciona 
  restartClientServices(clientId) {
    return axios.post(API_URL + 'clients/' + clientId + '/restart-services', {}, { headers: authHeader() });
  }

  // =====================================
  // MÉTODOS DE UTILIDAD
  // =====================================

  // Validar datos de cliente
  validateClientData(clientData) {
    const errors = [];

    if (!clientData.firstName?.trim()) {
      errors.push('El nombre es requerido');
    }

    if (!clientData.lastName?.trim()) {
      errors.push('El apellido es requerido');
    }

    if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
      errors.push('El email no tiene un formato válido');
    }

    if (clientData.phone && !/^[\d\s\-+()]+$/.test(clientData.phone)) {
      errors.push('El teléfono no tiene un formato válido');
    }

    if (!clientData.zoneId || isNaN(parseInt(clientData.zoneId))) {
      errors.push('La zona es requerida');
    }

    if (!clientData.nodeId || isNaN(parseInt(clientData.nodeId))) {
      errors.push('El nodo es requerido');
    }

    return errors;
  }

  // Formatear datos de cliente para mostrar
  formatClientData(client) {
    return {
      ...client,
      fullName: `${client.firstName} ${client.lastName}`,
      displayStatus: client.active ? 'Activo' : 'Inactivo',
      formattedAddress: client.address || 'Sin dirección registrada',
      primaryContact: client.phone || client.email || 'Sin contacto'
    };
  }
}

export default new ClientService();