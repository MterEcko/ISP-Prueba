// backend/src/services/pluginManager.service.js
const { SystemPlugin } = require('../models');
const eventBus = require('./eventBus.service');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class PluginManager {
  constructor() {
    // Registros para clasificar qué hace cada plugin
    this.registries = {
      payment_gateways: new Map(),      // Stripe, PayPal
      communication_channels: new Map(), // WhatsApp, SMS
      service_providers: new Map(),     // Streaming, Gaming, IoT
      dashboard_widgets: [],            // Grafana, BI
      security_middlewares: [],         // DNS Filter, Firewall
      network_optimizers: [],           // Auto-healing, QoS
      system_observers: []              // AI, n8n, Analytics (Solo escuchan)
    };
    this.pluginsPath = path.join(__dirname, '../plugins');
  }

  /**
   * Carga inicial de todos los plugins
   */
  async loadPlugins() {
    logger.info('🔌 PluginManager: Iniciando carga de ecosistema...');
    
    try {
      // Verificar tabla de plugins (por si es la primera ejecución y no existe)
      if (!SystemPlugin) {
        logger.warn('⚠️ Modelo SystemPlugin no disponible aún. Saltando carga.');
        return;
      }

      const activePlugins = await SystemPlugin.findAll({ where: { active: true } });

      for (const plugin of activePlugins) {
        await this._loadSinglePlugin(plugin);
      }

      logger.info(`✅ PluginManager: ${activePlugins.length} plugins activos.`);
    } catch (error) {
      logger.error(`❌ Error general cargando plugins: ${error.message}`);
    }
  }

  async _loadSinglePlugin(pluginData) {
    const pluginDir = path.join(this.pluginsPath, pluginData.name);
    const manifestPath = path.join(pluginDir, 'manifest.json');
    // Estandarizamos: el código backend siempre debe estar en /server/index.js dentro del ZIP
    const entryPoint = path.join(pluginDir, 'server/index.js'); 

    try {
      if (!fs.existsSync(manifestPath) || !fs.existsSync(entryPoint)) {
        // Fallback silencioso: tal vez es un plugin solo de frontend o está corrupto
        return;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const capabilities = manifest.capabilities || [];
      
      // Cargar módulo
      const pluginModule = require(entryPoint);

      // 1. INICIALIZACIÓN (CRÍTICO)
      // Le pasamos el EventBus para que la IA/n8n se conecten
      if (typeof pluginModule.initialize === 'function') {
        // Pasamos configuración desencriptada si tuvieras el servicio de encriptación aquí
        // Por ahora pasamos la raw
        await pluginModule.initialize(eventBus, pluginData.configuration);
      }

      // 2. REGISTRO DE CAPACIDADES (CLASIFICACIÓN)

      // Pagos
      if (capabilities.includes('payment_processor')) {
        this.registries.payment_gateways.set(pluginData.name, pluginModule.paymentHandler);
      }

      // Comunicación (WhatsApp)
      if (capabilities.includes('communication_channel')) {
        this.registries.communication_channels.set(pluginData.name, pluginModule.communicationHandler);
      }

      // Servicios Facturables (Gaming, Streaming)
      if (capabilities.includes('service_provider')) {
        this.registries.service_providers.set(pluginData.name, pluginModule.serviceHandler);
      }

      // Seguridad (DNS Filter) - Se inyectan en Express
      if (capabilities.includes('security_middleware') && pluginModule.middleware) {
        this.registries.security_middlewares.push(pluginModule.middleware);
      }

      // Widgets Visuales
      if (capabilities.includes('dashboard_widget') && manifest.ui?.widget_component) {
        this.registries.dashboard_widgets.push({
          plugin: pluginData.name,
          component: manifest.ui.widget_component
        });
      }
      
      // Optimizadores de Red (QoS)
      if (capabilities.includes('network_optimizer')) {
         this.registries.network_optimizers.push(pluginModule);
      }

      // Observadores (IA, n8n)
      if (capabilities.includes('system_observer')) {
         this.registries.system_observers.push(pluginData.name);
         // Estos usualmente ya se suscribieron en 'initialize', solo los registramos para control
      }

    } catch (error) {
      logger.error(`❌ Fallo al cargar plugin ${pluginData.name}: ${error.message}`);
    }
  }

  // === API PÚBLICA PARA EL CORE ===

  getPaymentHandler(name) { return this.registries.payment_gateways.get(name); }
  getAllPaymentGateways() { return Array.from(this.registries.payment_gateways.keys()); }
  
  getSecurityMiddlewares() { return this.registries.security_middlewares; }
  
  getDashboardWidgets() { return this.registries.dashboard_widgets; }
  
  // Para cuando quieras enviar un mensaje por todos los canales
  getAllCommunicationChannels() { return Array.from(this.registries.communication_channels.values()); }
}

module.exports = new PluginManager();