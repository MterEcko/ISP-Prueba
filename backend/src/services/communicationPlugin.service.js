// backend/src/services/communicationPlugin.service.js
const db = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Modelos necesarios
const CommunicationChannel = db.CommunicationChannel;
const CommunicationLog = db.CommunicationLog;
const MessageTemplate = db.MessageTemplate;
const NotificationQueue = db.NotificationQueue;
const Client = db.Client;
const SystemPlugin = db.SystemPlugin;

class CommunicationPluginService {
  constructor() {
    this.channels = new Map();
    this.webhookSecrets = new Map();
    this.loadedPlugins = new Map();
    this.initialized = false;
    this.pluginsPath = path.join(__dirname, '../plugins');
    this.messageQueue = [];
    this.processingQueue = false;
  }

  /**
   * Inicializa todos los canales de comunicación configurados
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  async initializeAllChannels() {
    try {
      logger.info('Inicializando todos los canales de comunicación');

      // Cargar plugins disponibles
      await this._loadAvailablePlugins();

      const activeChannels = await CommunicationChannel.findAll({
        where: { active: true }
      });

      let initialized = 0;
      let errors = [];

      for (const channel of activeChannels) {
        try {
          await this.initializeChannel(channel.id);
          initialized++;
        } catch (error) {
          logger.error(`Error inicializando canal ${channel.name}: ${error.message}`);
          errors.push({
            channel: channel.name,
            error: error.message
          });
        }
      }

      this.initialized = true;

      return {
        success: true,
        data: {
          totalChannels: activeChannels.length,
          initialized,
          errors,
          availablePlugins: Array.from(this.loadedPlugins.keys())
        },
        message: `${initialized} canales inicializados correctamente`
      };

    } catch (error) {
      logger.error(`Error inicializando canales de comunicación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicializa un canal específico
   * @param {number} channelId - ID del canal
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  async initializeChannel(channelId) {
    try {
      logger.info(`Inicializando canal ${channelId}`);

      const channel = await CommunicationChannel.findByPk(channelId);
      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      if (!channel.active) {
        throw new Error(`Canal ${channel.name} está inactivo`);
      }

      const config = channel.configuration;
      const channelType = channel.channelType.toLowerCase();

      // Verificar si hay plugin disponible
      const plugin = this.loadedPlugins.get(channelType);
      if (!plugin) {
        throw new Error(`Plugin para ${channel.channelType} no encontrado`);
      }

      // Inicializar usando el plugin
      const client = await plugin.initialize(config);

      // Almacenar canal inicializado
      this.channels.set(channelId, {
        channel,
        client,
        plugin,
        type: channelType
      });

      // Almacenar secreto del webhook si existe
      if (config.webhookSecret) {
        this.webhookSecrets.set(channelId, config.webhookSecret);
      }

      logger.info(`Canal ${channel.name} inicializado correctamente`);

      return {
        success: true,
        channelId,
        name: channel.name,
        type: channel.channelType,
        pluginVersion: plugin.version || '1.0.0'
      };

    } catch (error) {
      logger.error(`Error inicializando canal ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía un mensaje usando el canal especificado
   * @param {Object} messageData - Datos del mensaje
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMessage(messageData) {
    try {
      logger.info(`Enviando mensaje a ${messageData.recipient} via ${messageData.channelType}`);

      const {
        channelId,
        channelType,
        clientId,
        templateId,
        recipient,
        subject,
        message,
        variables = {},
        priority = 'normal',
        scheduledFor,
        metadata = {}
      } = messageData;

      // Validaciones básicas
      if (!recipient || !message) {
        throw new Error('recipient y message son requeridos');
      }

      let finalChannelId = channelId;

      // Si no se especifica channelId pero sí channelType, buscar canal activo
      if (!finalChannelId && channelType) {
        const channel = await CommunicationChannel.findOne({
          where: { 
            channelType: channelType,
            active: true 
          }
        });

        if (!channel) {
          throw new Error(`No hay canal activo para ${channelType}`);
        }

        finalChannelId = channel.id;
      }

      if (!finalChannelId) {
        throw new Error('channelId o channelType son requeridos');
      }

      // Verificar cliente si se especifica
      let client = null;
      if (clientId) {
        client = await Client.findByPk(clientId);
        if (!client) {
          throw new Error(`Cliente ${clientId} no encontrado`);
        }
      }

      // Procesar plantilla si se especifica
      let finalMessage = message;
      let finalSubject = subject;

      if (templateId) {
        const template = await MessageTemplate.findByPk(templateId);
        if (template) {
          finalMessage = this._processTemplate(template.messageBody, variables, client);
          if (template.subject) {
            finalSubject = this._processTemplate(template.subject, variables, client);
          }
        }
      } else if (variables && Object.keys(variables).length > 0) {
        // Procesar variables en mensaje directo
        finalMessage = this._processTemplate(message, variables, client);
        if (subject) {
          finalSubject = this._processTemplate(subject, variables, client);
        }
      }

      // Si está programado, agregar a la cola
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        return await this._scheduleMessage({
          ...messageData,
          message: finalMessage,
          subject: finalSubject,
          channelId: finalChannelId,
          scheduledFor: new Date(scheduledFor)
        });
      }

      // Obtener cliente del canal
      const channelClient = this.channels.get(finalChannelId);
      if (!channelClient) {
        throw new Error(`Canal ${finalChannelId} no inicializado`);
      }

      // Generar referencia única
      const messageReference = this._generateMessageReference();

      // Preparar datos para el plugin
      const pluginMessageData = {
        recipient,
        subject: finalSubject,
        message: finalMessage,
        messageType: channelClient.type,
        clientInfo: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone
        } : null,
        metadata: {
          reference: messageReference,
          clientId,
          templateId,
          priority,
          ...metadata
        }
      };

      // Enviar usando el plugin
      const result = await channelClient.plugin.sendMessage(
        channelClient.client,
        pluginMessageData
      );

      // Crear registro de comunicación
      const communicationLog = await CommunicationLog.create({
        clientId: clientId || null,
        channelId: finalChannelId,
        templateId: templateId || null,
        recipient,
        subject: finalSubject || null,
        messageSent: finalMessage,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.success ? null : result.error,
        gatewayResponse: JSON.stringify(result.response || {}),
        sentAt: result.success ? new Date() : null
      });

      logger.info(`Mensaje ${messageReference} ${result.success ? 'enviado' : 'falló'}`);

      return {
        success: result.success,
        data: {
          logId: communicationLog.id,
          messageReference,
          status: result.success ? 'sent' : 'failed',
          channelResponse: result.response,
          deliveryId: result.deliveryId,
          estimatedDelivery: result.estimatedDelivery
        },
        message: result.success ? 
          `Mensaje enviado exitosamente via ${channelClient.channel.name}` :
          `Error enviando mensaje: ${result.error}`
      };

    } catch (error) {
      logger.error(`Error enviando mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía mensaje masivo a múltiples destinatarios
   * @param {Object} massMessageData - Datos del mensaje masivo
   * @returns {Promise<Object>} Resultado del envío masivo
   */
  async sendMassMessage(massMessageData) {
    try {
      const {
        channelType,
        templateId,
        recipients, // Array de objetos con destinatario y variables opcionales
        subject,
        message,
        globalVariables = {},
        priority = 'normal',
        batchSize = 10,
        delayBetweenBatches = 1000 // ms
      } = massMessageData;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Lista de destinatarios es requerida');
      }

      logger.info(`Enviando mensaje masivo a ${recipients.length} destinatarios via ${channelType}`);

      const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: []
      };

      // Procesar en lotes
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (recipientData) => {
          try {
            const messageVars = {
              ...globalVariables,
              ...recipientData.variables
            };

            const result = await this.sendMessage({
              channelType,
              templateId,
              clientId: recipientData.clientId,
              recipient: recipientData.recipient,
              subject,
              message,
              variables: messageVars,
              priority,
              metadata: {
                massMessage: true,
                batchNumber: Math.floor(i / batchSize) + 1
              }
            });

            if (result.success) {
              results.sent++;
            } else {
              results.failed++;
              results.errors.push({
                recipient: recipientData.recipient,
                error: result.message
              });
            }

          } catch (error) {
            results.failed++;
            results.errors.push({
              recipient: recipientData.recipient,
              error: error.message
            });
          }
        });

        await Promise.all(batchPromises);

        // Delay entre lotes si no es el último
        if (i + batchSize < recipients.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      logger.info(`Mensaje masivo completado: ${results.sent} enviados, ${results.failed} fallidos`);

      return {
        success: true,
        data: results,
        message: `Mensaje masivo procesado: ${results.sent}/${results.total} enviados exitosamente`
      };

    } catch (error) {
      logger.error(`Error enviando mensaje masivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja webhooks de los canales de comunicación
   * @param {string} channelType - Tipo de canal
   * @param {Object} webhookData - Datos del webhook
   * @param {string} signature - Firma del webhook
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async handleWebhook(channelType, webhookData, signature = null) {
    try {
      logger.info(`Procesando webhook de canal ${channelType}`);

      // Buscar canal por tipo
      const channel = await CommunicationChannel.findOne({
        where: { 
          channelType: channelType,
          active: true 
        }
      });

      if (!channel) {
        throw new Error(`Canal ${channelType} no encontrado o inactivo`);
      }

      const channelClient = this.channels.get(channel.id);
      if (!channelClient) {
        throw new Error(`Canal ${channelType} no inicializado`);
      }

      // Verificar firma del webhook si está disponible
      if (signature) {
        const isValid = await this.verifyWebhookSignature(channel.id, webhookData, signature);
        if (!isValid) {
          logger.warn(`Firma de webhook inválida para ${channelType}`);
          throw new Error('Firma de webhook inválida');
        }
      }

      // Procesar usando el plugin
      const webhookInfo = await channelClient.plugin.processWebhook(
        channelClient.client,
        webhookData
      );

      if (!webhookInfo || !webhookInfo.messageId) {
        return {
          success: true,
          message: 'Webhook procesado pero sin acciones requeridas'
        };
      }

      // Buscar el mensaje en nuestra base de datos
      const communicationLog = await CommunicationLog.findOne({
        where: {
          gatewayResponse: {
            [db.Sequelize.Op.like]: `%${webhookInfo.messageId}%`
          }
        }
      });

      if (communicationLog) {
        // Actualizar estado del mensaje
        await communicationLog.update({
          status: webhookInfo.status,
          deliveredAt: webhookInfo.status === 'delivered' ? new Date() : null,
          gatewayResponse: JSON.stringify({
            ...JSON.parse(communicationLog.gatewayResponse || '{}'),
            webhook: webhookInfo
          })
        });
      }

      return {
        success: true,
        data: {
          messageId: webhookInfo.messageId,
          status: webhookInfo.status,
          channelType
        },
        message: `Webhook procesado - Estado: ${webhookInfo.status}`
      };

    } catch (error) {
      logger.error(`Error procesando webhook de canal ${channelType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica la firma de un webhook
   * @param {number} channelId - ID del canal
   * @param {Object} data - Datos del webhook
   * @param {string} signature - Firma a verificar
   * @returns {Promise<boolean>} Resultado de la verificación
   */
  async verifyWebhookSignature(channelId, data, signature) {
    try {
      const secret = this.webhookSecrets.get(channelId);
      if (!secret) {
        logger.warn(`No hay secreto configurado para canal ${channelId}`);
        return true; // Permitir si no hay secreto configurado
      }

      const channelClient = this.channels.get(channelId);
      if (!channelClient || !channelClient.plugin.verifyWebhookSignature) {
        logger.warn(`Plugin no soporta verificación de firma para canal ${channelId}`);
        return true;
      }

      return await channelClient.plugin.verifyWebhookSignature(data, signature, secret);

    } catch (error) {
      logger.error(`Error verificando firma de webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene el estado de un mensaje
   * @param {number} logId - ID del log de comunicación
   * @returns {Promise<Object>} Estado del mensaje
   */
  async getMessageStatus(logId) {
    try {
      logger.info(`Consultando estado del mensaje ${logId}`);

      const communicationLog = await CommunicationLog.findByPk(logId, {
        include: [
          { model: Client },
          { model: CommunicationChannel },
          { model: MessageTemplate }
        ]
      });

      if (!communicationLog) {
        throw new Error(`Mensaje ${logId} no encontrado`);
      }

      // Consultar estado actualizado en el canal si está pendiente
      const channelClient = this.channels.get(communicationLog.channelId);
      let currentStatus = communicationLog.status;

      if (channelClient && communicationLog.status === 'sent' && channelClient.plugin.getMessageStatus) {
        try {
          const gatewayResponse = JSON.parse(communicationLog.gatewayResponse || '{}');
          const externalId = gatewayResponse.messageId || gatewayResponse.id;

          if (externalId) {
            const gatewayStatus = await channelClient.plugin.getMessageStatus(
              channelClient.client,
              externalId
            );

            if (gatewayStatus && gatewayStatus !== communicationLog.status) {
              currentStatus = gatewayStatus;
              await communicationLog.update({ 
                status: currentStatus,
                deliveredAt: currentStatus === 'delivered' ? new Date() : communicationLog.deliveredAt
              });
            }
          }
        } catch (error) {
          logger.warn(`Error consultando estado en canal: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          logId,
          status: currentStatus,
          recipient: communicationLog.recipient,
          messageSent: communicationLog.messageSent,
          sentAt: communicationLog.sentAt,
          deliveredAt: communicationLog.deliveredAt,
          client: communicationLog.Client ? {
            id: communicationLog.Client.id,
            name: `${communicationLog.Client.firstName} ${communicationLog.Client.lastName}`
          } : null,
          channel: {
            id: communicationLog.CommunicationChannel.id,
            name: communicationLog.CommunicationChannel.name,
            type: communicationLog.CommunicationChannel.channelType
          },
          template: communicationLog.MessageTemplate ? {
            id: communicationLog.MessageTemplate.id,
            name: communicationLog.MessageTemplate.name
          } : null
        }
      };

    } catch (error) {
      logger.error(`Error consultando estado del mensaje ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa la cola de mensajes programados
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processScheduledMessages() {
    try {
      if (this.processingQueue) {
        return { success: true, message: 'Cola ya está siendo procesada' };
      }

      this.processingQueue = true;
      logger.info('Procesando mensajes programados');

      const scheduledMessages = await NotificationQueue.findAll({
        where: {
          status: 'pending',
          scheduledFor: {
            [db.Sequelize.Op.lte]: new Date()
          }
        },
        order: [['scheduledFor', 'ASC']],
        limit: 50 // Procesar máximo 50 por vez
      });

      let processed = 0;
      let errors = 0;

      for (const scheduledMessage of scheduledMessages) {
        try {
          await scheduledMessage.update({ status: 'processing' });

          const messageData = JSON.parse(scheduledMessage.messageData);
          const result = await this.sendMessage(messageData);

          await scheduledMessage.update({
            status: result.success ? 'sent' : 'failed',
            processedAt: new Date(),
            result: JSON.stringify(result)
          });

          if (result.success) {
            processed++;
          } else {
            errors++;
          }

        } catch (error) {
          logger.error(`Error procesando mensaje programado ${scheduledMessage.id}: ${error.message}`);
          
          await scheduledMessage.update({
            status: 'failed',
            processedAt: new Date(),
            result: JSON.stringify({ error: error.message })
          });
          
          errors++;
        }
      }

      this.processingQueue = false;

      return {
        success: true,
        data: {
          totalScheduled: scheduledMessages.length,
          processed,
          errors
        },
        message: `${processed} mensajes programados enviados, ${errors} errores`
      };

    } catch (error) {
      this.processingQueue = false;
      logger.error(`Error procesando mensajes programados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene plugins disponibles
   * @returns {Promise<Object>} Lista de plugins
   */
  async getAvailablePlugins() {
    try {
      await this._loadAvailablePlugins();

      const plugins = Array.from(this.loadedPlugins.entries()).map(([name, plugin]) => ({
        name,
        version: plugin.version || '1.0.0',
        description: plugin.description || `Plugin para ${name}`,
        channelType: plugin.channelType || name,
        capabilities: plugin.capabilities || ['send'],
        configSchema: plugin.configSchema || null,
        loaded: true,
        initialized: Array.from(this.channels.values()).some(c => c.type === name)
      }));

      return {
        success: true,
        data: plugins,
        message: `${plugins.length} plugins encontrados`
      };

    } catch (error) {
      logger.error(`Error obteniendo plugins: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Carga plugins disponibles desde la carpeta plugins
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
          const pluginPath = path.join(this.pluginsPath, folder, 'src', `${folder}.service.js`);
          
          if (fs.existsSync(pluginPath)) {
            const plugin = require(pluginPath);
            
            // Validar que el plugin tenga los métodos requeridos para comunicación
            if (plugin.initialize && plugin.sendMessage) {
              this.loadedPlugins.set(folder, plugin);
              logger.info(`Plugin de comunicación ${folder} cargado exitosamente`);
            } else {
              logger.warn(`Plugin ${folder} no implementa todos los métodos requeridos para comunicación`);
            }
          }
        } catch (error) {
          logger.error(`Error cargando plugin de comunicación ${folder}: ${error.message}`);
        }
      }

      logger.info(`${this.loadedPlugins.size} plugins de comunicación cargados`);

    } catch (error) {
      logger.error(`Error cargando plugins de comunicación: ${error.message}`);
    }
  }

  /**
   * Procesa plantilla con variables
   * @private
   */
  _processTemplate(template, variables = {}, client = null) {
    try {
      let processedTemplate = template;

      // Variables del cliente
      if (client) {
        processedTemplate = processedTemplate.replace(/\{firstName\}/g, client.firstName || '');
        processedTemplate = processedTemplate.replace(/\{lastName\}/g, client.lastName || '');
        processedTemplate = processedTemplate.replace(/\{fullName\}/g, `${client.firstName || ''} ${client.lastName || ''}`.trim());
        processedTemplate = processedTemplate.replace(/\{email\}/g, client.email || '');
        processedTemplate = processedTemplate.replace(/\{phone\}/g, client.phone || '');
        processedTemplate = processedTemplate.replace(/\{clientId\}/g, client.id || '');
      }

      // Variables personalizadas
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value || '');
      }

      // Variables del sistema
      processedTemplate = processedTemplate.replace(/\{currentDate\}/g, new Date().toLocaleDateString('es-MX'));
      processedTemplate = processedTemplate.replace(/\{currentTime\}/g, new Date().toLocaleTimeString('es-MX'));
      processedTemplate = processedTemplate.replace(/\{currentYear\}/g, new Date().getFullYear().toString());

      return processedTemplate;

    } catch (error) {
      logger.error(`Error procesando plantilla: ${error.message}`);
      return template;
    }
  }

  /**
   * Programa un mensaje para envío futuro
   * @private
   */
  async _scheduleMessage(messageData) {
    try {
      const scheduledMessage = await NotificationQueue.create({
        clientId: messageData.clientId || null,
        channelId: messageData.channelId,
        templateId: messageData.templateId || null,
        recipient: messageData.recipient,
        messageData: JSON.stringify(messageData),
        scheduledFor: messageData.scheduledFor,
        status: 'pending',
        priority: messageData.priority || 'normal'
      });

      logger.info(`Mensaje programado para ${messageData.scheduledFor}: ${scheduledMessage.id}`);

      return {
        success: true,
        data: {
          queueId: scheduledMessage.id,
          scheduledFor: messageData.scheduledFor,
          recipient: messageData.recipient
        },
        message: 'Mensaje programado exitosamente'
      };

    } catch (error) {
      logger.error(`Error programando mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera referencia única de mensaje
   * @private
   */
  _generateMessageReference() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `MSG-${timestamp}-${random}`;
  }

  /**
   * Limpia y reinicia el servicio
   * @private
   */
  async _reset() {
    this.channels.clear();
    this.webhookSecrets.clear();
    this.loadedPlugins.clear();
    this.initialized = false;
    this.messageQueue = [];
    this.processingQueue = false;
    logger.info('Servicio de comunicación reiniciado');
  }
}

module.exports = new CommunicationPluginService();