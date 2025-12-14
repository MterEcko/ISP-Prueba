// backend/src/services/pluginService.discovery.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Servicio para descubrir y gestionar plugins de tipo "service_provider"
 * Estos plugins pueden ofrecer servicios adicionales al cliente (Jellyfin, Gaming, Streaming, etc.)
 */
class PluginServiceDiscovery {
  constructor() {
    this.pluginsPath = path.join(__dirname, '../plugins');
    this.servicePlugins = new Map();
  }

  /**
   * Descubre todos los plugins de tipo service_provider
   * @returns {Array} Lista de plugins de servicio con sus configuraciones
   */
  async discoverServicePlugins() {
    const plugins = [];

    try {
      if (!fs.existsSync(this.pluginsPath)) {
        logger.warn('Directorio de plugins no encontrado');
        return plugins;
      }

      const pluginDirs = fs.readdirSync(this.pluginsPath, { withFileTypes: true });

      for (const dir of pluginDirs) {
        if (!dir.isDirectory()) continue;

        const manifestPath = path.join(this.pluginsPath, dir.name, 'manifest.json');

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

          // Solo incluir plugins de tipo service_provider
          if (manifest.type === 'service_provider' ||
              (manifest.capabilities && manifest.capabilities.includes('service_provider'))) {

            const serviceConfig = this._extractServiceConfig(manifest, dir.name);

            if (serviceConfig) {
              plugins.push(serviceConfig);
              this.servicePlugins.set(dir.name, serviceConfig);
              logger.info(`✅ Plugin de servicio descubierto: ${dir.name}`);
            }
          }
        } catch (error) {
          logger.error(`Error leyendo manifest de ${dir.name}: ${error.message}`);
        }
      }

      logger.info(`🔍 Total de plugins de servicio descubiertos: ${plugins.length}`);
      return plugins;

    } catch (error) {
      logger.error(`Error descubriendo plugins de servicio: ${error.message}`);
      return plugins;
    }
  }

  /**
   * Extrae la configuración de servicio de un plugin
   * @private
   */
  _extractServiceConfig(manifest, pluginName) {
    return {
      pluginName: pluginName,
      displayName: manifest.displayName || this._formatName(pluginName),
      description: manifest.description || '',
      icon: manifest.icon || 'mdi-puzzle',
      version: manifest.version || '1.0.0',

      // Configuración de campos para el servicio
      serviceFields: manifest.serviceConfig?.fields || this._getDefaultFields(pluginName),

      // Soporte de API externa
      hasExternalApi: manifest.apiIntegration === true,
      apiEndpoint: manifest.apiEndpoint || null,

      // Límites y restricciones
      limits: manifest.serviceConfig?.limits || {},

      // Precio base sugerido
      suggestedPrice: manifest.serviceConfig?.suggestedPrice || 0,

      // Categoría
      category: manifest.category || 'other'
    };
  }

  /**
   * Obtiene campos por defecto según el tipo de plugin
   * @private
   */
  _getDefaultFields(pluginName) {
    const defaultConfigs = {
      'jellyfin': [
        { name: 'maxDevices', type: 'number', label: 'Dispositivos Simultáneos', default: 2, min: 1, max: 10 },
        { name: 'libraries', type: 'multiselect', label: 'Bibliotecas Disponibles', options: ['Películas', 'Series', 'Música'] },
        { name: 'quality', type: 'select', label: 'Calidad Máxima', options: ['SD', 'HD', '4K'], default: 'HD' }
      ],
      'n8n': [
        { name: 'maxWorkflows', type: 'number', label: 'Workflows Máximos', default: 10, min: 1, max: 100 },
        { name: 'executionsPerMonth', type: 'number', label: 'Ejecuciones Mensuales', default: 1000 }
      ]
    };

    return defaultConfigs[pluginName] || [
      { name: 'enabled', type: 'boolean', label: 'Habilitado', default: true }
    ];
  }

  /**
   * Formatea el nombre del plugin para display
   * @private
   */
  _formatName(pluginName) {
    return pluginName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Obtiene la configuración de un plugin específico
   * @param {string} pluginName - Nombre del plugin
   * @returns {Object|null} Configuración del plugin o null
   */
  getServicePlugin(pluginName) {
    return this.servicePlugins.get(pluginName) || null;
  }

  /**
   * Obtiene todos los plugins de servicio activos
   * @returns {Array} Lista de plugins de servicio
   */
  getAllServicePlugins() {
    return Array.from(this.servicePlugins.values());
  }

  /**
   * Valida la configuración de un servicio
   * @param {string} pluginName - Nombre del plugin
   * @param {Object} config - Configuración a validar
   * @returns {Object} { valid: boolean, errors: Array }
   */
  validateServiceConfig(pluginName, config) {
    const plugin = this.getServicePlugin(pluginName);

    if (!plugin) {
      return { valid: false, errors: ['Plugin no encontrado'] };
    }

    const errors = [];

    for (const field of plugin.serviceFields) {
      const value = config[field.name];

      // Validar campos requeridos
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} es requerido`);
      }

      // Validar tipo number
      if (field.type === 'number' && value !== undefined) {
        if (typeof value !== 'number') {
          errors.push(`${field.label} debe ser un número`);
        }
        if (field.min !== undefined && value < field.min) {
          errors.push(`${field.label} debe ser al menos ${field.min}`);
        }
        if (field.max !== undefined && value > field.max) {
          errors.push(`${field.label} no puede ser mayor a ${field.max}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Singleton
const pluginServiceDiscovery = new PluginServiceDiscovery();

module.exports = pluginServiceDiscovery;
