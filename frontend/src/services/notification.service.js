import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class NotificationService {
  // ===============================
  // NOTIFICACIONES GENERALES
  // ===============================

  /**
   * Envía una notificación genérica a través del backend
   * El backend decidirá el canal (Telegram, WhatsApp, Email, etc.) basado en la configuración
   * @param {object} notificationData - Datos de la notificación
   * @returns {Promise} - Promesa con la respuesta del backend
   */
  sendNotification(notificationData) {
    return axios.post(`${API_URL}/notifications/send`, notificationData, {
      headers: authHeader()
    });
  }

  /**
   * Obtener todas las notificaciones con filtros
   * @param {object} params - Parámetros de filtrado
   * @returns {Promise} - Promesa con las notificaciones
   */
  getAllNotifications(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);
    if (params.channel) queryParams.append('channel', params.channel);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(`${API_URL}/notifications?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener notificación por ID
   * @param {number} id - ID de la notificación
   * @returns {Promise} - Promesa con la notificación
   */
  getNotification(id) {
    return axios.get(`${API_URL}/notifications/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Marcar notificación como leída
   * @param {number} id - ID de la notificación
   * @returns {Promise} - Promesa con el resultado
   */
  markAsRead(id) {
    return axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
      headers: authHeader()
    });
  }

  /**
   * Eliminar notificación
   * @param {number} id - ID de la notificación
   * @returns {Promise} - Promesa con el resultado
   */
  deleteNotification(id) {
    return axios.delete(`${API_URL}/notifications/${id}`, {
      headers: authHeader()
    });
  }

  // ===============================
  // TELEGRAM
  // ===============================

  /**
   * Envía un mensaje directo a través de Telegram
   * @param {string} chatId - El ID del chat de Telegram
   * @param {string} message - El mensaje a enviar
   * @param {object} options - Opciones adicionales (keyboard, parse_mode, etc.)
   * @returns {Promise} - Promesa con la respuesta del backend
   */
  sendTelegramMessage(chatId, message, options = {}) {
    return axios.post(`${API_URL}/notifications/telegram/send-message`, {
      chatId,
      message,
      ...options
    }, {
      headers: authHeader()
    });
  }

  /**
   * Obtener información del bot de Telegram
   * @returns {Promise} - Promesa con la información del bot
   */
  getTelegramBotInfo() {
    return axios.get(`${API_URL}/notifications/telegram/bot-info`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener actualizaciones de Telegram
   * @returns {Promise} - Promesa con las actualizaciones
   */
  getTelegramUpdates() {
    return axios.get(`${API_URL}/notifications/telegram/updates`, {
      headers: authHeader()
    });
  }

  /**
   * Configurar webhook de Telegram
   * @param {string} webhookUrl - URL del webhook
   * @returns {Promise} - Promesa con el resultado
   */
  setTelegramWebhook(webhookUrl) {
    return axios.post(`${API_URL}/notifications/telegram/webhook`, {
      webhookUrl
    }, {
      headers: authHeader()
    });
  }

  // ===============================
  // WHATSAPP
  // ===============================

  /**
   * Envía un mensaje de plantilla de WhatsApp
   * @param {string} phoneNumber - Número de WhatsApp del destinatario
   * @param {string} templateName - Nombre de la plantilla aprobada
   * @param {string} languageCode - Código de idioma (e.g., "es_MX")
   * @param {Array} components - Componentes de la plantilla
   * @returns {Promise} - Promesa con la respuesta del backend
   */
  sendWhatsAppTemplate(phoneNumber, templateName, languageCode, components = []) {
    return axios.post(`${API_URL}/notifications/whatsapp/send-template`, {
      phoneNumber,
      templateName,
      languageCode,
      components
    }, {
      headers: authHeader()
    });
  }

  /**
   * Enviar mensaje de texto simple por WhatsApp
   * @param {string} phoneNumber - Número de WhatsApp
   * @param {string} message - Mensaje a enviar
   * @returns {Promise} - Promesa con la respuesta
   */
  sendWhatsAppMessage(phoneNumber, message) {
    return axios.post(`${API_URL}/notifications/whatsapp/send-message`, {
      phoneNumber,
      message
    }, {
      headers: authHeader()
    });
  }

  /**
   * Obtener plantillas de WhatsApp disponibles
   * @returns {Promise} - Promesa con las plantillas
   */
  getWhatsAppTemplates() {
    return axios.get(`${API_URL}/notifications/whatsapp/templates`, {
      headers: authHeader()
    });
  }

  /**
   * Verificar estado de WhatsApp Business
   * @returns {Promise} - Promesa con el estado
   */
  getWhatsAppStatus() {
    return axios.get(`${API_URL}/notifications/whatsapp/status`, {
      headers: authHeader()
    });
  }

  // ===============================
  // EMAIL
  // ===============================

  /**
   * Enviar email
   * @param {object} emailData - Datos del email (to, subject, body, template, etc.)
   * @returns {Promise} - Promesa con la respuesta
   */
  sendEmail(emailData) {
    return axios.post(`${API_URL}/notifications/email/send`, emailData, {
      headers: authHeader()
    });
  }

  /**
   * Enviar email masivo
   * @param {object} bulkEmailData - Datos para envío masivo
   * @returns {Promise} - Promesa con la respuesta
   */
  sendBulkEmail(bulkEmailData) {
    return axios.post(`${API_URL}/notifications/email/send-bulk`, bulkEmailData, {
      headers: authHeader()
    });
  }

  /**
   * Obtener plantillas de email
   * @returns {Promise} - Promesa con las plantillas
   */
  getEmailTemplates() {
    return axios.get(`${API_URL}/notifications/email/templates`, {
      headers: authHeader()
    });
  }

  /**
   * Probar configuración SMTP
   * @param {object} smtpConfig - Configuración SMTP
   * @returns {Promise} - Promesa con el resultado de la prueba
   */
  testSmtpConnection(smtpConfig) {
    return axios.post(`${API_URL}/notifications/email/test-smtp`, smtpConfig, {
      headers: authHeader()
    });
  }

  // ===============================
  // PLANTILLAS Y CONFIGURACIÓN
  // ===============================

  /**
   * Obtener todas las plantillas de mensajes
   * @param {string} channel - Canal específico (opcional)
   * @returns {Promise} - Promesa con las plantillas
   */
  getMessageTemplates(channel = null) {
    const params = channel ? `?channel=${channel}` : '';
    return axios.get(`${API_URL}/notifications/templates${params}`, {
      headers: authHeader()
    });
  }

  /**
   * Crear nueva plantilla de mensaje
   * @param {object} templateData - Datos de la plantilla
   * @returns {Promise} - Promesa con la respuesta
   */
  createMessageTemplate(templateData) {
    return axios.post(`${API_URL}/notifications/templates`, templateData, {
      headers: authHeader()
    });
  }

  /**
   * Actualizar plantilla de mensaje
   * @param {number} id - ID de la plantilla
   * @param {object} templateData - Datos actualizados
   * @returns {Promise} - Promesa con la respuesta
   */
  updateMessageTemplate(id, templateData) {
    return axios.put(`${API_URL}/notifications/templates/${id}`, templateData, {
      headers: authHeader()
    });
  }

  /**
   * Eliminar plantilla de mensaje
   * @param {number} id - ID de la plantilla
   * @returns {Promise} - Promesa con la respuesta
   */
  deleteMessageTemplate(id) {
    return axios.delete(`${API_URL}/notifications/templates/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Vista previa de plantilla con variables
   * @param {number} templateId - ID de la plantilla
   * @param {object} variables - Variables para reemplazar
   * @returns {Promise} - Promesa con la vista previa
   */
  previewTemplate(templateId, variables = {}) {
    return axios.post(`${API_URL}/notifications/templates/${templateId}/preview`, {
      variables
    }, {
      headers: authHeader()
    });
  }

  // ===============================
  // CONFIGURACIÓN DE CANALES
  // ===============================

  /**
   * Obtener configuración de canales de notificación
   * @returns {Promise} - Promesa con la configuración
   */
  getChannelConfiguration() {
    return axios.get(`${API_URL}/notifications/channels/config`, {
      headers: authHeader()
    });
  }

  /**
   * Actualizar configuración de canal
   * @param {string} channel - Canal (telegram, whatsapp, email)
   * @param {object} config - Nueva configuración
   * @returns {Promise} - Promesa con la respuesta
   */
  updateChannelConfiguration(channel, config) {
    return axios.put(`${API_URL}/notifications/channels/${channel}/config`, config, {
      headers: authHeader()
    });
  }

  /**
   * Probar conexión de canal
   * @param {string} channel - Canal a probar
   * @returns {Promise} - Promesa con el resultado de la prueba
   */
  testChannelConnection(channel) {
    return axios.post(`${API_URL}/notifications/channels/${channel}/test`, {}, {
      headers: authHeader()
    });
  }

  // ===============================
  // ESTADÍSTICAS Y REPORTES
  // ===============================

  /**
   * Obtener estadísticas de notificaciones
   * @param {object} params - Parámetros de filtrado
   * @returns {Promise} - Promesa con las estadísticas
   */
  getNotificationStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.channel) queryParams.append('channel', params.channel);

    return axios.get(`${API_URL}/notifications/statistics?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener historial de envíos
   * @param {object} params - Parámetros de filtrado
   * @returns {Promise} - Promesa con el historial
   */
  getDeliveryHistory(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.channel) queryParams.append('channel', params.channel);
    if (params.status) queryParams.append('status', params.status);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(`${API_URL}/notifications/delivery-history?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  /**
   * Validar número de teléfono para WhatsApp
   * @param {string} phoneNumber - Número a validar
   * @returns {boolean} - Si el número es válido
   */
  validatePhoneNumber(phoneNumber) {
    // Formato internacional sin + al inicio
    const phoneRegex = /^[1-9]\d{1,14}$/;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Formatear número de teléfono para WhatsApp
   * @param {string} phoneNumber - Número a formatear
   * @returns {string} - Número formateado
   */
  formatPhoneNumber(phoneNumber) {
    // Remover caracteres no numéricos
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Si no tiene código de país, asumir México (+52)
    if (cleanPhone.length === 10) {
      return `52${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  /**
   * Obtener variables disponibles para plantillas
   * @returns {Array} - Lista de variables disponibles
   */
  getAvailableVariables() {
    return [
      { name: 'cliente_nombre', description: 'Nombre del cliente' },
      { name: 'cliente_apellido', description: 'Apellido del cliente' },
      { name: 'factura_numero', description: 'Número de factura' },
      { name: 'factura_monto', description: 'Monto de la factura' },
      { name: 'factura_fecha_vencimiento', description: 'Fecha de vencimiento' },
      { name: 'servicio_velocidad', description: 'Velocidad del servicio' },
      { name: 'empresa_nombre', description: 'Nombre de la empresa' },
      { name: 'empresa_telefono', description: 'Teléfono de la empresa' },
      { name: 'fecha_actual', description: 'Fecha actual' }
    ];
  }

  /**
   * Formatear estado de notificación para UI
   * @param {string} status - Estado de la notificación
   * @returns {object} - Objeto con formato para UI
   */
  formatNotificationStatus(status) {
    const statusMap = {
      'pending': { label: 'Pendiente', class: 'status-pending', color: '#2196F3' },
      'sent': { label: 'Enviado', class: 'status-sent', color: '#4CAF50' },
      'delivered': { label: 'Entregado', class: 'status-delivered', color: '#8BC34A' },
      'failed': { label: 'Fallido', class: 'status-failed', color: '#F44336' },
      'read': { label: 'Leído', class: 'status-read', color: '#9C27B0' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  /**
   * Formatear canal de notificación para UI
   * @param {string} channel - Canal de notificación
   * @returns {string} - Nombre formateado del canal
   */
  formatChannelName(channel) {
    const channelMap = {
      'telegram': 'Telegram',
      'whatsapp': 'WhatsApp',
      'email': 'Email',
      'sms': 'SMS',
      'push': 'Push Notification'
    };

    return channelMap[channel] || channel;
  }
}

export default new NotificationService();