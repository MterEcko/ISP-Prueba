const axios = require('axios');
const logger = require('../../../utils/logger');

class N8nPlugin {
  constructor() {
    this.name = 'n8n';
    this.config = {};
    this.n8nClient = null;
  }

  async initialize(config) {
    try {
      this.config = config;

      // Inicializar cliente de n8n
      if (config.n8nUrl && config.apiKey) {
        this.n8nClient = axios.create({
          baseURL: config.n8nUrl,
          headers: {
            'X-N8N-API-KEY': config.apiKey,
            'Content-Type': 'application/json'
          }
        });

        logger.info('Plugin n8n inicializado correctamente');
        return { success: true, message: 'Plugin n8n inicializado' };
      } else {
        logger.warn('Plugin n8n: Falta configuración (n8nUrl o apiKey)');
        return { success: false, message: 'Configuración incompleta' };
      }
    } catch (error) {
      logger.error(`Error inicializando plugin n8n: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  registerRoutes(router) {
    const routes = require('./routes');
    logger.info('Rutas de n8n registradas');
    return routes;
  }

  // Obtener todos los workflows
  async getWorkflows(req, res) {
    try {
      if (!this.n8nClient) {
        return res.status(400).json({
          success: false,
          message: 'Plugin n8n no está configurado'
        });
      }

      const response = await this.n8nClient.get('/api/v1/workflows');

      return res.status(200).json({
        success: true,
        data: response.data
      });
    } catch (error) {
      logger.error(`Error obteniendo workflows: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Obtener un workflow específico
  async getWorkflow(req, res) {
    try {
      const { id } = req.params;

      if (!this.n8nClient) {
        return res.status(400).json({
          success: false,
          message: 'Plugin n8n no está configurado'
        });
      }

      const response = await this.n8nClient.get(`/api/v1/workflows/${id}`);

      return res.status(200).json({
        success: true,
        data: response.data
      });
    } catch (error) {
      logger.error(`Error obteniendo workflow: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Ejecutar un workflow
  async executeWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body;

      if (!this.n8nClient) {
        return res.status(400).json({
          success: false,
          message: 'Plugin n8n no está configurado'
        });
      }

      const response = await this.n8nClient.post(`/api/v1/workflows/${id}/execute`, {
        data: data || {}
      });

      return res.status(200).json({
        success: true,
        data: response.data
      });
    } catch (error) {
      logger.error(`Error ejecutando workflow: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Handler para webhooks
  async handleWebhook(req, res) {
    try {
      const { workflowId } = req.params;
      const webhookData = req.body;

      logger.info(`Webhook recibido para workflow ${workflowId}`);

      // Aquí puedes procesar el webhook y ejecutar lógica personalizada
      // Por ejemplo, guardar en base de datos, ejecutar acciones, etc.

      return res.status(200).json({
        success: true,
        message: 'Webhook procesado',
        workflowId
      });
    } catch (error) {
      logger.error(`Error procesando webhook: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async shutdown() {
    logger.info('Plugin n8n detenido');
    return { success: true };
  }
}

module.exports = new N8nPlugin();
