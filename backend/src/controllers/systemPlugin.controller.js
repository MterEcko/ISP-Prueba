// backend/src/controllers/systemPlugin.controller.js - MEJORADO
const db = require('../models');
const SystemPlugin = db.SystemPlugin;
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class SystemPluginController {
  constructor() {
    this.pluginsPath = path.join(__dirname, '../plugins');
    this.loadedPlugins = new Map();
    this.activePlugins = new Map();
  }

  /**
   * Obtener todos los plugins del sistema
   * GET /api/system-plugins
   */
  getAllPlugins = async (req, res) => {
    try {
      const { category, active, includeStats = false } = req.query;
      
      const whereClause = {};
      if (category) whereClause.category = category;
      if (active !== undefined) whereClause.active = active === 'true';

      const plugins = await SystemPlugin.findAll({
        where: whereClause,
        order: [['name', 'ASC']]
      });

      let pluginsWithStats = plugins;

      // Incluir estadísticas si se solicita
      if (includeStats === 'true') {
        pluginsWithStats = await Promise.all(
          plugins.map(async (plugin) => {
            const stats = await this._getPluginStatistics(plugin);
            return {
              ...plugin.toJSON(),
              statistics: stats
            };
          })
        );
      }

      return res.status(200).json({
        success: true,
        data: pluginsWithStats,
        message: `${plugins.length} plugins encontrados`
      });

    } catch (error) {
      logger.error(`Error obteniendo plugins del sistema: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Obtener plugin por ID
   * GET /api/system-plugins/:id
   */
  getPluginById = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Plugin ID es requerido'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      // Agregar información adicional si el plugin está cargado
      const loadedInfo = this.loadedPlugins.get(plugin.name);
      const pluginData = {
        ...plugin.toJSON(),
        loaded: !!loadedInfo,
        loadedInfo: loadedInfo || null,
        statistics: await this._getPluginStatistics(plugin)
      };
      
      return res.status(200).json({
        success: true,
        data: pluginData,
        message: 'Plugin obtenido exitosamente'
      });

    } catch (error) {
      logger.error(`Error obteniendo plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Obtener plugins activos
   * GET /api/system-plugins/active
   */
  getActivePlugins = async (req, res) => {
    try {
      const { category } = req.query;
      
      const whereClause = { active: true };
      if (category) whereClause.category = category;

      const plugins = await SystemPlugin.findAll({
        where: whereClause,
        order: [['name', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        data: plugins,
        message: `${plugins.length} plugins activos encontrados`
      });

    } catch (error) {
      logger.error(`Error obteniendo plugins activos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Obtener plugins disponibles en el sistema de archivos
   * GET /api/system-plugins/available
   */
  getAvailablePlugins = async (req, res) => {
    try {
      const { category } = req.query;
      
      await this._loadAvailablePlugins();
      
      const availablePlugins = [];

      if (fs.existsSync(this.pluginsPath)) {
        const pluginFolders = fs.readdirSync(this.pluginsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const folder of pluginFolders) {
          try {
            const pluginInfo = await this._getPluginInfo(folder);
            
            // Filtrar por categoría si se especifica
            if (category && pluginInfo.category !== category) {
              continue;
            }

            // Verificar si está registrado en BD
            const dbPlugin = await SystemPlugin.findOne({
              where: { name: folder }
            });

            availablePlugins.push({
              ...pluginInfo,
              folder,
              registered: !!dbPlugin,
              active: dbPlugin ? dbPlugin.active : false,
              dbId: dbPlugin ? dbPlugin.id : null,
              loaded: this.loadedPlugins.has(folder)
            });

          } catch (error) {
            logger.warn(`Error cargando información del plugin ${folder}: ${error.message}`);
            availablePlugins.push({
              name: folder,
              folder,
              loaded: false,
              registered: false,
              error: error.message
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: availablePlugins,
        message: `${availablePlugins.length} plugins disponibles encontrados`
      });

    } catch (error) {
      logger.error(`Error obteniendo plugins disponibles: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Registrar/Crear un nuevo plugin en la base de datos
   * POST /api/system-plugins
   */
  createPlugin = async (req, res) => {
    try {
      const { 
        name, 
        version, 
        category = 'general',
        configuration = {},
        active = false,
        autoLoad = false
      } = req.body;
      
      if (!name || !version) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y versión son requeridos'
        });
      }
      
      // Verificar si el plugin ya existe
      const existingPlugin = await SystemPlugin.findOne({
        where: { name }
      });
      
      if (existingPlugin) {
        return res.status(400).json({
          success: false,
          message: 'El plugin ya está registrado'
        });
      }

      // Verificar que el plugin existe en el sistema de archivos
      const pluginPath = path.join(this.pluginsPath, name);
      if (!fs.existsSync(pluginPath)) {
        return res.status(400).json({
          success: false,
          message: 'Plugin no encontrado en el sistema de archivos'
        });
      }

      // Intentar obtener información del plugin
      let pluginInfo = {};
      try {
        pluginInfo = await this._getPluginInfo(name);
      } catch (error) {
        logger.warn(`No se pudo obtener información del plugin ${name}: ${error.message}`);
      }
      
      const newPlugin = await SystemPlugin.create({
        name,
        version,
        category,
        active,
        configuration: {
          ...configuration,
          autoLoad,
          registeredAt: new Date().toISOString()
        },
        pluginTables: pluginInfo.tables || [],
        pluginRoutes: pluginInfo.routes || []
      });

      // Si se marca como activo, intentar activarlo
      if (active) {
        try {
          await this._activatePlugin(newPlugin);
        } catch (activationError) {
          logger.error(`Error activando plugin ${name}: ${activationError.message}`);
          // Actualizar como inactivo si falla la activación
          await newPlugin.update({ active: false });
        }
      }
      
      logger.info(`Plugin ${name} registrado exitosamente`);
      
      return res.status(201).json({
        success: true,
        data: newPlugin,
        message: 'Plugin registrado exitosamente'
      });

    } catch (error) {
      logger.error(`Error registrando plugin: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Actualizar plugin
   * PUT /api/system-plugins/:id
   */
  updatePlugin = async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        version, 
        category,
        configuration, 
        active 
      } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Plugin ID es requerido'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      const wasActive = plugin.active;
      
      // Actualizar campos
      const updateData = {};
      if (version) updateData.version = version;
      if (category) updateData.category = category;
      if (configuration) {
        updateData.configuration = {
          ...plugin.configuration,
          ...configuration,
          updatedAt: new Date().toISOString()
        };
      }
      if (active !== undefined) updateData.active = active;
      
      await plugin.update(updateData);

      // Manejar cambios de estado
      if (wasActive && !plugin.active) {
        // Desactivar plugin
        await this._deactivatePlugin(plugin);
      } else if (!wasActive && plugin.active) {
        // Activar plugin
        try {
          await this._activatePlugin(plugin);
        } catch (activationError) {
          logger.error(`Error activando plugin ${plugin.name}: ${activationError.message}`);
          await plugin.update({ active: false });
          throw activationError;
        }
      }
      
      logger.info(`Plugin ${plugin.name} actualizado exitosamente`);
      
      return res.status(200).json({
        success: true,
        data: plugin,
        message: 'Plugin actualizado exitosamente'
      });

    } catch (error) {
      logger.error(`Error actualizando plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Activar plugin
   * POST /api/system-plugins/:id/activate
   */
  activatePlugin = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Plugin ID es requerido'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      if (plugin.active) {
        return res.status(400).json({
          success: false,
          message: 'El plugin ya está activo'
        });
      }

      // Verificar que el plugin existe en el sistema de archivos
      const pluginPath = path.join(this.pluginsPath, plugin.name);
      if (!fs.existsSync(pluginPath)) {
        return res.status(400).json({
          success: false,
          message: `Plugin ${plugin.name} no encontrado en el sistema de archivos`
        });
      }

      // Activar plugin
      await this._activatePlugin(plugin);
      
      await plugin.update({ 
        active: true,
        configuration: {
          ...plugin.configuration,
          activatedAt: new Date().toISOString()
        }
      });
      
      logger.info(`Plugin ${plugin.name} activado exitosamente`);
      
      return res.status(200).json({
        success: true,
        data: plugin,
        message: 'Plugin activado exitosamente'
      });

    } catch (error) {
      logger.error(`Error activando plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  };

  /**
   * Desactivar plugin
   * POST /api/system-plugins/:id/deactivate
   */
  deactivatePlugin = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Plugin ID es requerido'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      if (!plugin.active) {
        return res.status(400).json({
          success: false,
          message: 'El plugin ya está inactivo'
        });
      }

      // Verificar dependencias (otros plugins que dependan de este)
      const dependentPlugins = await this._checkDependencies(plugin.name);
      if (dependentPlugins.length > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede desactivar. Los siguientes plugins dependen de él: ${dependentPlugins.join(', ')}`
        });
      }
      
      // Desactivar plugin
      await this._deactivatePlugin(plugin);
      
      await plugin.update({ 
        active: false,
        configuration: {
          ...plugin.configuration,
          deactivatedAt: new Date().toISOString()
        }
      });
      
      logger.info(`Plugin ${plugin.name} desactivado exitosamente`);
      
      return res.status(200).json({
        success: true,
        data: plugin,
        message: 'Plugin desactivado exitosamente'
      });

    } catch (error) {
      logger.error(`Error desactivando plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Eliminar plugin
   * DELETE /api/system-plugins/:id
   */
  deletePlugin = async (req, res) => {
    try {
      const { id } = req.params;
      const { removeFiles = false } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Plugin ID es requerido'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      // Verificar que no esté activo
      if (plugin.active) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un plugin activo. Desactívalo primero'
        });
      }

      // Verificar dependencias
      const dependentPlugins = await this._checkDependencies(plugin.name);
      if (dependentPlugins.length > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar. Los siguientes plugins dependen de él: ${dependentPlugins.join(', ')}`
        });
      }

      // Eliminar de memoria si está cargado
      this.loadedPlugins.delete(plugin.name);
      this.activePlugins.delete(plugin.name);

      // Eliminar archivos si se solicita
      if (removeFiles === 'true') {
        const pluginPath = path.join(this.pluginsPath, plugin.name);
        if (fs.existsSync(pluginPath)) {
          fs.rmSync(pluginPath, { recursive: true, force: true });
          logger.info(`Archivos del plugin ${plugin.name} eliminados`);
        }
      }
      
      await plugin.destroy();
      
      logger.info(`Plugin ${plugin.name} eliminado exitosamente`);
      
      return res.status(200).json({
        success: true,
        message: 'Plugin eliminado exitosamente'
      });

    } catch (error) {
      logger.error(`Error eliminando plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Recargar plugin
   * POST /api/system-plugins/:id/reload
   */
  reloadPlugin = async (req, res) => {
    try {
      const { id } = req.params;
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      const wasActive = plugin.active;

      // Desactivar si está activo
      if (wasActive) {
        await this._deactivatePlugin(plugin);
      }

      // Limpiar de memoria
      this.loadedPlugins.delete(plugin.name);
      this.activePlugins.delete(plugin.name);

      // Limpiar caché de require si existe
      const pluginPath = path.join(this.pluginsPath, plugin.name);
      Object.keys(require.cache).forEach(key => {
        if (key.includes(pluginPath)) {
          delete require.cache[key];
        }
      });

      // Reactivar si estaba activo
      if (wasActive) {
        await this._activatePlugin(plugin);
      }
      
      logger.info(`Plugin ${plugin.name} recargado exitosamente`);
      
      return res.status(200).json({
        success: true,
        data: plugin,
        message: 'Plugin recargado exitosamente'
      });

    } catch (error) {
      logger.error(`Error recargando plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Obtener configuración de plugin
   * GET /api/system-plugins/:id/config
   */
  getPluginConfig = async (req, res) => {
    try {
      const { id } = req.params;
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      // Obtener esquema de configuración del plugin si existe
      let configSchema = null;
      try {
        const pluginInfo = await this._getPluginInfo(plugin.name);
        configSchema = pluginInfo.configSchema || null;
      } catch (error) {
        logger.warn(`No se pudo obtener esquema de configuración: ${error.message}`);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          pluginId: plugin.id,
          pluginName: plugin.name,
          configuration: plugin.configuration,
          configSchema
        },
        message: 'Configuración obtenida exitosamente'
      });

    } catch (error) {
      logger.error(`Error obteniendo configuración del plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Actualizar configuración de plugin
   * PUT /api/system-plugins/:id/config
   */
  updatePluginConfig = async (req, res) => {
    try {
      const { id } = req.params;
      const { configuration } = req.body;
      
      if (!configuration || typeof configuration !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Configuración válida es requerida'
        });
      }
      
      const plugin = await SystemPlugin.findByPk(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: 'Plugin no encontrado'
        });
      }

      // Validar configuración si existe un esquema
      try {
        const pluginInfo = await this._getPluginInfo(plugin.name);
        if (pluginInfo.validateConfig && typeof pluginInfo.validateConfig === 'function') {
          const validation = pluginInfo.validateConfig(configuration);
          if (!validation.valid) {
            return res.status(400).json({
              success: false,
              message: 'Configuración inválida',
              errors: validation.errors
            });
          }
        }
      } catch (error) {
        logger.warn(`No se pudo validar configuración: ${error.message}`);
      }

      // Actualizar configuración
      await plugin.update({
        configuration: {
          ...plugin.configuration,
          ...configuration,
          updatedAt: new Date().toISOString(),
          updatedBy: req.userId || 'system'
        }
      });

      // Si el plugin está activo, notificar el cambio de configuración
      if (plugin.active && this.activePlugins.has(plugin.name)) {
        try {
          const activePlugin = this.activePlugins.get(plugin.name);
          if (activePlugin.onConfigUpdate && typeof activePlugin.onConfigUpdate === 'function') {
            await activePlugin.onConfigUpdate(plugin.configuration);
          }
        } catch (error) {
          logger.warn(`Error notificando cambio de configuración al plugin: ${error.message}`);
        }
      }
      
      logger.info(`Configuración del plugin ${plugin.name} actualizada`);
      
      return res.status(200).json({
        success: true,
        data: plugin,
        message: 'Configuración actualizada exitosamente'
      });

    } catch (error) {
      logger.error(`Error actualizando configuración del plugin ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Inicializar todos los plugins activos
   * POST /api/system-plugins/initialize
   */
  initializeAllPlugins = async (req, res) => {
    try {
      logger.info('Inicializando todos los plugins activos');

      const activePlugins = await SystemPlugin.findAll({
        where: { active: true }
      });

      let initialized = 0;
      let errors = [];

      for (const plugin of activePlugins) {
        try {
          await this._activatePlugin(plugin);
          initialized++;
        } catch (error) {
          logger.error(`Error inicializando plugin ${plugin.name}: ${error.message}`);
          errors.push({
            plugin: plugin.name,
            error: error.message
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          totalPlugins: activePlugins.length,
          initialized,
          errors,
          activePlugins: Array.from(this.activePlugins.keys())
        },
        message: `${initialized} plugins inicializados correctamente`
      });

    } catch (error) {
      logger.error(`Error inicializando plugins: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Carga plugins disponibles desde el sistema de archivos
   * @private
   */
  async _loadAvailablePlugins() {
    try {
      if (!fs.existsSync(this.pluginsPath)) {
        logger.warn(`Directorio de plugins no existe: ${this.pluginsPath}`);
        return;
      }

      const pluginFolders = fs.readdirSync(this.pluginsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folder of pluginFolders) {
        try {
          if (!this.loadedPlugins.has(folder)) {
            const pluginInfo = await this._getPluginInfo(folder);
            this.loadedPlugins.set(folder, pluginInfo);
          }
        } catch (error) {
          logger.warn(`Error cargando plugin ${folder}: ${error.message}`);
        }
      }

      logger.info(`${this.loadedPlugins.size} plugins cargados en memoria`);

    } catch (error) {
      logger.error(`Error cargando plugins: ${error.message}`);
    }
  }

  /**
   * Obtiene información de un plugin específico
   * @private
   */
  async _getPluginInfo(pluginName) {
    const pluginPath = path.join(this.pluginsPath, pluginName);
    
    // Verificar que existe el directorio
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin ${pluginName} no encontrado`);
    }

    // Intentar cargar manifest.json
    const manifestPath = path.join(pluginPath, 'manifest.json');
    let manifest = {};
    
    if (fs.existsSync(manifestPath)) {
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        logger.warn(`Error leyendo manifest.json de ${pluginName}: ${error.message}`);
      }
    }

    // Intentar cargar package.json
    const packagePath = path.join(pluginPath, 'package.json');
    let packageInfo = {};
    
    if (fs.existsSync(packagePath)) {
      try {
        const packageContent = fs.readFileSync(packagePath, 'utf8');
        packageInfo = JSON.parse(packageContent);
      } catch (error) {
        logger.warn(`Error leyendo package.json de ${pluginName}: ${error.message}`);
      }
    }

    // Intentar cargar controlador para obtener información adicional
    const controllerPath = path.join(pluginPath, 'src', `${pluginName}.controller.js`);
    let controllerInfo = {};
    
    if (fs.existsSync(controllerPath)) {
      try {
        const pluginController = require(controllerPath);
        if (pluginController.getPluginInfo && typeof pluginController.getPluginInfo === 'function') {
          controllerInfo = pluginController.getPluginInfo();
        }
      } catch (error) {
        logger.warn(`Error cargando controlador de ${pluginName}: ${error.message}`);
      }
    }

    // Combinar información
    return {
      name: pluginName,
      version: manifest.version || packageInfo.version || '1.0.0',
      description: manifest.description || packageInfo.description || `Plugin para ${pluginName}`,
      category: manifest.category || controllerInfo.category || 'general',
      author: manifest.author || packageInfo.author || 'Unknown',
      countries: controllerInfo.countries || ['unknown'],
      methods: controllerInfo.supportedMethods || controllerInfo.methods || [],
      tables: manifest.tables || [],
      routes: manifest.routes || [],
      dependencies: manifest.dependencies || [],
      configSchema: manifest.configSchema || null,
      ...controllerInfo
    };
  }

  /**
   * Activa un plugin específico
   * @private
   */
  async _activatePlugin(plugin) {
    try {
      const pluginPath = path.join(this.pluginsPath, plugin.name);
      
      // Verificar que existe
      if (!fs.existsSync(pluginPath)) {
        throw new Error(`Plugin ${plugin.name} no encontrado en ${pluginPath}`);
      }

      // Intentar cargar el controlador
      const controllerPath = path.join(pluginPath, 'src', `${plugin.name}.controller.js`);
      if (!fs.existsSync(controllerPath)) {
        throw new Error(`Controlador no encontrado: ${controllerPath}`);
      }

      const pluginController = require(controllerPath);
      
      // Verificar métodos requeridos (pueden variar según el tipo de plugin)
      const requiredMethods = this._getRequiredMethodsForCategory(plugin.category);
      for (const method of requiredMethods) {
        if (!pluginController[method] || typeof pluginController[method] !== 'function') {
          throw new Error(`Plugin ${plugin.name} no implementa el método requerido: ${method}`);
        }
      }

      // Inicializar plugin si tiene método de inicialización
      if (pluginController.initialize && typeof pluginController.initialize === 'function') {
        await pluginController.initialize(plugin.configuration);
      }

      // Almacenar plugin activo
      this.activePlugins.set(plugin.name, pluginController);
      
      logger.info(`Plugin ${plugin.name} activado exitosamente`);

    } catch (error) {
      logger.error(`Error activando plugin ${plugin.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desactiva un plugin específico
   * @private
   */
  async _deactivatePlugin(plugin) {
    try {
      const activePlugin = this.activePlugins.get(plugin.name);
      
      if (activePlugin) {
        // Llamar método de limpieza si existe
        if (activePlugin.cleanup && typeof activePlugin.cleanup === 'function') {
          await activePlugin.cleanup();
        }

        // Remover de plugins activos
        this.activePlugins.delete(plugin.name);
      }
      
      logger.info(`Plugin ${plugin.name} desactivado exitosamente`);

    } catch (error) {
      logger.error(`Error desactivando plugin ${plugin.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica dependencias de un plugin
   * @private
   */
  async _checkDependencies(pluginName) {
    try {
      const allPlugins = await SystemPlugin.findAll({
        where: { active: true }
      });

      const dependentPlugins = [];

      for (const plugin of allPlugins) {
        if (plugin.name === pluginName) continue;

        const pluginInfo = await this._getPluginInfo(plugin.name);
        if (pluginInfo.dependencies && Array.isArray(pluginInfo.dependencies)) {
          const dependsOnThis = pluginInfo.dependencies.some(dep => 
            (typeof dep === 'string' && dep === pluginName) ||
            (typeof dep === 'object' && dep.name === pluginName)
          );
          
          if (dependsOnThis) {
            dependentPlugins.push(plugin.name);
          }
        }
      }

      return dependentPlugins;

    } catch (error) {
      logger.error(`Error verificando dependencias: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtiene métodos requeridos según la categoría del plugin
   * @private
   */
  _getRequiredMethodsForCategory(category) {
    const methodsByCategory = {
      'payment': ['initialize', 'processPayment', 'processWebhook'],
      'communication': ['initialize', 'sendMessage', 'validateConfig'],
      'network': ['initialize', 'getStatus', 'executeCommand'],
      'general': ['initialize'],
      'default': ['initialize']
    };

    return methodsByCategory[category] || methodsByCategory['default'];
  }

  /**
   * Obtiene estadísticas de uso de un plugin
   * @private
   */
  async _getPluginStatistics(plugin) {
    try {
      const stats = {
        lastActivated: null,
        lastDeactivated: null,
        timesActivated: 0,
        configUpdates: 0,
        errors: 0
      };

      // Intentar obtener estadísticas del plugin si implementa el método
      const activePlugin = this.activePlugins.get(plugin.name);
      if (activePlugin && activePlugin.getStatistics && typeof activePlugin.getStatistics === 'function') {
        const pluginStats = await activePlugin.getStatistics();
        return { ...stats, ...pluginStats };
      }

      // Estadísticas básicas de la configuración
      if (plugin.configuration) {
        if (plugin.configuration.activatedAt) {
          stats.lastActivated = plugin.configuration.activatedAt;
        }
        if (plugin.configuration.deactivatedAt) {
          stats.lastDeactivated = plugin.configuration.deactivatedAt;
        }
        if (plugin.configuration.timesActivated) {
          stats.timesActivated = plugin.configuration.timesActivated;
        }
      }

      return stats;

    } catch (error) {
      logger.warn(`Error obteniendo estadísticas del plugin ${plugin.name}: ${error.message}`);
      return {
        lastActivated: null,
        lastDeactivated: null,
        timesActivated: 0,
        configUpdates: 0,
        errors: 0
      };
    }
  }

  /**
   * Reinicia el gestor de plugins
   * @private
   */
  async _reset() {
    try {
      // Desactivar todos los plugins activos
      for (const [pluginName, activePlugin] of this.activePlugins) {
        try {
          if (activePlugin.cleanup && typeof activePlugin.cleanup === 'function') {
            await activePlugin.cleanup();
          }
        } catch (error) {
          logger.error(`Error limpiando plugin ${pluginName}: ${error.message}`);
        }
      }

      this.activePlugins.clear();
      this.loadedPlugins.clear();
      
      logger.info('Gestor de plugins reiniciado');

    } catch (error) {
      logger.error(`Error reiniciando gestor de plugins: ${error.message}`);
    }
  }
}

// Crear instancia singleton
const systemPluginController = new SystemPluginController();

// Exportar métodos individuales para compatibilidad con tu estructura existente
module.exports = {
  // Métodos principales
  getAllPlugins: systemPluginController.getAllPlugins,
  getPluginById: systemPluginController.getPluginById,
  getActivePlugins: systemPluginController.getActivePlugins,
  getAvailablePlugins: systemPluginController.getAvailablePlugins,
  createPlugin: systemPluginController.createPlugin,
  updatePlugin: systemPluginController.updatePlugin,
  activatePlugin: systemPluginController.activatePlugin,
  deactivatePlugin: systemPluginController.deactivatePlugin,
  deletePlugin: systemPluginController.deletePlugin,
  reloadPlugin: systemPluginController.reloadPlugin,
  
  // Métodos de configuración
  getPluginConfig: systemPluginController.getPluginConfig,
  updatePluginConfig: systemPluginController.updatePluginConfig,
  
  // Métodos de gestión
  initializeAllPlugins: systemPluginController.initializeAllPlugins,
  
  // Instancia para acceso directo si se necesita
  instance: systemPluginController
};