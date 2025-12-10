// backend/src/services/pluginModels.service.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PluginModelsService {
  constructor() {
    this.pluginsPath = path.join(__dirname, '../plugins');
    this.loadedModels = new Map();
  }

  /**
   * Cargar modelos de todos los plugins activos
   * @param {Object} sequelize - Instancia de Sequelize
   * @param {Object} db - Objeto db para registrar modelos
   * @param {Array} activePlugins - Lista de plugins activos
   * @returns {Object} db actualizado con modelos de plugins
   */
  async loadPluginModels(sequelize, db, activePlugins = []) {
    try {
      logger.info('🔄 Cargando modelos de plugins...');

      // Si no se proporcionan plugins activos, intentar cargar de BD
      if (activePlugins.length === 0) {
        const SystemPlugin = db.SystemPlugin;
        if (SystemPlugin) {
          const plugins = await SystemPlugin.findAll({ where: { active: true } });
          activePlugins = plugins.map(p => p.name);
        }
      }

      let modelsLoaded = 0;
      let tablesCreated = 0;

      for (const pluginName of activePlugins) {
        try {
          const manifestPath = path.join(this.pluginsPath, pluginName, 'manifest.json');

          if (!fs.existsSync(manifestPath)) {
            logger.warn(`📄 Manifest no encontrado para plugin: ${pluginName}`);
            continue;
          }

          const manifestContent = fs.readFileSync(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestContent);

          if (!manifest.tables || !Array.isArray(manifest.tables) || manifest.tables.length === 0) {
            logger.info(`📦 Plugin ${pluginName}: sin tablas definidas`);
            continue;
          }

          logger.info(`📊 Cargando ${manifest.tables.length} tabla(s) del plugin ${pluginName}...`);

          // Cargar cada modelo definido
          for (const tableConfig of manifest.tables) {
            try {
              const modelPath = path.join(this.pluginsPath, pluginName, tableConfig.file);

              if (!fs.existsSync(modelPath)) {
                logger.error(`❌ Archivo de modelo no encontrado: ${modelPath}`);
                continue;
              }

              // Limpiar cache de require para recargas
              delete require.cache[require.resolve(modelPath)];

              // Cargar el modelo
              const modelDefinition = require(modelPath);
              const model = modelDefinition(sequelize);

              // Registrar en db
              const modelName = tableConfig.model || model.name;
              db[modelName] = model;

              // Guardar referencia
              this.loadedModels.set(`${pluginName}.${modelName}`, {
                plugin: pluginName,
                modelName: modelName,
                tableName: tableConfig.name,
                model: model
              });

              modelsLoaded++;
              logger.info(`  ✅ Modelo cargado: ${modelName} (tabla: ${tableConfig.name})`);

            } catch (modelError) {
              logger.error(`❌ Error cargando modelo ${tableConfig.model}: ${modelError.message}`);
            }
          }

          tablesCreated += manifest.tables.length;

        } catch (pluginError) {
          logger.error(`❌ Error procesando plugin ${pluginName}: ${pluginError.message}`);
        }
      }

      logger.info(`✅ Modelos de plugins cargados: ${modelsLoaded}/${tablesCreated}`);

      return db;

    } catch (error) {
      logger.error(`❌ Error cargando modelos de plugins: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar tablas de plugins con la base de datos
   * @param {Object} sequelize - Instancia de Sequelize
   * @param {Object} options - Opciones de sincronización (force, alter)
   */
  async syncPluginModels(sequelize, options = {}) {
    try {
      logger.info('🔄 Sincronizando tablas de plugins con la base de datos...');

      const syncOptions = {
        force: options.force || false,
        alter: options.alter || false
      };

      let synced = 0;
      let errors = 0;

      for (const [key, modelInfo] of this.loadedModels) {
        try {
          await modelInfo.model.sync(syncOptions);
          synced++;
          logger.info(`  ✅ Tabla sincronizada: ${modelInfo.tableName}`);
        } catch (syncError) {
          errors++;
          logger.error(`  ❌ Error sincronizando ${modelInfo.tableName}: ${syncError.message}`);
        }
      }

      logger.info(`✅ Sincronización completada: ${synced} tablas, ${errors} errores`);

      return {
        success: true,
        synced,
        errors
      };

    } catch (error) {
      logger.error(`❌ Error en sincronización de modelos de plugins: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener modelo de plugin por nombre
   * @param {string} pluginName - Nombre del plugin
   * @param {string} modelName - Nombre del modelo
   * @returns {Object|null} Modelo de Sequelize o null si no existe
   */
  getPluginModel(pluginName, modelName) {
    const key = `${pluginName}.${modelName}`;
    const modelInfo = this.loadedModels.get(key);
    return modelInfo ? modelInfo.model : null;
  }

  /**
   * Obtener todos los modelos de un plugin
   * @param {string} pluginName - Nombre del plugin
   * @returns {Array} Lista de modelos del plugin
   */
  getPluginModels(pluginName) {
    const models = [];
    for (const [key, modelInfo] of this.loadedModels) {
      if (modelInfo.plugin === pluginName) {
        models.push(modelInfo);
      }
    }
    return models;
  }

  /**
   * Eliminar modelos de un plugin
   * @param {string} pluginName - Nombre del plugin
   * @param {Object} db - Objeto db
   */
  async unloadPluginModels(pluginName, db) {
    try {
      logger.info(`🗑️  Descargando modelos del plugin ${pluginName}...`);

      const modelsToRemove = [];

      for (const [key, modelInfo] of this.loadedModels) {
        if (modelInfo.plugin === pluginName) {
          // Eliminar del objeto db
          if (db[modelInfo.modelName]) {
            delete db[modelInfo.modelName];
          }

          modelsToRemove.push(key);
          logger.info(`  ✅ Modelo descargado: ${modelInfo.modelName}`);
        }
      }

      // Eliminar de la cache
      for (const key of modelsToRemove) {
        this.loadedModels.delete(key);
      }

      logger.info(`✅ Modelos del plugin ${pluginName} descargados`);

      return {
        success: true,
        unloaded: modelsToRemove.length
      };

    } catch (error) {
      logger.error(`❌ Error descargando modelos del plugin ${pluginName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de modelos cargados
   * @returns {Object} Estadísticas
   */
  getStats() {
    const stats = {
      totalModels: this.loadedModels.size,
      byPlugin: {}
    };

    for (const [key, modelInfo] of this.loadedModels) {
      if (!stats.byPlugin[modelInfo.plugin]) {
        stats.byPlugin[modelInfo.plugin] = 0;
      }
      stats.byPlugin[modelInfo.plugin]++;
    }

    return stats;
  }
}

// Exportar instancia singleton
const pluginModelsService = new PluginModelsService();
module.exports = pluginModelsService;
