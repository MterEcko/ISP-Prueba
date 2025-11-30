// frontend/src/services/frontend_apiConfig.js
// Configuración dinámica de API según el entorno

/**
 * Detecta automáticamente la URL del backend según desde dónde se accede
 * Funciona para:
 * - localhost (desarrollo)
 * - Red local (10.10.0.121)
 * - Dominio público (ISP.serviciosqbit.net)
 */

// Obtener la URL base del servidor actual
const getApiUrl = () => {
  // 1. Si hay variable de entorno configurada, usarla
  if (process.env.VUE_APP_API_URL) {
    return process.env.VUE_APP_API_URL;
  }

  // 2. Detectar automáticamente según el hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // http: o https:

  // ==================== LOCALHOST ====================
  // Si es localhost, usar puerto 3000 explícito
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000/api/`;
  }

  // ==================== IP LOCAL ====================
  // Si es IP de red local (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  if (hostname.match(/^10\.\d+\.\d+\.\d+$/) ||
      hostname.match(/^192\.168\.\d+\.\d+$/) ||
      hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/)) {
    // Usar la misma IP pero en el puerto del backend
    return `${protocol}//${hostname}:3000/api/`;
  }

  // ==================== DOMINIO PÚBLICO ====================
  // Para dominios (isp.serviciosqbit.net, etc.)
  // NO agregar puerto - Cloudflare/Nginx hace proxy internamente
  // Ejemplo: https://isp.serviciosqbit.net/api/ (sin :3000)
  return `${protocol}//${hostname}/api/`;
};

export const API_URL = getApiUrl();

// Para debugging en consola
console.log('🔗 API URL configurada:', API_URL);
console.log('📍 Hostname actual:', window.location.hostname);
console.log('🌐 Protocolo:', window.location.protocol);

// Exportaciones adicionales útiles
export const WS_URL = API_URL.replace('http', 'ws').replace('/api/', '/ws');
export const BASE_URL = API_URL.replace('/api/', '');

export default API_URL;
