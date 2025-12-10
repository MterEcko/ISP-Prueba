// frontend/src/services/plugin.service.js
import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class PluginService {
  // ================== GESTIÓN DE PLUGINS ==================

  /**
   * Obtener todos los plugins del sistema
   */
  getAllPlugins() {
    return axios.get(`${API_URL}system-plugins`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener plugin por ID
   */
  getPluginById(id) {
    return axios.get(`${API_URL}system-plugins/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener plugins activos
   */
  getActivePlugins() {
    return axios.get(`${API_URL}system-plugins/active`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener plugins disponibles en el sistema de archivos
   */
  getAvailablePlugins() {
    return axios.get(`${API_URL}system-plugins/available`, {
      headers: authHeader()
    });
  }

  /**
   * Crear/Registrar nuevo plugin
   */
  createPlugin(pluginData) {
    return axios.post(`${API_URL}system-plugins`, pluginData, {
      headers: authHeader()
    });
  }

  /**
   * Actualizar plugin existente
   */
  updatePlugin(id, pluginData) {
    return axios.put(`${API_URL}system-plugins/${id}`, pluginData, {
      headers: authHeader()
    });
  }

  /**
   * Eliminar plugin
   */
  deletePlugin(id) {
    return axios.delete(`${API_URL}system-plugins/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Activar plugin
   */
  activatePlugin(id) {
    return axios.post(
      `${API_URL}system-plugins/${id}/activate`,
      {},
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Desactivar plugin
   */
  deactivatePlugin(id) {
    return axios.post(
      `${API_URL}system-plugins/${id}/deactivate`,
      {},
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Recargar plugin
   */
  reloadPlugin(id) {
    return axios.post(
      `${API_URL}system-plugins/${id}/reload`,
      {},
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Inicializar todos los plugins activos
   */
  initializeAllPlugins() {
    return axios.post(
      `${API_URL}system-plugins/initialize`,
      {},
      {
        headers: authHeader()
      }
    );
  }

  // ================== CONFIGURACIÓN DE PLUGINS ==================

  /**
   * Obtener configuración de un plugin
   */
  getPluginConfig(id) {
    return axios.get(`${API_URL}system-plugins/${id}/config`, {
      headers: authHeader()
    });
  }

  /**
   * Actualizar configuración de un plugin
   */
  updatePluginConfig(id, config) {
    return axios.put(`${API_URL}system-plugins/${id}/config`, config, {
      headers: authHeader()
    });
  }

  // ================== MENÚS Y PERMISOS ==================

  /**
   * Obtener items de menú de plugins
   */
  getPluginMenuItems() {
    return axios.get(`${API_URL}system-plugins/menu-items`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener permisos de plugins
   */
  getPluginPermissions() {
    return axios.get(`${API_URL}system-plugins/permissions`, {
      headers: authHeader()
    });
  }

  // ================== MARKETPLACE DE PLUGINS ==================

  /**
   * Obtener plugins disponibles en el marketplace
   * TODO: Implementar servidor de marketplace
   */
  getMarketplacePlugins(filters = {}) {
    // Apunta al servidor de marketplace con validación de licencia
    const marketplaceUrl = process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';

    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.sort) queryParams.append('sort', filters.sort);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    // Agregar licenseKey si existe en localStorage
    const licenseKey = localStorage.getItem('licenseKey');
    if (licenseKey) {
      queryParams.append('licenseKey', licenseKey);
    }

    return axios.get(`${marketplaceUrl}/plugins?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  /**
   * Activar plugin desde marketplace (Store API)
   * Verifica si el plugin existe en código, si no, lo descarga e instala
   */
  async activateMarketplacePlugin(pluginId, pluginData) {
    const marketplaceUrl = process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';
    const licenseKey = localStorage.getItem('licenseKey');
    const installationKey = localStorage.getItem('installationKey');

    console.log('🔍 Verificando si plugin existe en filesystem...');

    try {
      // 1. Verificar si el plugin ya existe en el filesystem
      const availablePluginsResponse = await this.getAvailablePlugins();
      const availablePlugins = availablePluginsResponse.data.data || [];
      const pluginExistsInCode = availablePlugins.some(
        p => p.name === pluginData.name || p.slug === pluginId
      );

      if (!pluginExistsInCode) {
        console.log('⬇️ Plugin no existe en código, descargando desde Store...');

        // 2. Descargar plugin desde Store
        const downloadResponse = await axios.post(
          `${marketplaceUrl}/plugins/${pluginId}/download`,
          { installationKey },
          {
            headers: authHeader(),
            responseType: 'blob'
          }
        );

        // 3. Instalar plugin descargado
        console.log('📦 Instalando plugin descargado...');
        const pluginFile = new File([downloadResponse.data], `${pluginId}.zip`, {
          type: 'application/zip'
        });

        await this.installPlugin(pluginFile);
        console.log('✅ Plugin instalado exitosamente');
      } else {
        console.log('✅ Plugin ya existe en el código');
      }

      // 4. Activar plugin en la Store (registrar activación)
      console.log('📝 Registrando activación en Store...');
      await axios.post(
        `${marketplaceUrl}/plugins/${pluginId}/activate`,
        {
          installationKey,
          licenseKey
        },
        {
          headers: authHeader()
        }
      );

      // 5. Crear/Activar plugin localmente en la DB
      console.log('💾 Activando plugin en base de datos local...');
      return this.createPlugin({
        name: pluginData.name,
        version: pluginData.version,
        description: pluginData.description,
        category: pluginData.category,
        active: true
      });
    } catch (error) {
      console.error('❌ Error en activación de plugin:', error);
      throw error;
    }
  }

  /**
   * Obtener detalles de un plugin en el marketplace
   */
  getMarketplacePluginDetails(pluginId) {
    const marketplaceUrl = process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';
    return axios.get(`${marketplaceUrl}/plugins/${pluginId}`, {
      headers: authHeader()
    });
  }

  /**
   * Descargar plugin desde el marketplace
   */
  downloadPlugin(pluginId) {
    const marketplaceUrl = process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';
    return axios.post(
      `${marketplaceUrl}/plugins/${pluginId}/download`,
      {},
      {
        headers: authHeader(),
        responseType: 'blob' // Para descargar archivos
      }
    );
  }

  /**
   * Instalar plugin descargado
   */
  installPlugin(pluginFile) {
    const formData = new FormData();
    formData.append('plugin', pluginFile);

    return axios.post(`${API_URL}system-plugins/install`, formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Subir plugin al marketplace (para desarrolladores)
   */
  uploadToMarketplace(pluginData, pluginFile) {
    const marketplaceUrl = process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';
    const formData = new FormData();
    formData.append('plugin', pluginFile);
    formData.append('metadata', JSON.stringify(pluginData));

    return axios.post(`${marketplaceUrl}/plugins/upload`, formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // ================== UTILIDADES LOCALES ==================

  /**
   * Guardar plugins instalados en localStorage
   */
  saveInstalledPlugins(plugins) {
    localStorage.setItem('installed_plugins', JSON.stringify(plugins));
  }

  /**
   * Obtener plugins instalados desde localStorage
   */
  getInstalledPlugins() {
    const plugins = localStorage.getItem('installed_plugins');
    return plugins ? JSON.parse(plugins) : [];
  }

  /**
   * Verificar si un plugin está instalado
   */
  isPluginInstalled(pluginName) {
    const installedPlugins = this.getInstalledPlugins();
    return installedPlugins.some(p => p.name === pluginName);
  }

  /**
   * Filtrar plugins por categoría
   */
  filterPluginsByCategory(plugins, category) {
    if (!category || category === 'all') return plugins;
    return plugins.filter(p => p.category === category);
  }

  /**
   * Buscar plugins por término
   */
  searchPlugins(plugins, searchTerm) {
    if (!searchTerm) return plugins;

    const term = searchTerm.toLowerCase();
    return plugins.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.author?.toLowerCase().includes(term)
    );
  }

  /**
   * Ordenar plugins
   */
  sortPlugins(plugins, sortBy = 'name') {
    const sorted = [...plugins];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date':
        return sorted.sort((a, b) => new Date(b.installedAt) - new Date(a.installedAt));
      case 'date_desc':
        return sorted.sort((a, b) => new Date(a.installedAt) - new Date(b.installedAt));
      case 'version':
        return sorted.sort((a, b) => this.compareVersions(a.version, b.version));
      case 'popularity':
        return sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      default:
        return sorted;
    }
  }

  /**
   * Comparar versiones (semantic versioning)
   */
  compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  /**
   * Obtener categorías de plugins
   */
  getPluginCategories() {
    return [
      { value: 'all', label: 'Todos', icon: 'mdi-apps' },
      { value: 'payment', label: 'Pagos', icon: 'mdi-credit-card' },
      { value: 'communication', label: 'Comunicación', icon: 'mdi-message' },
      { value: 'integration', label: 'Integraciones', icon: 'mdi-link-variant' },
      { value: 'reporting', label: 'Reportes', icon: 'mdi-chart-bar' },
      { value: 'security', label: 'Seguridad', icon: 'mdi-shield' },
      { value: 'productivity', label: 'Productividad', icon: 'mdi-lightning-bolt' },
      { value: 'marketing', label: 'Marketing', icon: 'mdi-bullhorn' },
      { value: 'analytics', label: 'Análisis', icon: 'mdi-chart-line' },
      { value: 'automation', label: 'Automatización', icon: 'mdi-robot' },
      { value: 'other', label: 'Otros', icon: 'mdi-dots-horizontal' }
    ];
  }

  /**
   * Validar manifiesto de plugin
   */
  validatePluginManifest(manifest) {
    const required = ['name', 'version', 'description', 'author'];
    const errors = [];

    required.forEach(field => {
      if (!manifest[field]) {
        errors.push(`El campo '${field}' es requerido`);
      }
    });

    if (manifest.version && !this.isValidVersion(manifest.version)) {
      errors.push('Formato de versión inválido. Use semver (ej: 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar formato de versión semántica
   */
  isValidVersion(version) {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Obtener estadísticas de plugins
   */
  async getPluginStats() {
    try {
      const response = await this.getAllPlugins();
      const plugins = response.data.data || [];

      const stats = {
        total: plugins.length,
        active: plugins.filter(p => p.active).length,
        inactive: plugins.filter(p => !p.active).length,
        byCategory: {}
      };

      // Agrupar por categoría
      plugins.forEach(plugin => {
        const category = plugin.category || 'other';
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = 0;
        }
        stats.byCategory[category]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting plugin stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byCategory: {}
      };
    }
  }
}

export default new PluginService();
