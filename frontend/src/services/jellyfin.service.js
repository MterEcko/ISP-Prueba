const db = require('../models');
const logger = require('../utils/logger');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const moment = require('moment');

class JellyfinService {
  constructor() {
    this.jellyfinClient = null;
    this.jellyfinConfig = {
      url: null,
      apiKey: null,
      defaultLibraries: 'Movies,TV Shows',
      userPolicy: null
    };
    this.jfagoConfig = {
      dbPath: null,
      enabled: false,
      defaultExpirationDays: 7,
      inviteTemplate: 'default'
    };
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio con configuraciones dinámicas
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  async initialize() {
    try {
      logger.info('Inicializando servicio de Jellyfin...');

      // Cargar configuraciones desde base de datos
      await this.loadConfigurations();

      // Validar y establecer conexiones
      const jellyfinStatus = await this.validateJellyfinConnection();
      const jfagoStatus = await this.validateJFAGODatabase();

      // Configurar cliente HTTP para Jellyfin
      if (jellyfinStatus.success) {
        this.setupJellyfinClient();
      }

      this.isInitialized = true;

      logger.info('Servicio de Jellyfin inicializado correctamente');

      return {
        success: true,
        jellyfin: jellyfinStatus,
        jfago: jfagoStatus,
        message: 'Servicio inicializado correctamente'
      };
    } catch (error) {
      logger.error(`Error inicializando servicio de Jellyfin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crea una cuenta de Jellyfin para un cliente
   * @param {number} clientId - ID del cliente
   * @param {Object} accountData - Datos de la cuenta
   * @returns {Promise<Object>} Cuenta creada
   */
  async createClientAccount(clientId, accountData) {
    await this.ensureInitialized();

    try {
      // Validar cliente existe
      const client = await db.Client.findByPk(clientId);
      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // Verificar si ya tiene cuenta
      const existingAccount = await this.getClientJellyfinAccount(clientId);
      if (existingAccount) {
        throw new Error(`Cliente ya tiene cuenta de Jellyfin: ${existingAccount.username}`);
      }

      // Generar datos de cuenta si no se proporcionan
      const username = accountData.username || this.generateUsername(client);
      const password = accountData.password || this.generateSecurePassword();

      // Crear usuario en Jellyfin
      const jellyfinUser = await this.createJellyfinUser({
        name: username,
        password: password,
        enabledLibraries: this.parseLibraries(this.jellyfinConfig.defaultLibraries),
        policy: this.getDefaultUserPolicy()
      });

      // Guardar cuenta en base de datos local
      const accountRecord = await db.JellyfinUser.create({
        clientId: clientId,
        jellyfinId: jellyfinUser.Id,
        username: username,
        status: 'active',
        createdAt: new Date()
      });

      // Vincular con facturación si existe
      await this.linkAccountToBilling(clientId, accountRecord.id);

      logger.info(`Cuenta Jellyfin creada para cliente ${clientId}: ${username}`);

      return {
        success: true,
        data: {
          accountId: accountRecord.id,
          username: username,
          jellyfinId: jellyfinUser.Id,
          status: 'active'
        },
        message: 'Cuenta creada exitosamente'
      };
    } catch (error) {
      logger.error(`Error creando cuenta Jellyfin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera un enlace de invitación temporal
   * @param {number} clientId - ID del cliente
   * @param {Object} inviteOptions - Opciones de la invitación
   * @returns {Promise<Object>} Enlace de invitación
   */
  async generateInvitationLink(clientId, inviteOptions = {}) {
    await this.ensureInitialized();

    try {
      const client = await db.Client.findByPk(clientId);
      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // Configurar opciones de invitación
      const options = {
        expirationDays: inviteOptions.expirationDays || this.jfagoConfig.defaultExpirationDays,
        maxUses: inviteOptions.maxUses || 1,
        libraries: inviteOptions.libraries || this.jellyfinConfig.defaultLibraries,
        userPolicy: inviteOptions.userPolicy || this.getDefaultUserPolicy()
      };

      let invitationLink;
      let inviteRecord;

      if (this.jfagoConfig.enabled && this.jfagoConfig.dbPath) {
        // Crear invitación en JFA-GO
        const jfagoInvite = await this.createJFAGOInvitation(clientId, options);
        invitationLink = `${this.getBaseUrl()}/invite/${jfagoInvite.code}`;
        
        // Guardar referencia en nuestra BD
        inviteRecord = await this.saveInvitationRecord(clientId, jfagoInvite, options);
      } else {
        // Crear invitación propia
        const customInvite = await this.createCustomInvitation(clientId, options);
        invitationLink = `${this.getBaseUrl()}/register/${customInvite.token}`;
        inviteRecord = customInvite;
      }

      logger.info(`Enlace de invitación generado para cliente ${clientId}`);

      return {
        success: true,
        data: {
          invitationId: inviteRecord.id,
          link: invitationLink,
          expiresAt: inviteRecord.expiresAt,
          maxUses: options.maxUses,
          usesRemaining: options.maxUses
        },
        message: 'Enlace de invitación generado'
      };
    } catch (error) {
      logger.error(`Error generando enlace de invitación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspende una cuenta de Jellyfin
   * @param {number} clientId - ID del cliente
   * @param {string} reason - Razón de la suspensión
   * @returns {Promise<Object>} Resultado de la suspensión
   */
  async suspendAccount(clientId, reason = 'Suspensión por pago') {
    await this.ensureInitialized();

    try {
      const account = await this.getClientJellyfinAccount(clientId);
      if (!account) {
        throw new Error(`Cliente ${clientId} no tiene cuenta de Jellyfin`);
      }

      // Suspender en Jellyfin
      await this.updateJellyfinUserPolicy(account.jellyfinId, {
        IsDisabled: true,
        DisablePremiumFeatures: true
      });

      // Actualizar estado en BD local
      await db.JellyfinUser.update({
        status: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: reason
      }, {
        where: { clientId: clientId }
      });

      logger.info(`Cuenta Jellyfin suspendida para cliente ${clientId}: ${reason}`);

      return {
        success: true,
        message: 'Cuenta suspendida exitosamente',
        suspendedAt: new Date(),
        reason: reason
      };
    } catch (error) {
      logger.error(`Error suspendiendo cuenta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactiva una cuenta de Jellyfin
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado de la reactivación
   */
  async reactivateAccount(clientId) {
    await this.ensureInitialized();

    try {
      const account = await this.getClientJellyfinAccount(clientId);
      if (!account) {
        throw new Error(`Cliente ${clientId} no tiene cuenta de Jellyfin`);
      }

      // Reactivar en Jellyfin
      await this.updateJellyfinUserPolicy(account.jellyfinId, {
        IsDisabled: false,
        DisablePremiumFeatures: false
      });

      // Actualizar estado en BD local
      await db.JellyfinUser.update({
        status: 'active',
        suspendedAt: null,
        suspensionReason: null,
        reactivatedAt: new Date()
      }, {
        where: { clientId: clientId }
      });

      logger.info(`Cuenta Jellyfin reactivada para cliente ${clientId}`);

      return {
        success: true,
        message: 'Cuenta reactivada exitosamente',
        reactivatedAt: new Date()
      };
    } catch (error) {
      logger.error(`Error reactivando cuenta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza cuentas con estado de facturación
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAccountsWithBilling() {
    await this.ensureInitialized();

    try {
      // Obtener clientes con facturación
      const clientsBilling = await db.ClientBilling.findAll({
        include: [
          { model: db.Client, as: 'client' },
          { model: db.JellyfinUser, as: 'jellyfinAccount', required: false }
        ]
      });

      const results = [];

      for (const billing of clientsBilling) {
        try {
          const shouldBeActive = billing.clientStatus === 'active';
          const hasAccount = !!billing.jellyfinAccount;
          const isCurrentlyActive = hasAccount && billing.jellyfinAccount.status === 'active';

          if (shouldBeActive && !hasAccount) {
            // Crear cuenta si debe estar activo pero no la tiene
            const result = await this.createClientAccount(billing.clientId, {});
            results.push({ clientId: billing.clientId, action: 'created', success: true, result });
          } else if (shouldBeActive && !isCurrentlyActive) {
            // Reactivar si debe estar activo pero está suspendido
            const result = await this.reactivateAccount(billing.clientId);
            results.push({ clientId: billing.clientId, action: 'reactivated', success: true, result });
          } else if (!shouldBeActive && isCurrentlyActive) {
            // Suspender si no debe estar activo pero está activo
            const result = await this.suspendAccount(billing.clientId, 'Suspensión automática por estado de pago');
            results.push({ clientId: billing.clientId, action: 'suspended', success: true, result });
          } else {
            // Sin cambios necesarios
            results.push({ clientId: billing.clientId, action: 'no_change', success: true });
          }
        } catch (error) {
          results.push({ 
            clientId: billing.clientId, 
            action: 'error', 
            success: false, 
            error: error.message 
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info(`Sincronización completada: ${successful} exitosos, ${failed} fallidos`);

      return {
        success: true,
        data: {
          totalProcessed: results.length,
          successful: successful,
          failed: failed,
          details: results
        },
        message: 'Sincronización completada'
      };
    } catch (error) {
      logger.error(`Error sincronizando cuentas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de Jellyfin
   * @returns {Promise<Object>} Estadísticas
   */
  async getJellyfinStatistics() {
    await this.ensureInitialized();

    try {
      // Estadísticas locales
      const localStats = await this.getLocalStatistics();

      // Estadísticas del servidor Jellyfin
      const serverStats = await this.getJellyfinServerStats();

      return {
        success: true,
        data: {
          local: localStats,
          server: serverStats,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configura parámetros de Jellyfin
   * @param {Object} config - Nueva configuración
   * @returns {Promise<Object>} Resultado de la configuración
   */
  async updateConfiguration(config) {
    try {
      const updates = [];

      // Actualizar configuraciones de Jellyfin
      if (config.jellyfin) {
        for (const [key, value] of Object.entries(config.jellyfin)) {
          const configKey = `JELLYFIN_${key.toUpperCase()}`;
          await this.updateSystemConfig(configKey, value);
          updates.push(configKey);
        }
      }

      // Actualizar configuraciones de JFA-GO
      if (config.jfago) {
        for (const [key, value] of Object.entries(config.jfago)) {
          const configKey = `JFAGO_${key.toUpperCase()}`;
          await this.updateSystemConfig(configKey, value);
          updates.push(configKey);
        }
      }

      // Reinicializar servicio con nuevas configuraciones
      await this.initialize();

      logger.info(`Configuración actualizada: ${updates.join(', ')}`);

      return {
        success: true,
        message: 'Configuración actualizada exitosamente',
        updatedKeys: updates
      };
    } catch (error) {
      logger.error(`Error actualizando configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prueba la conexión con Jellyfin
   * @returns {Promise<Object>} Resultado de la prueba
   */
  async testJellyfinConnection() {
    try {
      if (!this.jellyfinConfig.url || !this.jellyfinConfig.apiKey) {
        throw new Error('URL o API Key de Jellyfin no configurados');
      }

      const response = await axios.get(`${this.jellyfinConfig.url}/System/Info`, {
        headers: {
          'X-MediaBrowser-Token': this.jellyfinConfig.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        data: {
          serverName: response.data.ServerName,
          version: response.data.Version,
          id: response.data.Id
        },
        message: 'Conexión exitosa con Jellyfin'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error conectando con Jellyfin'
      };
    }
  }

  /**
   * Auto-detecta la ubicación de JFA-GO
   * @returns {Promise<Object>} Rutas encontradas
   */
  async autoDetectJFAGO() {
    const commonPaths = [
      './jfa-go/data/jfa-go.db',
      './data/jfa-go.db',
      '/opt/jfa-go/data/jfa-go.db',
      '/var/lib/jfa-go/jfa-go.db',
      '../jfa-go/data/jfa-go.db',
      '../../jfa-go/data/jfa-go.db',
      './jfa-go.db'
    ];

    const foundPaths = [];

    for (const testPath of commonPaths) {
      try {
        await fs.access(testPath);
        foundPaths.push(testPath);
      } catch (error) {
        // Archivo no existe, continuar
      }
    }

    return {
      success: foundPaths.length > 0,
      data: foundPaths,
      message: foundPaths.length > 0 ? 
        `${foundPaths.length} instalaciones de JFA-GO encontradas` : 
        'No se encontraron instalaciones de JFA-GO'
    };
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Carga configuraciones desde la base de datos
   * @private
   */
  async loadConfigurations() {
    // Configuraciones de Jellyfin
    this.jellyfinConfig.url = await this.getSystemConfig('JELLYFIN_API_URL', 'http://localhost:8096');
    this.jellyfinConfig.apiKey = await this.getSystemConfig('JELLYFIN_API_KEY', '');
    this.jellyfinConfig.defaultLibraries = await this.getSystemConfig('JELLYFIN_DEFAULT_LIBRARIES', 'Movies,TV Shows');

    // Configuraciones de JFA-GO
    this.jfagoConfig.enabled = await this.getSystemConfig('JFAGO_ENABLED', 'false') === 'true';
    this.jfagoConfig.dbPath = await this.getSystemConfig('JFAGO_DATABASE_PATH', '');
    this.jfagoConfig.defaultExpirationDays = parseInt(await this.getSystemConfig('JFAGO_DEFAULT_EXPIRATION_DAYS', '7'));
  }

  /**
   * Obtiene configuración del sistema
   * @private
   */
  async getSystemConfig(key, defaultValue = null) {
    try {
      const config = await db.SystemConfiguration.findOne({
        where: { configKey: key }
      });
      return config?.configValue || defaultValue;
    } catch (error) {
      logger.warn(`Error obteniendo configuración ${key}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Actualiza configuración del sistema
   * @private
   */
  async updateSystemConfig(key, value) {
    await db.SystemConfiguration.upsert({
      configKey: key,
      configValue: value.toString(),
      configType: 'string',
      module: 'jellyfin'
    });
  }

  /**
   * Valida conexión con Jellyfin
   * @private
   */
  async validateJellyfinConnection() {
    if (!this.jellyfinConfig.url || !this.jellyfinConfig.apiKey) {
      return {
        success: false,
        error: 'URL o API Key no configurados',
        configured: false
      };
    }

    return await this.testJellyfinConnection();
  }

  /**
   * Valida base de datos de JFA-GO
   * @private
   */
  async validateJFAGODatabase() {
    if (!this.jfagoConfig.enabled) {
      return {
        success: true,
        message: 'JFA-GO deshabilitado',
        enabled: false
      };
    }

    if (!this.jfagoConfig.dbPath) {
      const autoDetect = await this.autoDetectJFAGO();
      if (autoDetect.success && autoDetect.data.length > 0) {
        this.jfagoConfig.dbPath = autoDetect.data[0];
        await this.updateSystemConfig('JFAGO_DATABASE_PATH', this.jfagoConfig.dbPath);
      } else {
        return {
          success: false,
          error: 'Base de datos de JFA-GO no encontrada',
          enabled: true,
          configured: false
        };
      }
    }

    try {
      await fs.access(this.jfagoConfig.dbPath);
      return {
        success: true,
        message: 'Base de datos de JFA-GO accesible',
        enabled: true,
        configured: true,
        path: this.jfagoConfig.dbPath
      };
    } catch (error) {
      return {
        success: false,
        error: `No se puede acceder a la base de datos: ${error.message}`,
        enabled: true,
        configured: false
      };
    }
  }

  /**
   * Configura cliente HTTP de Jellyfin
   * @private
   */
  setupJellyfinClient() {
    this.jellyfinClient = axios.create({
      baseURL: this.jellyfinConfig.url,
      headers: {
        'X-MediaBrowser-Token': this.jellyfinConfig.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Crea usuario en Jellyfin
   * @private
   */
  async createJellyfinUser(userData) {
    const response = await this.jellyfinClient.post('/Users', {
      Name: userData.name,
      Password: userData.password
    });

    const userId = response.data.Id;

    // Configurar política del usuario
    if (userData.policy) {
      await this.updateJellyfinUserPolicy(userId, userData.policy);
    }

    // Configurar bibliotecas
    if (userData.enabledLibraries) {
      await this.setUserLibraries(userId, userData.enabledLibraries);
    }

    return response.data;
  }

  /**
   * Actualiza política de usuario en Jellyfin
   * @private
   */
  async updateJellyfinUserPolicy(userId, policy) {
    await this.jellyfinClient.post(`/Users/${userId}/Policy`, policy);
  }

  /**
   * Configura bibliotecas de usuario
   * @private
   */
  async setUserLibraries(userId, libraries) {
    // Obtener todas las bibliotecas disponibles
    const librariesResponse = await this.jellyfinClient.get('/Library/VirtualFolders');
    const availableLibraries = librariesResponse.data;

    // Filtrar bibliotecas habilitadas
    const enabledLibraryIds = availableLibraries
      .filter(lib => libraries.includes(lib.Name))
      .map(lib => lib.ItemId);

    // Aplicar configuración
    await this.jellyfinClient.post(`/Users/${userId}/Policy`, {
      EnabledFolders: enabledLibraryIds
    });
  }

  /**
   * Obtiene cuenta de Jellyfin de un cliente
   * @private
   */
  async getClientJellyfinAccount(clientId) {
    return await db.JellyfinUser.findOne({
      where: { clientId: clientId }
    });
  }

  /**
   * Crea invitación en JFA-GO
   * @private
   */
  async createJFAGOInvitation(clientId, options) {
    return new Promise((resolve, reject) => {
      const dbConnection = new sqlite3.Database(this.jfagoConfig.dbPath, (err) => {
        if (err) {
          reject(new Error(`Error conectando a JFA-GO DB: ${err.message}`));
          return;
        }

        const inviteCode = this.generateInviteCode();
        const expiresAt = moment().add(options.expirationDays, 'days').unix();

        const query = `
          INSERT INTO invites (code, created, expires, uses_remaining, profile_id, label)
          VALUES (?, ?, ?, ?, 'default', ?)
        `;

        dbConnection.run(query, [
          inviteCode,
          moment().unix(),
          expiresAt,
          options.maxUses,
          `Cliente-${clientId}`
        ], function(err) {
          dbConnection.close();
          
          if (err) {
            reject(new Error(`Error creando invitación en JFA-GO: ${err.message}`));
          } else {
            resolve({
              id: this.lastID,
              code: inviteCode,
              expiresAt: moment.unix(expiresAt).toDate(),
              usesRemaining: options.maxUses
            });
          }
        });
      });
    });
  }

  /**
   * Crea invitación personalizada
   * @private
   */
  async createCustomInvitation(clientId, options) {
    const token = this.generateSecureToken();
    const expiresAt = moment().add(options.expirationDays, 'days').toDate();

    const invitation = await db.JellyfinInvitation.create({
      clientId: clientId,
      token: token,
      expiresAt: expiresAt,
      maxUses: options.maxUses,
      usesRemaining: options.maxUses,
      libraries: options.libraries,
      userPolicy: JSON.stringify(options.userPolicy),
      status: 'active'
    });

    return invitation;
  }

  /**
   * Guarda registro de invitación
   * @private
   */
  async saveInvitationRecord(clientId, jfagoInvite, options) {
    return await db.JellyfinInvitation.create({
      clientId: clientId,
      jfagoInviteId: jfagoInvite.id,
      token: jfagoInvite.code,
      expiresAt: jfagoInvite.expiresAt,
      maxUses: options.maxUses,
      usesRemaining: options.maxUses,
      libraries: options.libraries,
      userPolicy: JSON.stringify(options.userPolicy),
      status: 'active',
      isJfagoInvite: true
    });
  }

  /**
   * Vincula cuenta con facturación
   * @private
   */
  async linkAccountToBilling(clientId, accountId) {
    try {
      await db.ClientBilling.update({
        jellyfinAccountId: accountId
      }, {
        where: { clientId: clientId }
      });
    } catch (error) {
      logger.warn(`No se pudo vincular cuenta Jellyfin con facturación para cliente ${clientId}: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas locales
   * @private
   */
  async getLocalStatistics() {
    const totalAccounts = await db.JellyfinUser.count();
    const activeAccounts = await db.JellyfinUser.count({ where: { status: 'active' } });
    const suspendedAccounts = await db.JellyfinUser.count({ where: { status: 'suspended' } });
    const pendingInvitations = await db.JellyfinInvitation.count({ 
      where: { 
        status: 'active',
        expiresAt: { [db.Sequelize.Op.gt]: new Date() }
      } 
    });

    return {
      totalAccounts,
      activeAccounts,
      suspendedAccounts,
      pendingInvitations
    };
  }

  /**
   * Obtiene estadísticas del servidor Jellyfin
   * @private
   */
  async getJellyfinServerStats() {
    try {
      const [usersResponse, librariesResponse] = await Promise.all([
        this.jellyfinClient.get('/Users'),
        this.jellyfinClient.get('/Library/VirtualFolders')
      ]);

      return {
        totalUsers: usersResponse.data.length,
        totalLibraries: librariesResponse.data.length,
        libraries: librariesResponse.data.map(lib => ({
          name: lib.Name,
          type: lib.CollectionType
        }))
      };
    } catch (error) {
      logger.warn(`Error obteniendo estadísticas del servidor: ${error.message}`);
      return {
        totalUsers: 0,
        totalLibraries: 0,
        libraries: []
      };
    }
  }

  /**
   * Genera nombre de usuario único
   * @private
   */
  generateUsername(client) {
    const base = `${client.firstName}${client.lastName}`.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}${suffix}`;
  }

  /**
   * Genera contraseña segura
   * @private
   */
  generateSecurePassword() {
    return crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Genera código de invitación
   * @private
   */
  generateInviteCode() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Genera token seguro
   * @private
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Obtiene política de usuario por defecto
   * @private
   */
  getDefaultUserPolicy() {
    return {
      IsAdministrator: false,
      IsHidden: false,
      IsDisabled: false,
      EnableRemoteControlOfOtherUsers: false,
      EnableSharedDeviceControl: false,
      EnableRemoteAccess: true,
      EnableLiveTvManagement: false,
      EnableLiveTvAccess: true,
      EnableMediaPlayback: true,
      EnableAudioPlaybackTranscoding: true,
      EnableVideoPlaybackTranscoding: true,
      EnablePlaybackRemuxing: true,
      EnableContentDeletion: false,
      EnableContentDownloading: false,
      EnableSyncTranscoding: false,
      EnableMediaConversion: false,
      EnabledDevices: [],
      EnableAllDevices: true,
      BlockedTags: [],
      EnabledChannels: [],
      EnableAllChannels: true,
      EnabledFolders: [],
      EnableAllFolders: false,
      InvalidLoginAttemptCount: 0,
      EnablePublicSharing: false
    };
  }

  /**
   * Parsea bibliotecas desde string
   * @private
   */
  parseLibraries(librariesString) {
    return librariesString.split(',').map(lib => lib.trim()).filter(lib => lib.length > 0);
  }

  /**
   * Obtiene URL base del sistema
   * @private
   */
  getBaseUrl() {
    // Esto debería venir de configuración del sistema
    return process.env.BASE_URL || 'http://localhost:8080';
  }

  /**
   * Asegura que el servicio esté inicializado
   * @private
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Procesa registro desde invitación JFA-GO
   * @param {string} inviteCode - Código de invitación
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Resultado del registro
   */
  async processJFAGORegistration(inviteCode, userData) {
    try {
      // Verificar invitación en JFA-GO DB
      const invitation = await this.getJFAGOInvitation(inviteCode);
      if (!invitation) {
        throw new Error('Código de invitación inválido o expirado');
      }

      // Buscar registro en nuestra BD
      const inviteRecord = await db.JellyfinInvitation.findOne({
        where: { 
          token: inviteCode,
          status: 'active',
          expiresAt: { [db.Sequelize.Op.gt]: new Date() }
        }
      });

      if (!inviteRecord) {
        throw new Error('Invitación no encontrada en el sistema');
      }

      // Crear cuenta en Jellyfin
      const jellyfinUser = await this.createJellyfinUser({
        name: userData.username,
        password: userData.password,
        enabledLibraries: this.parseLibraries(inviteRecord.libraries),
        policy: JSON.parse(inviteRecord.userPolicy || '{}')
      });

      // Guardar cuenta en BD local
      const accountRecord = await db.JellyfinUser.create({
        clientId: inviteRecord.clientId,
        jellyfinId: jellyfinUser.Id,
        username: userData.username,
        status: 'active',
        createdViaInvite: true,
        invitationId: inviteRecord.id
      });

      // Marcar invitación como usada
      await this.markInvitationAsUsed(inviteRecord.id);

      // Marcar en JFA-GO DB también
      await this.markJFAGOInvitationAsUsed(inviteCode);

      logger.info(`Registro completado desde invitación JFA-GO: ${userData.username}`);

      return {
        success: true,
        data: {
          accountId: accountRecord.id,
          username: userData.username,
          jellyfinId: jellyfinUser.Id,
          clientId: inviteRecord.clientId
        },
        message: 'Registro completado exitosamente'
      };
    } catch (error) {
      logger.error(`Error procesando registro JFA-GO: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene invitación de JFA-GO
   * @private
   */
  async getJFAGOInvitation(inviteCode) {
    return new Promise((resolve, reject) => {
      const dbConnection = new sqlite3.Database(this.jfagoConfig.dbPath, (err) => {
        if (err) {
          reject(new Error(`Error conectando a JFA-GO DB: ${err.message}`));
          return;
        }

        const query = `
          SELECT * FROM invites 
          WHERE code = ? AND uses_remaining > 0 AND expires > ?
        `;

        dbConnection.get(query, [inviteCode, moment().unix()], (err, row) => {
          dbConnection.close();
          
          if (err) {
            reject(new Error(`Error consultando invitación: ${err.message}`));
          } else {
            resolve(row);
          }
        });
      });
    });
  }

  /**
   * Marca invitación JFA-GO como usada
   * @private
   */
  async markJFAGOInvitationAsUsed(inviteCode) {
    return new Promise((resolve, reject) => {
      const dbConnection = new sqlite3.Database(this.jfagoConfig.dbPath, (err) => {
        if (err) {
          reject(new Error(`Error conectando a JFA-GO DB: ${err.message}`));
          return;
        }

        const query = `
          UPDATE invites 
          SET uses_remaining = uses_remaining - 1
          WHERE code = ?
        `;

        dbConnection.run(query, [inviteCode], function(err) {
          dbConnection.close();
          
          if (err) {
            reject(new Error(`Error actualizando invitación: ${err.message}`));
          } else {
            resolve(this.changes);
          }
        });
      });
    });
  }

  /**
   * Marca invitación local como usada
   * @private
   */
  async markInvitationAsUsed(invitationId) {
    await db.JellyfinInvitation.update({
      usesRemaining: db.Sequelize.literal('uses_remaining - 1'),
      lastUsedAt: new Date(),
      status: db.Sequelize.literal(`CASE WHEN uses_remaining <= 1 THEN 'completed' ELSE 'active' END`)
    }, {
      where: { id: invitationId }
    });
  }

  /**
   * Obtiene historial de invitaciones
   * @param {number} clientId - ID del cliente (opcional)
   * @returns {Promise<Object>} Historial de invitaciones
   */
  async getInvitationHistory(clientId = null) {
    try {
      const whereClause = clientId ? { clientId: clientId } : {};

      const invitations = await db.JellyfinInvitation.findAll({
        where: whereClause,
        include: [{
          model: db.Client,
          attributes: ['firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: invitations.map(inv => ({
          id: inv.id,
          clientId: inv.clientId,
          clientName: inv.Client ? `${inv.Client.firstName} ${inv.Client.lastName}` : 'N/A',
          token: inv.token.substring(0, 8) + '...', // Solo mostrar primeros caracteres
          status: inv.status,
          maxUses: inv.maxUses,
          usesRemaining: inv.usesRemaining,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          lastUsedAt: inv.lastUsedAt,
          isJfagoInvite: inv.isJfagoInvite
        }))
      };
    } catch (error) {
      logger.error(`Error obteniendo historial de invitaciones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpia invitaciones expiradas
   * @returns {Promise<Object>} Resultado de la limpieza
   */
  async cleanupExpiredInvitations() {
    try {
      const expiredCount = await db.JellyfinInvitation.update({
        status: 'expired'
      }, {
        where: {
          status: 'active',
          expiresAt: { [db.Sequelize.Op.lt]: new Date() }
        }
      });

      logger.info(`${expiredCount[0]} invitaciones marcadas como expiradas`);

      return {
        success: true,
        data: { expiredCount: expiredCount[0] },
        message: 'Limpieza de invitaciones completada'
      };
    } catch (error) {
      logger.error(`Error limpiando invitaciones expiradas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene usuarios activos de Jellyfin
   * @returns {Promise<Object>} Lista de usuarios activos
   */
  async getActiveUsers() {
    await this.ensureInitialized();

    try {
      const sessions = await this.jellyfinClient.get('/Sessions');
      const activeUsers = sessions.data.filter(session => 
        session.UserId && session.NowPlayingItem
      );

      return {
        success: true,
        data: {
          totalActiveSessions: activeUsers.length,
          activeUsers: activeUsers.map(session => ({
            userId: session.UserId,
            username: session.UserName,
            deviceName: session.DeviceName,
            client: session.Client,
            nowPlaying: {
              title: session.NowPlayingItem?.Name,
              type: session.NowPlayingItem?.Type,
              progress: session.PlayState?.PositionTicks
            }
          }))
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo usuarios activos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reinicia todas las sesiones de un usuario
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado de la operación
   */
  async kickUserSessions(clientId) {
    await this.ensureInitialized();

    try {
      const account = await this.getClientJellyfinAccount(clientId);
      if (!account) {
        throw new Error(`Cliente ${clientId} no tiene cuenta de Jellyfin`);
      }

      // Obtener sesiones del usuario
      const sessions = await this.jellyfinClient.get('/Sessions');
      const userSessions = sessions.data.filter(session => 
        session.UserId === account.jellyfinId
      );

      // Cerrar cada sesión
      for (const session of userSessions) {
        await this.jellyfinClient.delete(`/Sessions/${session.Id}`);
      }

      logger.info(`${userSessions.length} sesiones cerradas para cliente ${clientId}`);

      return {
        success: true,
        data: { sessionsKicked: userSessions.length },
        message: 'Sesiones cerradas exitosamente'
      };
    } catch (error) {
      logger.error(`Error cerrando sesiones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene información detallada de una cuenta
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Información de la cuenta
   */
  async getAccountDetails(clientId) {
    await this.ensureInitialized();

    try {
      const account = await db.JellyfinUser.findOne({
        where: { clientId: clientId },
        include: [{
          model: db.Client,
          attributes: ['firstName', 'lastName', 'email', 'active']
        }]
      });

      if (!account) {
        return {
          success: false,
          message: 'Cliente no tiene cuenta de Jellyfin'
        };
      }

      // Obtener información del servidor Jellyfin
      let jellyfinInfo = null;
      try {
        const userResponse = await this.jellyfinClient.get(`/Users/${account.jellyfinId}`);
        jellyfinInfo = {
          id: userResponse.data.Id,
          name: userResponse.data.Name,
          lastLoginDate: userResponse.data.LastLoginDate,
          lastActivityDate: userResponse.data.LastActivityDate,
          policy: userResponse.data.Policy
        };
      } catch (error) {
        logger.warn(`No se pudo obtener info de Jellyfin para usuario ${account.jellyfinId}`);
      }

      return {
        success: true,
        data: {
          local: {
            id: account.id,
            clientId: account.clientId,
            username: account.username,
            status: account.status,
            createdAt: account.createdAt,
            suspendedAt: account.suspendedAt,
            suspensionReason: account.suspensionReason
          },
          client: account.Client,
          jellyfin: jellyfinInfo
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo detalles de cuenta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza configuración de bibliotecas para un usuario
   * @param {number} clientId - ID del cliente
   * @param {Array} libraries - Bibliotecas a habilitar
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateUserLibraries(clientId, libraries) {
    await this.ensureInitialized();

    try {
      const account = await this.getClientJellyfinAccount(clientId);
      if (!account) {
        throw new Error(`Cliente ${clientId} no tiene cuenta de Jellyfin`);
      }

      await this.setUserLibraries(account.jellyfinId, libraries);

      logger.info(`Bibliotecas actualizadas para cliente ${clientId}: ${libraries.join(', ')}`);

      return {
        success: true,
        data: { libraries: libraries },
        message: 'Bibliotecas actualizadas exitosamente'
      };
    } catch (error) {
      logger.error(`Error actualizando bibliotecas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera reporte de uso de Jellyfin
   * @param {string} period - Período del reporte (week, month, year)
   * @returns {Promise<Object>} Reporte de uso
   */
  async generateUsageReport(period = 'month') {
    try {
      const startDate = moment().subtract(1, period).toDate();
      const endDate = new Date();

      // Estadísticas locales
      const accountsCreated = await db.JellyfinUser.count({
        where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
      });

      const suspensions = await db.JellyfinUser.count({
        where: { 
          suspendedAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        }
      });

      const invitationsGenerated = await db.JellyfinInvitation.count({
        where: { createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] } }
      });

      const invitationsUsed = await db.JellyfinInvitation.count({
        where: { 
          lastUsedAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        }
      });

      // Estadísticas del servidor (si está disponible)
      let serverStats = null;
      try {
        const activities = await this.jellyfinClient.get('/System/ActivityLog', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 1000
          }
        });
        
        serverStats = {
          totalActivities: activities.data.Items?.length || 0,
          loginActivities: activities.data.Items?.filter(item => 
            item.Type === 'AuthenticationSucceeded'
          ).length || 0
        };
      } catch (error) {
        logger.warn('No se pudieron obtener estadísticas del servidor Jellyfin');
      }

      return {
        success: true,
        data: {
          period: period,
          dateRange: { startDate, endDate },
          accounts: {
            created: accountsCreated,
            suspended: suspensions
          },
          invitations: {
            generated: invitationsGenerated,
            used: invitationsUsed,
            conversionRate: invitationsGenerated > 0 ? 
              (invitationsUsed / invitationsGenerated * 100) : 0
          },
          server: serverStats
        }
      };
    } catch (error) {
      logger.error(`Error generando reporte de uso: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new JellyfinService();