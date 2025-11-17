// frontend_apiConfig.js
// Este archivo centraliza la configuración de la URL base de la API para el frontend.

const API_BASE_URL = process.env.VUE_APP_API_URL || "http://localhost:3000/api/";

export default API_BASE_URL;

// Instrucciones de uso:
// 1. Importar en los archivos de servicio:
//    import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta según la ubicación del archivo
//
// 2. Usar al construir las URLs de las peticiones:
//    const response = await fetch(`${API_BASE_URL}usuarios`);
//
// Para configuración en producción o diferentes entornos:
// Se recomienda utilizar variables de entorno (como VUE_APP_API_URL para proyectos Vue.js).
// El archivo `.env` en la raíz del proyecto Vue podría contener:
// VUE_APP_API_URL=https://tu-dominio-de-produccion.com/api/
//
// Si la variable de entorno no está definida, se usará "http://localhost:3000/api/" por defecto.

// Configuración para uploads
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: {
    documents: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    images: ['image/jpeg', 'image/png', 'image/gif'],
    all: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};

// URLs de endpoints
export const ENDPOINTS = {
  // Autenticación
  auth: {
    login: 'auth/signin',
    signup: 'auth/signup',
    logout: 'auth/logout'
  },
  
  // Plantillas
  templates: {
    active: 'document-templates/active',
    admin: 'admin/document-templates',
    single: (id) => `document-templates/${id}`,
    content: (id) => `admin/document-templates/${id}/content`,
    toggle: (id) => `admin/document-templates/${id}/toggle`,
    variables: (clientId) => `document-templates/client/${clientId}/variables`
  },
  
  // Documentos
  documents: {
    preview: (templateId, clientId) => `documents/preview/${templateId}/${clientId}`,
    generate: (templateId, clientId) => `documents/generate/${templateId}/${clientId}`,
    history: (clientId) => `documents/history/${clientId}`,
    sign: (historyId) => `documents/sign/${historyId}`,
    download: (documentId) => `documents/${documentId}/download`
  },
  
  // Clientes
  clients: {
    documents: (clientId) => `clients/${clientId}/documents`,
    uploadDocument: (clientId) => `clients/${clientId}/documents`
  },
  
  // Firmas
  signatures: {
    create: 'documents/signatures',
    get: (documentId) => `documents/${documentId}/signatures`,
    verify: (signatureId) => `signatures/${signatureId}/verify`,
    revoke: (signatureId) => `signatures/${signatureId}/revoke`
  },
  
  // Email
  email: {
    send: (documentId) => `documents/${documentId}/send-email`,
    bulk: 'documents/send-bulk',
    history: (documentId) => `documents/${documentId}/email-history`,
    preview: (documentId) => `documents/${documentId}/email-preview`
  },
  
  // Operaciones masivas
  bulk: {
    generate: 'documents/generate-bulk',
    download: 'documents/download-bulk'
  }
};