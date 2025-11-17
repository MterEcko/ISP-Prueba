// frontend/src/services/clientDocument.service.js
import axios from 'axios';
import authHeader, { authHeaderMultipart } from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class ClientDocumentService {
  
  /**
   * Subir documento para un cliente
   * @param {number} clientId - ID del cliente
   * @param {FormData} formData - Datos del formulario con el archivo
   */
  uploadDocument(clientId, formData) {
    return axios.post(
      API_URL + `clients/${clientId}/documents`,
      formData,
      { 
        headers: authHeaderMultipart(),
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Emitir evento de progreso si es necesario
          if (formData.onProgress) {
            formData.onProgress(percentCompleted);
          }
        }
      }
    );
  }

  /**
   * Obtener documentos de un cliente
   * @param {number} clientId - ID del cliente
   */
  getClientDocuments(clientId) {
    return axios.get(
      API_URL + `clients/${clientId}/documents`,
      { headers: authHeader() }
    );
  }

  /**
   * Descargar documento
   * @param {number} documentId - ID del documento
   */
  downloadDocument(documentId) {
    return axios.get(
      API_URL + `documents/${documentId}/download`,
      {
        headers: authHeader(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Eliminar documento
   * @param {number} documentId - ID del documento
   */
  deleteDocument(documentId) {
    return axios.delete(
      API_URL + `documents/${documentId}`,
      { headers: authHeader() }
    );
  }

  /**
   * Actualizar documento
   * @param {number} documentId - ID del documento
   * @param {object} data - Datos a actualizar
   */
  updateDocument(documentId, data) {
    return axios.put(
      API_URL + `documents/${documentId}`,
      data,
      { headers: authHeader() }
    );
  }

  /**
   * Obtener preview de documento (si es imagen o PDF)
   * @param {number} documentId - ID del documento
   */
  getDocumentPreview(documentId) {
    return axios.get(
      API_URL + `documents/${documentId}/preview`,
      { headers: authHeader() }
    );
  }
}

export default new ClientDocumentService();