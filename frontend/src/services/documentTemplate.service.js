// frontend/src/services/documentTemplate.service.js
import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class DocumentTemplateService {
  // ===============================
  // PLANTILLAS (Usuarios normales)
  // ===============================

  /**
   * Obtener plantillas activas disponibles para el usuario
   * @param {string} category - Filtrar por categoría (opcional)
   */
  getActiveTemplates(category = null) {
    const params = category ? `?category=${category}` : '';
    return axios.get(API_URL + 'document-templates/active' + params, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtener plantilla específica por ID
   * @param {number} id - ID de la plantilla
   */
  getTemplate(id) {
    return axios.get(API_URL + 'document-templates/' + id, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtener variables disponibles de un cliente
   * @param {number} clientId - ID del cliente
   */
  getClientVariables(clientId) {
    return axios.get(API_URL + `document-templates/client/${clientId}/variables`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // GENERACIÓN DE DOCUMENTOS
  // ===============================

  /**
   * Preview de documento con datos del cliente
   * @param {number} templateId - ID de la plantilla
   * @param {number} clientId - ID del cliente
   */
  previewDocument(templateId, clientId) {
    return axios.get(API_URL + `documents/preview/${templateId}/${clientId}`, { 
      headers: authHeader() 
    });
  }

  /**
   * Generar documento PDF
   * @param {number} templateId - ID de la plantilla
   * @param {number} clientId - ID del cliente
   * @param {object} options - Opciones de generación
   */
  generateDocument(templateId, clientId, options = {}) {
    return axios.post(
      API_URL + `documents/generate/${templateId}/${clientId}`,
      {
        saveToDocuments: options.saveToDocuments !== false,
        customVariables: options.customVariables || {}
      },
      { headers: authHeader() }
    );
  }

  /**
   * Obtener historial de documentos generados de un cliente
   * @param {number} clientId - ID del cliente
   * @param {number} limit - Límite de resultados
   */
  getDocumentHistory(clientId, limit = 50) {
    return axios.get(API_URL + `documents/history/${clientId}?limit=${limit}`, { 
      headers: authHeader() 
    });
  }

  /**
   * Marcar documento como firmado
   * @param {number} historyId - ID del registro en historial
   * @param {string} signatureHash - Hash de la firma
   */
  signDocument(historyId, signatureHash) {
    return axios.post(
      API_URL + `documents/sign/${historyId}`,
      { signatureHash },
      { headers: authHeader() }
    );
  }

  // ===============================
  // ADMINISTRACIÓN (Solo admin)
  // ===============================

  /**
   * Obtener todas las plantillas (admin)
   * @param {object} params - Parámetros de filtrado
   */
  getAllTemplates(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);
    if (params.search) queryParams.append('search', params.search);

    return axios.get(API_URL + 'admin/document-templates?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  /**
   * Crear nueva plantilla (admin)
   * @param {object} templateData - Datos de la plantilla
   */
  createTemplate(templateData) {
    return axios.post(
      API_URL + 'admin/document-templates',
      templateData,
      { headers: authHeader() }
    );
  }

  /**
   * Actualizar plantilla (admin)
   * @param {number} id - ID de la plantilla
   * @param {object} templateData - Datos actualizados
   */
  updateTemplate(id, templateData) {
    return axios.put(
      API_URL + 'admin/document-templates/' + id,
      templateData,
      { headers: authHeader() }
    );
  }

  /**
   * Habilitar/Deshabilitar plantilla (admin)
   * @param {number} id - ID de la plantilla
   * @param {boolean} enabled - Nuevo estado
   */
  toggleTemplateStatus(id, enabled) {
    return axios.patch(
      API_URL + 'admin/document-templates/' + id + '/toggle',
      { enabled },
      { headers: authHeader() }
    );
  }

  /**
   * Eliminar plantilla (admin)
   * @param {number} id - ID de la plantilla
   */
  deleteTemplate(id) {
    return axios.delete(API_URL + 'admin/document-templates/' + id, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtener contenido HTML de plantilla (admin)
   * @param {number} id - ID de la plantilla
   */
  getTemplateContent(id) {
    return axios.get(API_URL + 'admin/document-templates/' + id + '/content', { 
      headers: authHeader() 
    });
  }
}

export default new DocumentTemplateService();