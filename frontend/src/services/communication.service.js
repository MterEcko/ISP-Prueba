// frontend/src/services/communication.service.js
import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class CommunicationService {
  // ==================== GESTIÓN DE CANALES ====================
  
  // Obtener todos los canales de comunicación
  getAllChannels() {
    return axios.get(API_URL + 'communication-channels', { headers: authHeader() });
  }

  // Obtener plugins disponibles
  getAvailablePlugins() {
    return axios.get(API_URL + 'communication-channels/plugins', { headers: authHeader() });
  }

  // Crear nuevo canal
  createChannel(channelData) {
    return axios.post(API_URL + 'communication-channels', channelData, { headers: authHeader() });
  }

  // Actualizar canal
  updateChannel(id, channelData) {
    return axios.put(API_URL + 'communication-channels/' + id, channelData, { headers: authHeader() });
  }

  // Activar/desactivar canal
  activateChannel(id, active) {
    return axios.post(API_URL + 'communication-channels/' + id + '/activate', 
      { active }, 
      { headers: authHeader() }
    );
  }

  // Inicializar todos los canales
  initializeAllChannels() {
    return axios.post(API_URL + 'communication-channels/initialize', {}, { headers: authHeader() });
  }

  // ==================== PLANTILLAS ====================

  // Obtener todas las plantillas
  getAllTemplates(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.channelId) queryParams.append('channelId', params.channelId);
    if (params.templateType) queryParams.append('templateType', params.templateType);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'message-templates?' + queryParams.toString(), { headers: authHeader() });
  }

  // Obtener plantilla por ID
  getTemplate(id) {
    return axios.get(API_URL + 'message-templates/' + id, { headers: authHeader() });
  }

  // Crear nueva plantilla
  createTemplate(templateData) {
    return axios.post(API_URL + 'message-templates', templateData, { headers: authHeader() });
  }

  // Actualizar plantilla
  updateTemplate(id, templateData) {
    return axios.put(API_URL + 'message-templates/' + id, templateData, { headers: authHeader() });
  }

  // Eliminar plantilla
  deleteTemplate(id) {
    return axios.delete(API_URL + 'message-templates/' + id, { headers: authHeader() });
  }

  // Vista previa de plantilla con variables
  previewTemplate(templateId, variables = {}) {
    return axios.post(API_URL + 'message-templates/' + templateId + '/preview', 
      { variables }, 
      { headers: authHeader() }
    );
  }

  // ==================== ENVÍO DE MENSAJES ====================

  // Enviar mensaje individual
  sendMessage(messageData) {
    return axios.post(API_URL + 'communication/send', messageData, { headers: authHeader() });
  }

  // Enviar mensaje masivo
  sendMassMessage(massMessageData) {
    return axios.post(API_URL + 'communication/send-mass', massMessageData, { headers: authHeader() });
  }

  // Programar mensaje
  scheduleMessage(scheduleData) {
    return axios.post(API_URL + 'communication/schedule', scheduleData, { headers: authHeader() });
  }

  // Obtener estado de mensaje
  getMessageStatus(logId) {
    return axios.get(API_URL + 'communication/status/' + logId, { headers: authHeader() });
  }

  // ==================== MENSAJES AUTOMATIZADOS ====================

  // Enviar recordatorio de pago
  sendPaymentReminder(clientId, overdueDays = 0) {
    return axios.post(API_URL + 'communication/payment-reminder', 
      { clientId, overdueDays }, 
      { headers: authHeader() }
    );
  }

  // Enviar mensaje de bienvenida
  sendWelcomeMessage(clientId) {
    return axios.post(API_URL + 'communication/welcome', 
      { clientId }, 
      { headers: authHeader() }
    );
  }

  // Notificar suspensión
  sendSuspensionNotification(clientId, reason) {
    return axios.post(API_URL + 'communication/suspension', 
      { clientId, reason }, 
      { headers: authHeader() }
    );
  }

  // Notificar reactivación
  sendReactivationNotification(clientId) {
    return axios.post(API_URL + 'communication/reactivation', 
      { clientId }, 
      { headers: authHeader() }
    );
  }

  // ==================== HISTORIAL Y ESTADÍSTICAS ====================

  // Obtener historial de comunicaciones
  getCommunicationHistory(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.channelId) queryParams.append('channelId', params.channelId);
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(API_URL + 'communication/history?' + queryParams.toString(), { headers: authHeader() });
  }

  // Obtener estadísticas de comunicación
  getCommunicationStatistics(dateFrom, dateTo) {
    let queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    return axios.get(API_URL + 'communication/statistics?' + queryParams.toString(), { headers: authHeader() });
  }

  // ==================== MENSAJES PROGRAMADOS ====================

  // Obtener mensajes programados
  getScheduledMessages(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.channelId) queryParams.append('channelId', params.channelId);
    if (params.clientId) queryParams.append('clientId', params.clientId);

    return axios.get(API_URL + 'communication/scheduled?' + queryParams.toString(), { headers: authHeader() });
  }

  // Cancelar mensaje programado
  cancelScheduledMessage(id) {
    return axios.delete(API_URL + 'communication/scheduled/' + id, { headers: authHeader() });
  }

  // Procesar mensajes programados manualmente
  processScheduledMessages() {
    return axios.post(API_URL + 'communication/process-scheduled', {}, { headers: authHeader() });
  }

  // ==================== UTILIDADES ====================

  // Obtener variables disponibles para plantillas
  getAvailableVariables() {
    return axios.get(API_URL + 'message-templates/variables', { headers: authHeader() });
  }

  // Validar configuración de canal
  validateChannelConfig(channelData) {
    return axios.post(API_URL + 'communication-channels/validate', channelData, { headers: authHeader() });
  }

  // Probar conexión de canal
  testChannelConnection(channelId) {
    return axios.post(API_URL + 'communication-channels/' + channelId + '/test', {}, { headers: authHeader() });
  }
}

export default new CommunicationService();