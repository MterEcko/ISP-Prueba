// backend/src/services/databaseId.service.js
const crypto = require('crypto');
const logger = require('../utils/logger');

class DatabaseIdService {
  constructor() {
    this.databaseId = null;
    this.initialized = false;
  }

  /**
   * Generar un Database ID único (UUID v4)
   */
  generateDatabaseId() {
    return crypto.randomUUID();
  }

  /**
   * Inicializar y obtener el Database ID
   * Si no existe, lo crea y lo guarda en la BD
   */
  async initialize() {
    if (this.initialized) {
      return this.databaseId;
    }

    try {
      const db = require('../models');

      // Buscar Database ID existente
      let config = await db.SystemConfiguration.findOne({
        where: {
          configKey: 'database_id',
          module: 'system'
        }
      });

      if (config) {
        // Database ID ya existe
        this.databaseId = config.configValue;
        logger.info(`🔑 Database ID cargado: ${this.databaseId}`);
      } else {
        // Generar nuevo Database ID
        this.databaseId = this.generateDatabaseId();

        // Guardarlo en la BD
        await db.SystemConfiguration.create({
          configKey: 'database_id',
          configValue: this.databaseId,
          configType: 'string',
          module: 'system',
          description: 'Identificador único de la base de datos para anti-piratería',
          active: true
        });

        logger.info(`🆕 Nuevo Database ID generado y guardado: ${this.databaseId}`);
      }

      this.initialized = true;
      return this.databaseId;

    } catch (error) {
      logger.error('Error inicializando Database ID:', error.message);
      // En caso de error, generar temporal en memoria (no ideal pero permite continuar)
      this.databaseId = this.generateDatabaseId();
      this.initialized = true;
      return this.databaseId;
    }
  }

  /**
   * Obtener el Database ID actual
   */
  getDatabaseId() {
    if (!this.initialized) {
      logger.warn('⚠️ Database ID no inicializado todavía');
      return null;
    }
    return this.databaseId;
  }

  /**
   * Verificar si el Database ID ha sido inicializado
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = new DatabaseIdService();
