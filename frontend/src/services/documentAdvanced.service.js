// frontend/src/services/documentAdvanced.service.js
import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class DocumentAdvancedService {
  
  // ===============================
  // FIRMAS DIGITALES
  // ===============================

  /**
   * Crear firma digital
   * @param {object} signatureData - Datos de la firma
   */
  createSignature(signatureData) {
    return axios.post(API_URL + 'documents/signatures', signatureData, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtener firmas de un documento
   * @param {number} documentId - ID del documento generado
   */
  getDocumentSignatures(documentId) {
    return axios.get(API_URL + `documents/${documentId}/signatures`, { 
      headers: authHeader() 
    });
  }

  /**
   * Verificar firma específica
   * @param {number} signatureId - ID de la firma
   */
  verifySignature(signatureId) {
    return axios.get(API_URL + `signatures/${signatureId}/verify`, { 
      headers: authHeader() 
    });
  }

  /**
   * Revocar firma
   * @param {number} signatureId - ID de la firma
   * @param {string} reason - Razón de revocación
   */
  revokeSignature(signatureId, reason) {
    return axios.post(
      API_URL + `signatures/${signatureId}/revoke`,
      { reason },
      { headers: authHeader() }
    );
  }

  // ===============================
  // VERSIONAMIENTO
  // ===============================

  /**
   * Obtener versiones de una plantilla
   * @param {number} templateId - ID de la plantilla
   */
  getTemplateVersions(templateId) {
    return axios.get(API_URL + `templates/${templateId}/versions`, { 
      headers: authHeader() 
    });
  }

  /**
   * Crear nueva versión de plantilla
   * @param {number} templateId - ID de la plantilla
   * @param {object} versionData - Datos de la nueva versión
   */
  createNewVersion(templateId, versionData) {
    return axios.post(
      API_URL + `templates/${templateId}/versions`,
      versionData,
      { headers: authHeader() }
    );
  }

  /**
   * Restaurar versión anterior
   * @param {number} versionId - ID de la versión a restaurar
   */
  restoreVersion(versionId) {
    return axios.post(
      API_URL + `templates/versions/${versionId}/restore`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Comparar dos versiones
   * @param {number} version1Id - ID de la primera versión
   * @param {number} version2Id - ID de la segunda versión
   */
  compareVersions(version1Id, version2Id) {
    return axios.get(
      API_URL + `templates/versions/compare?version1Id=${version1Id}&version2Id=${version2Id}`,
      { headers: authHeader() }
    );
  }

  // ===============================
  // EXPORTAR/IMPORTAR
  // ===============================

  /**
   * Duplicar plantilla
   * @param {number} templateId - ID de la plantilla
   * @param {string} newName - Nombre para la copia
   */
  duplicateTemplate(templateId, newName) {
    return axios.post(
      API_URL + `templates/${templateId}/duplicate`,
      { newName },
      { headers: authHeader() }
    );
  }

  /**
   * Exportar plantilla
   * @param {number} templateId - ID de la plantilla
   * @param {string} format - Formato (json|zip)
   * @param {boolean} includeHtml - Incluir HTML
   */
  exportTemplate(templateId, format = 'json', includeHtml = true) {
    return axios.get(
      API_URL + `templates/${templateId}/export?format=${format}&includeHtml=${includeHtml}`,
      { 
        headers: authHeader(),
        responseType: format === 'zip' ? 'blob' : 'json'
      }
    );
  }

  /**
   * Importar plantilla
   * @param {object} templateData - Datos de la plantilla
   * @param {string} htmlContent - Contenido HTML (opcional)
   * @param {boolean} overwriteExisting - Sobrescribir si existe
   */
  importTemplate(templateData, htmlContent = null, overwriteExisting = false) {
    return axios.post(
      API_URL + 'templates/import',
      { 
        templateData, 
        htmlContent, 
        overwriteExisting 
      },
      { headers: authHeader() }
    );
  }

  /**
   * Obtener historial de exportaciones
   * @param {number} templateId - ID de la plantilla
   */
  getExportHistory(templateId) {
    return axios.get(API_URL + `templates/${templateId}/export-history`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // ENVÍO DE EMAILS
  // ===============================

  /**
   * Enviar documento por email
   * @param {number} documentId - ID del documento
   * @param {object} emailData - Datos del email
   */
  sendDocumentByEmail(documentId, emailData) {
    return axios.post(
      API_URL + `documents/${documentId}/send-email`,
      emailData,
      { headers: authHeader() }
    );
  }

  /**
   * Configurar envío automático
   * @param {number} templateId - ID de la plantilla
   * @param {object} config - Configuración de envío automático
   */
  configureAutoSend(templateId, config) {
    return axios.post(
      API_URL + `templates/${templateId}/auto-send`,
      config,
      { headers: authHeader() }
    );
  }

  /**
   * Envío masivo de documentos
   * @param {array} documentIds - IDs de los documentos
   * @param {object} emailConfig - Configuración del email
   */
  sendBulkDocuments(documentIds, emailConfig) {
    return axios.post(
      API_URL + 'documents/send-bulk',
      { documentIds, emailConfig },
      { headers: authHeader() }
    );
  }

  /**
   * Obtener historial de emails
   * @param {number} documentId - ID del documento
   */
  getEmailHistory(documentId) {
    return axios.get(API_URL + `documents/${documentId}/email-history`, { 
      headers: authHeader() 
    });
  }

  /**
   * Preview de email
   * @param {number} documentId - ID del documento
   * @param {object} emailData - Datos del email
   */
  previewEmail(documentId, emailData) {
    return axios.post(
      API_URL + `documents/${documentId}/email-preview`,
      emailData,
      { headers: authHeader() }
    );
  }

  // ===============================
  // OPERACIONES MASIVAS
  // ===============================

  /**
   * Generar documentos masivamente
   * @param {number} templateId - ID de la plantilla
   * @param {array} clientIds - IDs de los clientes
   * @param {boolean} saveToDocuments - Guardar en documentos
   */
  generateBulkDocuments(templateId, clientIds, saveToDocuments = true) {
    return axios.post(
      API_URL + 'documents/generate-bulk',
      { templateId, clientIds, saveToDocuments },
      { headers: authHeader() }
    );
  }

  /**
   * Descargar documentos en ZIP
   * @param {array} documentIds - IDs de los documentos
   */
  downloadBulkDocuments(documentIds) {
    return axios.post(
      API_URL + 'documents/download-bulk',
      { documentIds },
      { 
        headers: authHeader(),
        responseType: 'blob'
      }
    );
  }
}

export default new DocumentAdvancedService();