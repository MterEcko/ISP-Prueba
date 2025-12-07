const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../config/logger');
const db = require('../../../models');

class JellyfinPlugin {
  constructor() {
    this.client = null;
    this.config = {};
    this.initialized = false;
  }

  static getPluginInfo() {
    return {
      name: 'jellyfin-media',
      version: '1.0.0',
      description: 'Plugin de integracion con Jellyfin Media Server',
      category: 'integration',
      author: 'ISP-Prueba Team',
      capabilities: ['user_management', 'library_access', 'statistics'],
      supportedFeatures: ['auto_provision', 'sso', 'monitoring']
    };
  }

  async onActivate(config) {
    try {
      logger.info('Activando plugin Jellyfin...');

      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuracion invalida: ${validation.errors.join(', ')}`);
      }

      this.config = config;

      await this.testConnection();

      this.initialized = true;
      logger.info('Plugin Jellyfin inicializado correctamente');

      return {
        success: true,
        message: 'Plugin activado correctamente'
      };
    } catch (error) {
      logger.error('Error inicializando Jellyfin:', error);
      throw error;
    }
  }

  async onDeactivate() {
    try {
      logger.info('Desactivando plugin Jellyfin...');

      this.config = {};
      this.initialized = false;

      logger.info('Plugin Jellyfin desactivado');

      return {
        success: true,
        message: 'Plugin desactivado correctamente'
      };
    } catch (error) {
      logger.error('Error desactivando Jellyfin:', error);
      throw error;
    }
  }

  registerRoutes(app) {
    const routes = require('./routes');
    app.use('/api/plugins/jellyfin', routes);
    logger.info('Rutas de Jellyfin registradas');
  }

  validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuracion es requerida'] };
    }

    if (!config.serverUrl) {
      errors.push('URL del servidor es requerida');
    } else {
      try {
        new URL(config.serverUrl);
      } catch {
        errors.push('URL del servidor invalida');
      }
    }

    if (!config.apiKey) {
      errors.push('API Key es requerida');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.config.serverUrl}/System/Info`,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey
          }
        }
      );

      return {
        success: true,
        serverName: response.data.ServerName,
        version: response.data.Version
      };
    } catch (error) {
      throw new Error(`Error conectando con Jellyfin: ${error.message}`);
    }
  }

  async createUser(username, password, email) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const response = await axios.post(
        `${this.config.serverUrl}/Users/New`,
        {
          Name: username,
          Password: password
        },
        {
          headers: {
            'X-Emby-Token': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Usuario Jellyfin creado: ${username}`);

      return {
        success: true,
        userId: response.data.Id,
        username: response.data.Name
      };
    } catch (error) {
      logger.error('Error creando usuario en Jellyfin:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      await axios.post(
        `${this.config.serverUrl}/Users/${userId}`,
        updates,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Usuario Jellyfin actualizado: ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  async assignLibraries(userId, libraryIds) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      await axios.post(
        `${this.config.serverUrl}/Users/${userId}/Policy`,
        {
          EnabledFolders: libraryIds,
          EnableAllFolders: false
        },
        {
          headers: {
            'X-Emby-Token': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Bibliotecas asignadas al usuario ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error asignando bibliotecas:', error);
      throw error;
    }
  }

  async getLibraries() {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const response = await axios.get(
        `${this.config.serverUrl}/Library/VirtualFolders`,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey
          }
        }
      );

      return response.data.map(lib => ({
        id: lib.ItemId,
        name: lib.Name,
        type: lib.CollectionType
      }));
    } catch (error) {
      logger.error('Error obteniendo bibliotecas:', error);
      throw error;
    }
  }

  async suspendUser(userId) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      await axios.post(
        `${this.config.serverUrl}/Users/${userId}/Policy`,
        {
          IsDisabled: true
        },
        {
          headers: {
            'X-Emby-Token': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Usuario Jellyfin suspendido: ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error suspendiendo usuario:', error);
      throw error;
    }
  }

  async activateUser(userId) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      await axios.post(
        `${this.config.serverUrl}/Users/${userId}/Policy`,
        {
          IsDisabled: false
        },
        {
          headers: {
            'X-Emby-Token': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Usuario Jellyfin activado: ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error activando usuario:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      await axios.delete(
        `${this.config.serverUrl}/Users/${userId}`,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey
          }
        }
      );

      logger.info(`Usuario Jellyfin eliminado: ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  async getUserActivity(userId) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const response = await axios.get(
        `${this.config.serverUrl}/user_usage_stats/user_activity/${userId}`,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error obteniendo actividad de usuario:', error);
      return null;
    }
  }

  async onClientActivated(client) {
    if (!this.config.autoProvision) {
      return null;
    }

    try {
      const password = this.generateRandomPassword(this.config.passwordLength || 12);

      const jellyfinUser = await this.createUser(
        client.email,
        password,
        client.email
      );

      const plan = await client.getServicePackage?.() || {};
      const libraries = this.getLibrariesForPlan(plan.name);

      if (libraries.length > 0) {
        await this.assignLibraries(jellyfinUser.userId, libraries);
      }

      await db.Client.update(
        {
          jellyfinUserId: jellyfinUser.userId,
          jellyfinUsername: client.email
        },
        {
          where: { id: client.id }
        }
      );

      if (this.config.sendCredentials) {
        await this.sendCredentialsEmail(client, {
          username: client.email,
          password: password,
          serverUrl: this.config.serverUrl
        });
      }

      logger.info(`Usuario Jellyfin creado automaticamente para cliente ${client.id}`);

      return jellyfinUser;
    } catch (error) {
      logger.error('Error en auto-provision de Jellyfin:', error);
      return null;
    }
  }

  async onClientSuspended(client) {
    if (client.jellyfinUserId) {
      try {
        await this.suspendUser(client.jellyfinUserId);
        logger.info(`Usuario Jellyfin suspendido para cliente ${client.id}`);
      } catch (error) {
        logger.error('Error suspendiendo usuario Jellyfin:', error);
      }
    }
  }

  async onClientActivatedAgain(client) {
    if (client.jellyfinUserId) {
      try {
        await this.activateUser(client.jellyfinUserId);
        logger.info(`Usuario Jellyfin reactivado para cliente ${client.id}`);
      } catch (error) {
        logger.error('Error reactivando usuario Jellyfin:', error);
      }
    }
  }

  getLibrariesForPlan(planName) {
    const planLibraries = {
      'basico': this.config.defaultLibraries || [],
      'estandar': this.config.defaultLibraries || [],
      'premium': this.config.defaultLibraries || [],
      'empresarial': this.config.defaultLibraries || []
    };

    return planLibraries[planName?.toLowerCase()] || this.config.defaultLibraries || [];
  }

  generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';

    const array = new Uint8Array(length);
    crypto.randomFillSync(array);

    for (let i = 0; i < length; i++) {
      password += chars.charAt(array[i] % chars.length);
    }

    return password;
  }

  async sendCredentialsEmail(client, credentials) {
    try {
      if (global.emailService) {
        await global.emailService.send({
          to: client.email,
          subject: 'Acceso a Jellyfin Media Server',
          html: `
            <h2>Bienvenido a Jellyfin</h2>
            <p>Hola ${client.firstName},</p>
            <p>Tu cuenta de Jellyfin ha sido creada. Aqui estan tus credenciales:</p>
            <ul>
              <li><strong>URL:</strong> ${credentials.serverUrl}</li>
              <li><strong>Usuario:</strong> ${credentials.username}</li>
              <li><strong>Contrasena:</strong> ${credentials.password}</li>
            </ul>
            <p>Te recomendamos cambiar tu contrasena al iniciar sesion por primera vez.</p>
          `
        });
      }
    } catch (error) {
      logger.error('Error enviando email de credenciales:', error);
    }
  }

  async getStatistics() {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const usersResponse = await axios.get(
        `${this.config.serverUrl}/Users`,
        {
          headers: {
            'X-Emby-Token': this.config.apiKey
          }
        }
      );

      const totalUsers = usersResponse.data.length;
      const activeUsers = usersResponse.data.filter(u => !u.Policy?.IsDisabled).length;

      return {
        totalUsers,
        activeUsers,
        suspendedUsers: totalUsers - activeUsers
      };
    } catch (error) {
      logger.error('Error obteniendo estadisticas:', error);
      throw error;
    }
  }

  isActive() {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      hasConfig: Object.keys(this.config).length > 0,
      serverUrl: this.config.serverUrl || null,
      autoProvision: this.config.autoProvision || false
    };
  }
}

module.exports = JellyfinPlugin;
