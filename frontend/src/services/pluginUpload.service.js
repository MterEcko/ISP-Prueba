import api from './api';

const pluginUploadService = {
  /**
   * Upload plugin ZIP file
   */
  async uploadPlugin(file, options = {}) {
    const formData = new FormData();
    formData.append('plugin', file);

    if (options.publish) {
      formData.append('publish', 'true');
    }

    if (options.update) {
      formData.append('update', 'true');
    }

    const response = await api.post('/plugin-upload/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * Get all uploaded plugins
   */
  async getAllPlugins(filters = {}) {
    const params = new URLSearchParams();

    if (filters.category) params.append('category', filters.category);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

    const response = await api.get(`/plugin-upload?${params.toString()}`);
    return response.data;
  },

  /**
   * Get plugin by ID
   */
  async getPluginById(pluginId) {
    const response = await api.get(`/plugin-upload/${pluginId}`);
    return response.data;
  },

  /**
   * Update plugin status (publish/unpublish)
   */
  async updatePluginStatus(pluginId, isActive) {
    const response = await api.put(`/plugin-upload/${pluginId}/status`, {
      isActive
    });
    return response.data;
  },

  /**
   * Delete plugin
   */
  async deletePlugin(pluginId) {
    const response = await api.delete(`/plugin-upload/${pluginId}`);
    return response.data;
  },

  /**
   * Validate manifest JSON
   */
  async validateManifest(manifest) {
    const response = await api.post('/plugin-upload/validate-manifest', manifest);
    return response.data;
  },

  /**
   * Parse ZIP file and extract manifest (client-side preview)
   */
  async parseZipFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          // Aquí podríamos usar jszip para leer el ZIP en el cliente
          // Por ahora solo retornamos información básica del archivo
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Validate manifest structure
   */
  validateManifestStructure(manifest) {
    const requiredFields = ['name', 'version', 'description', 'author'];
    const errors = [];

    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push(`Campo requerido faltante: ${field}`);
      }
    }

    // Validar formato de versión
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Formato de versión inválido. Use formato semver (ej: 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export default pluginUploadService;
