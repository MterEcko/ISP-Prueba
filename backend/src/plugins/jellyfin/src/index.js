const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../config/logger');
const db = require('../../../models'); // Modelos del Core
const JellyfinAccountDef = require('./models/jellyfinAccount.model');
const JellyfinProfileDef = require('./models/jellyfinProfile.model'); // Modelo de Perfiles

class JellyfinPlugin {
  constructor() {
    this.name = 'jellyfin-media';
    this.version = '1.0.0';
    this.config = {};
    this.initialized = false;

    // Inicializar modelos locales del plugin
    this.AccountModel = JellyfinAccountDef(db.sequelize);
    this.ProfileModel = JellyfinProfileDef(db.sequelize);

    // Configurar relaciones (Una Cuenta -> Muchos Perfiles)
    this.AccountModel.hasMany(this.ProfileModel, { foreignKey: 'jellyfinAccountId', as: 'profiles' });
    this.ProfileModel.belongsTo(this.AccountModel, { foreignKey: 'jellyfinAccountId' });
  }

  static getPluginInfo() {
    return {
      name: 'jellyfin-media',
      version: '1.0.0',
      description: 'Integración completa Jellyfin + ISP (Multi-perfil)',
      category: 'entertainment',
      author: 'ISP-Prueba Team',
      capabilities: ['service_provider', 'dashboard_widget', 'user_management'],
      supportedFeatures: ['auto_provision', 'sso', 'monitoring', 'profiles']
    };
  }

  // ==========================================
  // CICLO DE VIDA DEL PLUGIN
  // ==========================================

  async onActivate(config) {
    try {
      logger.info('🔌 Activando plugin Jellyfin...');
      if (!config.serverUrl || !config.apiKey) throw new Error('Falta config');
      
      this.config = config;
      
      // Sync DB
      await this.AccountModel.sync();
      await this.ProfileModel.sync();
      
      try { await this.testConnection(); } catch (e) { logger.warn('Jellyfin no responde:', e.message); }

      this.initialized = true;
      logger.info('✅ Plugin Jellyfin activado');
      return { success: true };
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  async onDeactivate() {
    this.config = {};
    this.initialized = false;
    return { success: true };
  }

  registerRoutes(router) {
    const Controller = require('./controller'); // Importamos la Clase
    const routes = require('./routes');         // Importamos la Función
    
    // Ejecutamos la función de rutas pasándole todo lo necesario
    routes(router, Controller, this); 
    
    return router;
  }


  validateConfig(config) {
    const errors = [];
    if (!config || typeof config !== 'object') return { valid: false, errors: ['Sin configuración'] };
    if (!config.serverUrl) errors.push('Falta serverUrl');
    if (!config.apiKey) errors.push('Falta apiKey');
    return { valid: errors.length === 0, errors };
  }

  // ==========================================
  // LÓGICA DE NEGOCIO PRINCIPAL
  // ==========================================

  /**
   * Provisionar servicio: Crea cuenta principal + Perfil Default + Registro en Core
   */
  async provisionClientService(clientId, password, options = {}) {
    if (!this.initialized) throw new Error('Plugin no inicializado');

    const transaction = await db.sequelize.transaction();

    try {
      // 1. Obtener cliente del Core
      const client = await db.Client.findByPk(clientId, { transaction });
      if (!client) throw new Error('Cliente no encontrado');

      // 2. Generar username base (ej: JuanPerez_50)
      const clean = (s) => s ? s.replace(/[^a-zA-Z0-9]/g, '') : '';
      const baseName = `${clean(client.firstName.split(' ')[0])}${clean(client.lastName.split(' ')[0])}_${client.id}`;

      // 3. Crear el usuario "Principal" en Jellyfin
      const jfUser = await this._apiCreateUser(baseName, password);

      // 4. Guardar Cuenta Principal Local (Tabla Plugin_JellyfinAccounts)
      const account = await this.AccountModel.create({
        clientId: client.id,
        jellyfinUserId: jfUser.id,
        username: baseName,
        hostingType: options.hostingType || 'local',
        isFreeTier: options.isFreeTier || false,
        enableAds: options.enableAds !== undefined ? options.enableAds : true,
        maxScreens: options.maxScreens || 4
      }, { transaction });

      // 5. Crear el primer perfil local "Principal" (Tabla Plugin_JellyfinProfiles)
      await this.ProfileModel.create({
        jellyfinAccountId: account.id,
        jellyfinUserId: jfUser.id,
        name: 'Principal',
        isKid: false
      }, { transaction });

      // 6. Guardar en Super Tabla del Core (ClientService)
      await db.ClientService.create({
        clientId: client.id,
        pluginName: 'jellyfin',
        serviceType: 'entertainment',
        referenceId: jfUser.id,
        status: 'active',
        metadata: {
          username: baseName,
          serverName: 'Local Jellyfin',
          label: 'Jellyfin TV'
        }
      }, { transaction });

      await transaction.commit();
      
      logger.info(`✅ Servicio Jellyfin creado para ${baseName}`);
      
      return {
        success: true,
        data: { username: baseName, jellyfinId: jfUser.id },
        message: 'Servicio activado correctamente con perfil Principal'
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('Error provisionClientService:', error);
      throw error;
    }
  }

  /**
   * Validar acceso para tu App personalizada (Login)
   */
  async validateAppAccess(username) {
    // Buscar en la tabla local del plugin
    const account = await this.AccountModel.findOne({ 
      where: { username },
      include: ['profiles'] // Traer perfiles para que la App sepa cuáles mostrar
    });
    
    if (!account) throw new Error('Usuario no encontrado en registros de Streaming');

    // Verificar estado en el Core (¿Pagó el internet?)
    const client = await db.Client.findByPk(account.clientId);
    
    if (!client || !client.active) {
      throw new Error('Servicio de internet suspendido o inactivo');
    }

    return {
      allowed: true,
      profiles: account.profiles, // Lista de perfiles para la pantalla de selección
      config: {
        showAds: account.enableAds,
        isPremium: account.isFreeTier,
        maxScreens: account.maxScreens,
        hosting: account.hostingType
      }
    };
  }

  /**
   * Eliminar servicio completo
   */
  async removeClientService(jellyfinUserId) {
    if (!this.initialized) throw new Error('Plugin no inicializado');
    try {
      // 1. Borrar usuario principal de Jellyfin (esto borra sus datos allá)
      // Nota: Si creaste sub-usuarios reales en Jellyfin para los perfiles, 
      // deberías iterar y borrarlos todos. Asumimos aquí que borrando el principal basta 
      // o que tienes lógica para borrar los hijos.
      
      // Buscar la cuenta local para obtener todos los IDs de Jellyfin asociados
      const account = await this.AccountModel.findOne({ where: { jellyfinUserId } });
      
      if (account) {
        // Borrar todos los perfiles en Jellyfin
        const profiles = await this.ProfileModel.findAll({ where: { jellyfinAccountId: account.id } });
        for (const p of profiles) {
          try { await this._deleteUserAPI(p.jellyfinUserId); } catch(e) {}
        }
        // Borrar datos locales
        await this.ProfileModel.destroy({ where: { jellyfinAccountId: account.id } });
        await account.destroy();
      } else {
        // Fallback si no está en BD local
        await this._deleteUserAPI(jellyfinUserId);
      }

      // 2. Borrar referencia en Core
      await db.ClientService.destroy({
        where: { pluginName: 'jellyfin', referenceId: jellyfinUserId }
      });

      return { success: true, message: 'Servicio eliminado' };
    } catch (error) { 
      logger.error('Error removeClientService:', error);
      throw error; 
    }
  }

  // ==========================================
  // GESTIÓN DE PERFILES
  // ==========================================

  async createProfile(accountId, profileName, isKid = false) {
    if (!this.initialized) throw new Error('Plugin no activo');

    const account = await this.AccountModel.findByPk(accountId, { include: ['profiles'] });
    if (!account) throw new Error('Cuenta no encontrada');

    if (account.profiles.length >= 5) throw new Error('Límite de perfiles alcanzado');

    // Generar username único para el perfil: BaseName_NombrePerfil
    const cleanName = profileName.replace(/[^a-zA-Z0-9]/g, '');
    const profileUsername = `${account.username}_${cleanName}`;

    // Crear usuario en Jellyfin (Sin password o mismo del padre)
    const jfUser = await this._apiCreateUser(profileUsername, null);

    // Aplicar control parental si es niño
    if (isKid) {
      await this._setParentalControl(jfUser.id);
    }

    // Guardar perfil local
    const profile = await this.ProfileModel.create({
      jellyfinAccountId: account.id,
      jellyfinUserId: jfUser.id,
      name: profileName,
      isKid: isKid
    });

    return { success: true, profile };
  }

  async getProfiles(username) {
    const account = await this.AccountModel.findOne({ 
      where: { username },
      include: ['profiles'] 
    });
    
    if (!account) throw new Error('Cuenta no encontrada');
    
    return account.profiles;
  }

  async deleteProfile(profileId) {
    const profile = await this.ProfileModel.findByPk(profileId);
    if (!profile) throw new Error('Perfil no encontrado');

    // Borrar de Jellyfin
    await this._deleteUserAPI(profile.jellyfinUserId);
    // Borrar local
    await profile.destroy();
    
    return { success: true };
  }

  // ==========================================
  // LLAMADAS API JELLYFIN (Privadas)
  // ==========================================

  async _apiCreateUser(username, password) {
    const headers = { 'X-Emby-Token': this.config.apiKey };
    try {
      const res = await axios.post(`${this.config.serverUrl}/Users/New`, { Name: username, Password: password }, { headers });
      const id = res.data.Id;
      
      if (password) {
        try {
          await axios.post(`${this.config.serverUrl}/Users/${id}/Password`, { CurrentPassword: '', NewPassword: password }, { headers });
        } catch (e) { logger.warn('Set pass warning:', e.message); }
      }
      
      return { id: id, name: username };
    } catch (e) { 
      throw new Error(e.response?.data ? JSON.stringify(e.response.data) : e.message); 
    }
  }

  async _deleteUserAPI(id) {
    try {
      await axios.delete(`${this.config.serverUrl}/Users/${id}`, { headers: { 'X-Emby-Token': this.config.apiKey } });
    } catch (e) {
      if (e.response?.status !== 404) throw e;
    }
  }

  async _setParentalControl(userId) {
    // Bloquear contenido adulto y unrated
    const policy = { MaxParentalRating: 7, BlockUnratedItems: true }; 
    await axios.post(
      `${this.config.serverUrl}/Users/${userId}/Policy`, 
      policy, 
      { headers: { 'X-Emby-Token': this.config.apiKey, 'Content-Type': 'application/json' } }
    );
  }

  // ==========================================
  // API WRAPPERS PÚBLICOS
  // ==========================================

  async assignLibraries(userId, libraryIds) {
    if (!this.initialized) throw new Error('Plugin no activo');
    await axios.post(
      `${this.config.serverUrl}/Users/${userId}/Policy`, 
      { EnabledFolders: libraryIds, EnableAllFolders: false }, 
      { headers: { 'X-Emby-Token': this.config.apiKey, 'Content-Type': 'application/json' } }
    );
    return { success: true };
  }

  async suspendUser(userId) {
    return this._updatePolicy(userId, { IsDisabled: true });
  }

  async activateUser(userId) {
    return this._updatePolicy(userId, { IsDisabled: false });
  }

  async _updatePolicy(userId, policy) {
    if (!this.initialized) throw new Error('Plugin no activo');
    await axios.post(
      `${this.config.serverUrl}/Users/${userId}/Policy`, 
      policy, 
      { headers: { 'X-Emby-Token': this.config.apiKey, 'Content-Type': 'application/json' } }
    );
    return { success: true };
  }

  async getLibraries() {
    if (!this.initialized) throw new Error('Plugin no activo');
    const res = await axios.get(`${this.config.serverUrl}/Library/VirtualFolders`, { headers: { 'X-Emby-Token': this.config.apiKey } });
    return res.data.map(l => ({ id: l.ItemId, name: l.Name }));
  }

  async getStatistics() {
    if (!this.initialized) return { totalUsers: 0 };
    try {
      const res = await axios.get(`${this.config.serverUrl}/Users`, { headers: { 'X-Emby-Token': this.config.apiKey } });
      return { totalUsers: res.data.length };
    } catch (e) { return { error: e.message }; }
  }

  async testConnection() {
    try {
      const res = await axios.get(`${this.config.serverUrl}/System/Info`, { headers: { 'X-Emby-Token': this.config.apiKey } });
      return { success: true, server: res.data.ServerName };
    } catch (error) {
      throw new Error(`Error conectando a Jellyfin: ${error.message}`);
    }
  }

  getStatus() {
    return { initialized: this.initialized, url: this.config.serverUrl };
  }

  // --- MÉTODOS LEGACY / HOOKS ---
  async onClientSuspended(client) {
    logger.info(`Hook: Cliente ${client.id} suspendido. Buscando cuentas Jellyfin para bloquear...`);
    // Lógica para buscar en ClientService y suspender
  }
  
  generateRandomPassword(length = 12) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }
}

module.exports = JellyfinPlugin;