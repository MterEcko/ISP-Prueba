const logger = require('../../../config/logger');
const db = require('../../../models');
const Client = db.Client;
const ClientService = db.ClientService;

class JellyfinController {
  
  constructor(pluginInstance) {
    if (!pluginInstance) throw new Error('Controller requiere instancia del plugin');
    this.plugin = pluginInstance;
  }

  /**
   * PROVISIONAMIENTO: Crea cuenta + Perfil Principal + Registro Core
   */
  async provisionClient(req, res) {
    const transaction = await db.sequelize.transaction();
    try {
      const { clientId, password, options } = req.body;

      if (!clientId || !password) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
      }

      const client = await Client.findByPk(clientId, { transaction });
      if (!client) throw new Error('Cliente no encontrado');

      // Generar usuario
      const clean = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : '';
      const username = `${clean(client.firstName.split(' ')[0])}${clean(client.lastName.split(' ')[0])}_${client.id}`;

      // Llamar al servicio (this.plugin)
      const jfResult = await this.plugin.provisionClientService(clientId, password, options || {}, transaction);

      // (Nota: provisionClientService ya maneja la creación en DB si le pasas la transacción, 
      // pero si tu lógica en index.js maneja su propia transacción, ajusta según corresponda.
      // Asumiremos que index.js maneja la lógica completa como lo definimos antes).

      // Si index.js devuelve la data final, respondemos:
      res.status(201).json(jfResult);

    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      logger.error('Error provisionClient:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PERFILES
   */
  async createProfile(req, res) {
    try {
      const { accountId, name, isKid } = req.body;
      const result = await this.plugin.createProfile(accountId, name, isKid);
      res.status(201).json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async getProfiles(req, res) {
    try {
      const { username } = req.query;
      const profiles = await this.plugin.getProfiles(username);
      res.json({ success: true, profiles });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async deleteProfile(req, res) {
    try {
      const result = await this.plugin.deleteProfile(req.params.profileId);
      res.json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  /**
   * APP EXTERNA
   */
  async validateAppAccess(req, res) {
    try {
      const { username } = req.body;
      const result = await this.plugin.validateAppAccess(username);
      res.json({ success: true, ...result });
    } catch (e) { res.status(403).json({ success: false, message: e.message }); }
  }

  // --- ADMINISTRACIÓN ---

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const result = await this.plugin.removeClientService(userId);
      res.json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async assignLibraries(req, res) {
    try {
      await this.plugin.assignLibraries(req.body.referenceId, req.body.libraryIds);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async suspendUser(req, res) {
    try {
      await this.plugin.suspendUser(req.body.userId);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async activateUser(req, res) {
    try {
      await this.plugin.activateUser(req.body.userId);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async getLibraries(req, res) {
    try {
      const libs = await this.plugin.getLibraries();
      res.json({ success: true, libraries: libs });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async getStatistics(req, res) {
    try {
      const stats = await this.plugin.getStatistics();
      res.json({ success: true, statistics: stats });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async getStatus(req, res) {
    try {
      const status = this.plugin.getStatus();
      res.json({ success: true, ...status });
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  async testConnection(req, res) {
    try {
      const result = await this.plugin.testConnection();
      res.json(result);
    } catch (e) { res.status(500).json({ message: e.message }); }
  }

  // --- CONFIGURACIÓN ---

  async getConfig(req, res) {
    try {
      res.json({ success: true, config: this.plugin.config || {} });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async saveConfig(req, res) {
    try {
      const newConfig = req.body;

      // Validar campos requeridos
      if (!newConfig.serverUrl || !newConfig.apiKey) {
        return res.status(400).json({ success: false, message: 'serverUrl y apiKey son requeridos' });
      }

      // Actualizar configuración del plugin en memoria
      this.plugin.config = { ...this.plugin.config, ...newConfig };

      // Guardar configuración en la base de datos usando el sistema centralizado
      const db = require('../../../models');
      const SystemPlugin = db.SystemPlugin;

      // Buscar por múltiples nombres posibles
      const pluginRecord = await SystemPlugin.findOne({
        where: {
          name: {
            [db.Sequelize.Op.in]: ['jellyfin', 'jellyfin-media']
          }
        }
      });

      if (pluginRecord) {
        await pluginRecord.update({ configuration: newConfig });
        logger.info(`✅ Configuración guardada en BD para plugin: ${pluginRecord.name}`);
      } else {
        logger.warn('⚠️ Plugin Jellyfin no encontrado en BD, solo guardado en memoria');
      }

      logger.info('✅ Configuración de Jellyfin guardada exitosamente');
      res.json({ success: true, message: 'Configuración guardada correctamente' });
    } catch (e) {
      logger.error('Error guardando configuración:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

module.exports = JellyfinController;