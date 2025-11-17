// frontend/src/services/document.service.js
import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class DocumentService {
  
  // ===============================
  // DOCUMENTOS GENERADOS
  // ===============================

  /**
   * Descargar documento generado
   * @param {number} historyId - ID del registro en historial
   */
  downloadGeneratedDocument(historyId) {
    return axios.get(
      API_URL + `documents/generated/${historyId}/download`,
      { 
        headers: authHeader(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Obtener detalles de documento generado
   * @param {number} historyId - ID del registro en historial
   */
  getGeneratedDocumentDetails(historyId) {
    return axios.get(
      API_URL + `documents/generated/${historyId}`,
      { headers: authHeader() }
    );
  }

  /**
   * Eliminar documento generado
   * @param {number} historyId - ID del registro en historial
   */
  deleteGeneratedDocument(historyId) {
    return axios.delete(
      API_URL + `documents/generated/${historyId}`,
      { headers: authHeader() }
    );
  }

  // ===============================
  // PREVIEW Y VALIDACIÓN
  // ===============================

  /**
   * Validar variables de plantilla
   * @param {number} templateId - ID de la plantilla
   * @param {object} variables - Variables a validar
   */
  validateTemplateVariables(templateId, variables) {
    return axios.post(
      API_URL + `templates/${templateId}/validate`,
      { variables },
      { headers: authHeader() }
    );
  }

  /**
   * Obtener preview HTML sin generar PDF
   * @param {number} templateId - ID de la plantilla
   * @param {number} clientId - ID del cliente
   */
  getHTMLPreview(templateId, clientId) {
    return axios.get(
      API_URL + `documents/preview/${templateId}/${clientId}`,
      { headers: authHeader() }
    );
  }

  // ===============================
  // ESTADÍSTICAS
  // ===============================

  /**
   * Obtener estadísticas de uso de plantillas
   * @param {number} templateId - ID de la plantilla (opcional)
   */
  getTemplateStats(templateId = null) {
    const url = templateId 
      ? `templates/${templateId}/stats`
      : 'templates/stats';
    
    return axios.get(API_URL + url, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtener estadísticas de documentos de un cliente
   * @param {number} clientId - ID del cliente
   */
  getClientDocumentStats(clientId) {
    return axios.get(
      API_URL + `clients/${clientId}/document-stats`,
      { headers: authHeader() }
    );
  }
}

export default new DocumentService();