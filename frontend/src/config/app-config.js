// frontend/src/config/app-config.js
// Configuración de la aplicación

/**
 * CONFIGURACIÓN IMPORTANTE:
 *
 * USE_MOCK_DATA: true/false
 * - true: Usa datos simulados desde archivos JSON locales
 * - false: Usa APIs reales del servidor
 *
 * Cuando tengas el servidor de licencias y plugins funcionando,
 * solo cambia USE_MOCK_DATA a false y actualiza las URLs
 */

const config = {
  // ==================== CONFIGURACIÓN DE DATOS ====================

  // Usar datos mock (simulados) o APIs reales
  USE_MOCK_DATA: true, // Cambiar a false cuando el servidor esté listo

  // ==================== URLs DE SERVIDOR EXTERNO ====================

  // URL del servidor de licencias (cuando esté disponible)
  LICENSE_SERVER_URL: process.env.VUE_APP_LICENSE_SERVER_URL || 'http://localhost:3002/api',

  // URL del servidor de marketplace de plugins (cuando esté disponible)
  MARKETPLACE_SERVER_URL: process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace',

  // ==================== CONFIGURACIÓN DE LICENCIAS ====================

  LICENSE: {
    // Mostrar hint de licencia maestra en desarrollo
    SHOW_MASTER_LICENSE_HINT: process.env.NODE_ENV === 'development',

    // Clave de licencia maestra (solo visible en código fuente)
    // IMPORTANTE: Esta clave se genera en el backend
    MASTER_LICENSE_KEY: '7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F',

    // Verificación automática de licencia (en segundos)
    AUTO_CHECK_INTERVAL: 3600, // 1 hora

    // Días antes de expiración para mostrar advertencia
    EXPIRATION_WARNING_DAYS: 30
  },

  // ==================== CONFIGURACIÓN DE PLUGINS ====================

  PLUGINS: {
    // Permitir instalación de plugins desde archivos locales
    ALLOW_LOCAL_INSTALL: true,

    // Tamaño máximo de plugin (en MB)
    MAX_PLUGIN_SIZE: 50,

    // Formatos permitidos para plugins
    ALLOWED_FORMATS: ['.zip', '.plugin'],

    // Auto-actualización de plugins
    AUTO_UPDATE: false,

    // Verificar firma digital de plugins
    VERIFY_SIGNATURE: true
  },

  // ==================== CONFIGURACIÓN DE SINCRONIZACIÓN ====================

  SYNC: {
    // Intervalo de sincronización con servidor externo (en segundos)
    SYNC_INTERVAL: 300, // 5 minutos

    // Reintentos en caso de fallo
    MAX_RETRIES: 3,

    // Tiempo de espera entre reintentos (en segundos)
    RETRY_DELAY: 5
  },

  // ==================== FEATURES FLAGS ====================

  FEATURES: {
    // Sistema de licencias habilitado
    LICENSES_ENABLED: true,

    // Marketplace de plugins habilitado
    MARKETPLACE_ENABLED: true,

    // Instalación manual de plugins
    MANUAL_PLUGIN_INSTALL: true,

    // Sistema de actualizaciones automáticas
    AUTO_UPDATES: false,

    // Telemetría y analytics
    TELEMETRY_ENABLED: false
  },

  // ==================== CONFIGURACIÓN DE DESARROLLO ====================

  DEV: {
    // Mostrar logs de debug en consola
    DEBUG_LOGS: process.env.NODE_ENV === 'development',

    // Simular latencia de red (en ms)
    SIMULATE_NETWORK_DELAY: process.env.NODE_ENV === 'development' ? 500 : 0
  }
};

export default config;

// Helper para simular delay de red en desarrollo
export function simulateNetworkDelay() {
  if (config.DEV.SIMULATE_NETWORK_DELAY > 0) {
    return new Promise(resolve =>
      setTimeout(resolve, config.DEV.SIMULATE_NETWORK_DELAY)
    );
  }
  return Promise.resolve();
}

// Helper para logs de debug
export function debugLog(message, data = null) {
  if (config.DEV.DEBUG_LOGS) {
    console.log(`[ISP-Prueba Debug] ${message}`, data || '');
  }
}
