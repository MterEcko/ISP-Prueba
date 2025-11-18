// backend/src/controllers/communicationPlugin.controller.js
const db = require('../models');
const logger = require('../utils/logger');
const communicationPluginService = require('../services/communicationPlugin.service');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Modelos
const CommunicationChannel = db.CommunicationChannel;
const CommunicationLog = db.CommunicationLog;
const MessageTemplate = db.MessageTemplate;
const NotificationQueue = db.NotificationQueue;
const Client = db.Client;

// ==================== GESTIÓN DE CANALES ====================

/**
 * Obtener todos los canales de comunicación
 * GET /api/communication-channels
 */
exports.getAllChannels = async (req, res) => {
  try {
    const { active, channelType, includeStats = false } = req.query;
    
    const whereClause = {};
    if (active !== undefined) whereClause.active = active === 'true';
    if (channelType) whereClause.channelType = channelType;

    const channels = await CommunicationChannel.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    let channelsWithStats = channels;

    // Incluir estadísticas si se solicita
    if (includeStats === 'true') {
      channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const messageCount = await CommunicationLog.count({
            where: { channelId: channel.id }
          });
          
          const lastUsed = await CommunicationLog.max('createdAt', {
            where: { channelId: channel.id }
          });

          const successCount = await CommunicationLog.count({
            where: { 
              channelId: channel.id,
              status: 'sent'
            }
          });

          return {
            ...channel.toJSON(),
            statistics: {
              totalMessages: messageCount,
              successfulMessages: successCount,
              successRate: messageCount > 0 ? ((successCount / messageCount) * 100).toFixed(2) : '0.00',
              lastUsed
            }
          };
        })
      );
    }

    return res.status(200).json({
      success: true,
      data: channelsWithStats,
      message: `${channels.length} canales encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo canales: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nuevo canal de comunicación
 * POST /api/communication-channels
 */
exports.createChannel = async (req, res) => {
  try {
    const {
      name,
      channelType,
      configuration,
      active = true
    } = req.body;

    if (!name || !channelType) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y tipo de canal son requeridos'
      });
    }

    // Verificar tipos válidos
    const validTypes = ['email', 'whatsapp', 'telegram', 'sms'];
    if (!validTypes.includes(channelType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de canal inválido. Tipos válidos: ${validTypes.join(', ')}`
      });
    }

    // Verificar si ya existe un canal con el mismo nombre
    const existingChannel = await CommunicationChannel.findOne({
      where: { name }
    });

    if (existingChannel) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un canal con ese nombre'
      });
    }

    const channel = await CommunicationChannel.create({
      name,
      channelType,
      active,
      configuration: configuration || {}
    });

    logger.info(`Canal ${name} (${channelType}) creado exitosamente`);

    return res.status(201).json({
      success: true,
      data: channel,
      message: 'Canal creado exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando canal: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar canal de comunicación
 * PUT /api/communication-channels/:id
 */
exports.updateChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      channelType,
      configuration,
      active
    } = req.body;

    const channel = await CommunicationChannel.findByPk(id);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Canal no encontrado'
      });
    }

    await channel.update({
      name: name || channel.name,
      channelType: channelType || channel.channelType,
      active: active !== undefined ? active : channel.active,
      configuration: configuration || channel.configuration
    });

    logger.info(`Canal ${channel.name} actualizado`);

    return res.status(200).json({
      success: true,
      data: channel,
      message: 'Canal actualizado exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando canal ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Activar/desactivar canal
 * POST /api/communication-channels/:id/activate
 */
exports.activateChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Campo "active" es requerido'
      });
    }

    const channel = await CommunicationChannel.findByPk(id);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Canal no encontrado'
      });
    }

    await channel.update({ active });

    // Si se activa, intentar inicializar
    if (active) {
      try {
        await communicationPluginService.initializeChannel(id);
      } catch (initError) {
        logger.warn(`Error inicializando canal ${channel.name}: ${initError.message}`);
        // No fallar la activación si la inicialización falla
      }
    }

    logger.info(`Canal ${channel.name} ${active ? 'activado' : 'desactivado'}`);

    return res.status(200).json({
      success: true,
      data: channel,
      message: `Canal ${active ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    logger.error(`Error activando/desactivando canal ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener plugins disponibles para comunicación
 * GET /api/communication-channels/plugins
 */
exports.getAvailablePlugins = async (req, res) => {
  try {
    const pluginsDir = path.join(__dirname, '../plugins');
    const availablePlugins = [];

    if (fs.existsSync(pluginsDir)) {
      const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folder of pluginFolders) {
        const pluginPath = path.join(pluginsDir, folder, 'src', `${folder}.controller.js`);
        
        if (fs.existsSync(pluginPath)) {
          // Intentar cargar información del plugin
          try {
            const pluginController = require(pluginPath);
            const pluginInfo = pluginController.getPluginInfo ? 
              pluginController.getPluginInfo() : 
              {
                name: folder,
                version: '1.0.0',
                description: `Plugin para ${folder}`,
                channelType: folder
              };

            // Solo incluir plugins de comunicación
            if (['email', 'whatsapp', 'telegram', 'sms', 'voice'].includes(folder) || 
                (pluginInfo.category && pluginInfo.category === 'communication')) {
              
              availablePlugins.push({
                ...pluginInfo,
                folder,
                path: pluginPath,
                loaded: true,
                category: 'communication'
              });
            }
          } catch (error) {
            // Solo agregar si parece ser un plugin de comunicación
            if (['email', 'whatsapp', 'telegram', 'sms', 'voice'].includes(folder)) {
              availablePlugins.push({
                name: folder,
                folder,
                path: pluginPath,
                loaded: false,
                error: error.message,
                category: 'communication'
              });
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: availablePlugins,
      message: `${availablePlugins.length} plugins de comunicación encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo plugins de comunicación: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Inicializar todos los canales
 * POST /api/communication-channels/initialize
 */
exports.initializeAllChannels = async (req, res) => {
  try {
    const result = await communicationPluginService.initializeAllChannels();

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error inicializando canales: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== ENVÍO DE MENSAJES ====================

/**
 * Enviar mensaje individual
 * POST /api/communication/send
 */
exports.sendMessage = async (req, res) => {
  try {
    const messageData = req.body;

    // Validaciones básicas
    if (!messageData.recipient || !messageData.message) {
      return res.status(400).json({
        success: false,
        message: 'recipient y message son requeridos'
      });
    }

    if (!messageData.channelId && !messageData.channelType) {
      return res.status(400).json({
        success: false,
        message: 'channelId o channelType son requeridos'
      });
    }

    // Agregar información del usuario que envía
    messageData.sentBy = req.userId;

    const result = await communicationPluginService.sendMessage(messageData);

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error enviando mensaje: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar mensaje masivo
 * POST /api/communication/send-mass
 */
exports.sendMassMessage = async (req, res) => {
  try {
    const massMessageData = req.body;

    // Validaciones básicas
    if (!massMessageData.recipients || !Array.isArray(massMessageData.recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Lista de destinatarios es requerida'
      });
    }

    if (!massMessageData.channelType && !massMessageData.channelId) {
      return res.status(400).json({
        success: false,
        message: 'channelType o channelId son requeridos'
      });
    }

    if (!massMessageData.message && !massMessageData.templateId) {
      return res.status(400).json({
        success: false,
        message: 'message o templateId son requeridos'
      });
    }

    // Agregar información del usuario que envía
    massMessageData.sentBy = req.userId;

    const result = await communicationPluginService.sendMassMessage(massMessageData);

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error enviando mensaje masivo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estado de mensaje
 * GET /api/communication/status/:logId
 */
exports.getMessageStatus = async (req, res) => {
  try {
    const { logId } = req.params;

    const result = await communicationPluginService.getMessageStatus(logId);

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error obteniendo estado del mensaje ${req.params.logId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== HISTORIAL DE COMUNICACIONES ====================

/**
 * Obtener historial de comunicaciones
 * GET /api/communication/history
 */
exports.getCommunicationHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      channelId,
      channelType,
      clientId,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Aplicar filtros
    if (channelId) whereClause.channelId = channelId;
    if (clientId) whereClause.clientId = clientId;
    if (status) whereClause.status = status;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Filtro por tipo de canal
    const includeOptions = [
      {
        model: CommunicationChannel,
        as: 'channel',
        attributes: ['id', 'name', 'channelType']
      },
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      },
      {
        model: MessageTemplate,
        as: 'template',
        attributes: ['id', 'name', 'templateType'],
        required: false
      }
    ];

    if (channelType) {
      includeOptions[0].where = { channelType };
    }

    const { count, rows: communications } = await CommunicationLog.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]]
    });

    return res.status(200).json({
      success: true,
      data: {
        communications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      },
      message: `${count} comunicaciones encontradas`
    });

  } catch (error) {
    logger.error(`Error obteniendo historial de comunicaciones: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de comunicaciones
 * GET /api/communication/statistics
 */
exports.getCommunicationStatistics = async (req, res) => {
  try {
    const { startDate, endDate, channelId, channelType } = req.query;
    
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (channelId) {
      whereClause.channelId = channelId;
    }

    // Incluir filtro por tipo de canal si se especifica
    const includeClause = channelType ? {
      model: CommunicationChannel,
      where: { channelType },
      attributes: []
    } : null;

    const [totalMessages, sentMessages, deliveredMessages, failedMessages] = await Promise.all([
      CommunicationLog.count({ 
        where: whereClause,
        include: includeClause ? [includeClause] : []
      }),
      CommunicationLog.count({ 
        where: { ...whereClause, status: 'sent' },
        include: includeClause ? [includeClause] : []
      }),
      CommunicationLog.count({ 
        where: { ...whereClause, status: 'delivered' },
        include: includeClause ? [includeClause] : []
      }),
      CommunicationLog.count({ 
        where: { ...whereClause, status: 'failed' },
        include: includeClause ? [includeClause] : []
      })
    ]);

    // Obtener estadísticas por canal
    const channelStats = await db.sequelize.query(`
      SELECT
        cc."channelType",
        cc.name as "channelName",
        COUNT(cl.id) as "totalMessages",
        COUNT(CASE WHEN cl.status = 'sent' THEN 1 END) as "sentMessages",
        COUNT(CASE WHEN cl.status = 'delivered' THEN 1 END) as "deliveredMessages",
        COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as "failedMessages"
      FROM "CommunicationChannels" cc
      LEFT JOIN "CommunicationLogs" cl ON cc.id = cl."channelId"
      ${startDate && endDate ? 'AND cl."createdAt" BETWEEN :startDate AND :endDate' : ""}
      ${channelType ? 'WHERE cc."channelType" = :channelType' : ""}
      GROUP BY cc.id, cc."channelType", cc.name
      ORDER BY "totalMessages" DESC
    `, {
      replacements: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        channelType
      },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Estadísticas diarias (últimos 7 días)
    const dailyStats = {};
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      dailyStats[date] = { sent: 0, delivered: 0, failed: 0 };
    }

    const dailyData = await db.sequelize.query(`
      SELECT
        DATE("createdAt") as date,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM "CommunicationLogs"
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
      ${channelId ? 'AND "channelId" = :channelId' : ""}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `, {
      replacements: { channelId },
      type: db.Sequelize.QueryTypes.SELECT
    });

    dailyData.forEach(day => {
      if (dailyStats[day.date]) {
        dailyStats[day.date] = {
          sent: parseInt(day.sent),
          delivered: parseInt(day.delivered),
          failed: parseInt(day.failed)
        };
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalMessages,
          sentMessages,
          deliveredMessages,
          failedMessages,
          deliveryRate: sentMessages > 0 ? ((deliveredMessages / sentMessages) * 100).toFixed(2) : '0.00',
          successRate: totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(2) : '0.00'
        },
        channelStats,
        dailyStats,
        period: {
          startDate: startDate || 'N/A',
          endDate: endDate || 'N/A'
        }
      },
      message: 'Estadísticas de comunicaciones obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas de comunicaciones: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== MENSAJES PROGRAMADOS ====================

/**
 * Programar mensaje
 * POST /api/communication/schedule
 */
exports.scheduleMessage = async (req, res) => {
  try {
    const {
      channelId,
      channelType,
      clientId,
      templateId,
      recipient,
      subject,
      message,
      variables = {},
      scheduledFor,
      priority = 'normal'
    } = req.body;

    // Validaciones básicas
    if (!recipient || !message) {
      return res.status(400).json({
        success: false,
        message: 'recipient y message son requeridos'
      });
    }

    if (!scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor es requerido'
      });
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor debe ser una fecha futura'
      });
    }

    if (!channelId && !channelType) {
      return res.status(400).json({
        success: false,
        message: 'channelId o channelType son requeridos'
      });
    }

    // Determinar channelId si solo se proporcionó channelType
    let finalChannelId = channelId;
    if (!finalChannelId && channelType) {
      const channel = await CommunicationChannel.findOne({
        where: { channelType, active: true }
      });

      if (!channel) {
        return res.status(404).json({
          success: false,
          message: `No hay canal activo para ${channelType}`
        });
      }

      finalChannelId = channel.id;
    }

    // Crear entrada en la cola
    const queueEntry = await NotificationQueue.create({
      clientId: clientId || null,
      channelId: finalChannelId,
      templateId: templateId || null,
      recipient,
      messageData: JSON.stringify({
        channelId: finalChannelId,
        channelType,
        clientId,
        templateId,
        recipient,
        subject,
        message,
        variables,
        sentBy: req.userId,
        priority
      }),
      scheduledFor: scheduledDate,
      status: 'pending',
      priority
    });

    logger.info(`Mensaje programado para ${scheduledDate}: ${queueEntry.id}`);

    return res.status(201).json({
      success: true,
      data: {
        queueId: queueEntry.id,
        scheduledFor: scheduledDate,
        recipient,
        status: 'pending'
      },
      message: 'Mensaje programado exitosamente'
    });

  } catch (error) {
    logger.error(`Error programando mensaje: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener mensajes programados
 * GET /api/communication/scheduled
 */
exports.getScheduledMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      clientId,
      channelId,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (status) whereClause.status = status;
    if (clientId) whereClause.clientId = clientId;
    if (channelId) whereClause.channelId = channelId;

    if (startDate && endDate) {
      whereClause.scheduledFor = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: scheduledMessages } = await NotificationQueue.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: CommunicationChannel,
          as: 'channel',
          attributes: ['id', 'name', 'channelType']
        },
        {
          model: MessageTemplate,
          as: 'template',
          attributes: ['id', 'name', 'templateType'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['scheduledFor', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        scheduledMessages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      },
      message: `${count} mensajes programados encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo mensajes programados: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Procesar mensajes programados
 * POST /api/communication/process-scheduled
 */
exports.processScheduledMessages = async (req, res) => {
  try {
    const result = await communicationPluginService.processScheduledMessages();

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error procesando mensajes programados: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cancelar mensaje programado
 * DELETE /api/communication/scheduled/:id
 */
exports.cancelScheduledMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const scheduledMessage = await NotificationQueue.findByPk(id);
    
    if (!scheduledMessage) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje programado no encontrado'
      });
    }

    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar un mensaje con estado: ${scheduledMessage.status}`
      });
    }

    await scheduledMessage.update({
      status: 'cancelled',
      processedAt: new Date()
    });

    logger.info(`Mensaje programado ${id} cancelado`);

    return res.status(200).json({
      success: true,
      message: 'Mensaje programado cancelado exitosamente'
    });

  } catch (error) {
    logger.error(`Error cancelando mensaje programado ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== WEBHOOKS ====================

/**
 * Manejar webhook genérico de canales de comunicación
 * POST /api/communication/webhook/:channelType
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { channelType } = req.params;
    const webhookData = req.body;
    const signature = req.headers['x-signature'] || 
                     req.headers['x-hub-signature'] || 
                     req.headers['authorization'];

    logger.info(`Webhook recibido de ${channelType}`);

    // Usar el servicio de comunicación para procesar
    const result = await communicationPluginService.handleWebhook(
      channelType,
      webhookData,
      signature
    );

    if (result.success) {
      logger.info(`Webhook de ${channelType} procesado exitosamente`);
    } else {
      logger.warn(`Webhook de ${channelType} falló: ${result.message}`);
    }

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error procesando webhook de ${req.params.channelType}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error procesando webhook'
    });
  }
};

// ==================== RECORDATORIOS AUTOMÁTICOS ====================

/**
 * Enviar recordatorio de pago
 * POST /api/communication/payment-reminder
 */
exports.sendPaymentReminder = async (req, res) => {
  try {
    const {
      clientId,
      invoiceId,
      reminderType = 'email',
      daysOverdue = 0,
      customMessage
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'clientId es requerido'
      });
    }

    // Obtener información del cliente
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener información de la factura si se proporciona
    let invoice = null;
    if (invoiceId) {
      const Invoice = db.Invoice;
      invoice = await Invoice.findByPk(invoiceId);
    }

    // Determinar destinatario según el tipo de recordatorio
    let recipient = null;
    switch (reminderType) {
      case 'email':
        recipient = client.email;
        break;
      case 'whatsapp':
        recipient = client.whatsapp || client.phone;
        break;
      case 'sms':
        recipient = client.phone;
        break;
      default:
        recipient = client.email;
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: `Cliente no tiene ${reminderType} configurado`
      });
    }

    // Preparar variables para la plantilla
    const variables = {
      firstName: client.firstName,
      lastName: client.lastName,
      daysOverdue,
      invoiceNumber: invoice ? invoice.invoiceNumber : 'N/A',
      amount: invoice ? invoice.totalAmount : 'N/A',
      dueDate: invoice ? invoice.dueDate : 'N/A'
    };

    // Buscar plantilla de recordatorio de pago
    const template = await MessageTemplate.findOne({
      where: {
        templateType: 'paymentReminder',
        // Buscar plantilla específica para el canal o una genérica
        [db.Sequelize.Op.or]: [
          { channelId: null }, // Plantilla genérica
          // Para buscar por channelType necesitamos hacer un include
        ]
      },
      include: [
        {
          model: CommunicationChannel,
          where: { channelType: reminderType },
          required: false
        }
      ],
      order: [['channelId', 'DESC']] // Preferir plantillas específicas del canal
    });

    // Mensaje por defecto si no hay plantilla
    let message = customMessage;
    if (!message) {
      if (template) {
        message = template.messageBody;
      } else {
        message = daysOverdue > 0 
          ? `Hola {firstName}, tienes {daysOverdue} días de atraso en el pago de tu servicio. Por favor realiza tu pago lo antes posible.`
          : `Hola {firstName}, te recordamos que tienes un pago pendiente. Por favor realiza tu pago para evitar suspensión del servicio.`;
      }
    }

    // Enviar recordatorio
    const result = await communicationPluginService.sendMessage({
      channelType: reminderType,
      clientId,
      templateId: template ? template.id : null,
      recipient,
      subject: template && template.subject ? template.subject : 'Recordatorio de Pago',
      message,
      variables,
      metadata: {
        type: 'paymentReminder',
        invoiceId,
        daysOverdue,
        sentBy: req.userId
      }
    });

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error enviando recordatorio de pago: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar notificación de bienvenida
 * POST /api/communication/welcome
 */
exports.sendWelcomeMessage = async (req, res) => {
  try {
    const {
      clientId,
      channelType = 'email',
      customVariables = {}
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'clientId es requerido'
      });
    }

    // Obtener información del cliente
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Determinar destinatario
    let recipient = null;
    switch (channelType) {
      case 'email':
        recipient = client.email;
        break;
      case 'whatsapp':
        recipient = client.whatsapp || client.phone;
        break;
      case 'sms':
        recipient = client.phone;
        break;
      default:
        recipient = client.email;
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: `Cliente no tiene ${channelType} configurado`
      });
    }

    // Buscar plantilla de bienvenida
    const template = await MessageTemplate.findOne({
      where: {
        templateType: 'welcome',
        [db.Sequelize.Op.or]: [
          { channelId: null }
        ]
      },
      include: [
        {
          model: CommunicationChannel,
          where: { channelType },
          required: false
        }
      ],
      order: [['channelId', 'DESC']]
    });

    // Preparar variables
    const variables = {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      ...customVariables
    };

    // Mensaje por defecto si no hay plantilla
    let message = template ? template.messageBody : 
      `¡Bienvenido {firstName}! Gracias por confiar en nuestros servicios. Estamos aquí para ayudarte.`;

    // Enviar mensaje de bienvenida
    const result = await communicationPluginService.sendMessage({
      channelType,
      clientId,
      templateId: template ? template.id : null,
      recipient,
      subject: template && template.subject ? template.subject : '¡Bienvenido!',
      message,
      variables,
      metadata: {
        type: 'welcome',
        sentBy: req.userId
      }
    });

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error enviando mensaje de bienvenida: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Notificar suspensión de servicio
 * POST /api/communication/suspension
 */
exports.sendSuspensionNotification = async (req, res) => {
  try {
    const {
      clientId,
      reason = 'Falta de pago',
      suspensionDate,
      channelType = 'email'
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'clientId es requerido'
      });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Determinar destinatario
    let recipient = null;
    switch (channelType) {
      case 'email':
        recipient = client.email;
        break;
      case 'whatsapp':
        recipient = client.whatsapp || client.phone;
        break;
      case 'sms':
        recipient = client.phone;
        break;
      default:
        recipient = client.email;
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: `Cliente no tiene ${channelType} configurado`
      });
    }

    // Buscar plantilla de suspensión
    const template = await MessageTemplate.findOne({
      where: {
        templateType: 'suspension',
        [db.Sequelize.Op.or]: [
          { channelId: null }
        ]
      },
      include: [
        {
          model: CommunicationChannel,
          where: { channelType },
          required: false
        }
      ],
      order: [['channelId', 'DESC']]
    });

    // Preparar variables
    const variables = {
      firstName: client.firstName,
      lastName: client.lastName,
      reason,
      suspensionDate: suspensionDate || new Date().toLocaleDateString('es-MX')
    };

    // Mensaje por defecto si no hay plantilla
    let message = template ? template.messageBody : 
      `Estimado {firstName}, lamentamos informarle que su servicio ha sido suspendido por: {reason}. Fecha de suspensión: {suspensionDate}. Para reactivar su servicio, por favor póngase en contacto con nosotros.`;

    // Enviar notificación de suspensión
    const result = await communicationPluginService.sendMessage({
      channelType,
      clientId,
      templateId: template ? template.id : null,
      recipient,
      subject: template && template.subject ? template.subject : 'Suspensión de Servicio',
      message,
      variables,
      metadata: {
        type: 'suspension',
        reason,
        suspensionDate,
        sentBy: req.userId
      }
    });

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error enviando notificación de suspensión: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Notificar reactivación de servicio
 * POST /api/communication/reactivation
 */
exports.sendReactivationNotification = async (req, res) => {
  try {
    const {
      clientId,
      reactivationDate,
      channelType = 'email',
      customMessage
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'clientId es requerido'
      });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Determinar destinatario
    let recipient = null;
    switch (channelType) {
      case 'email':
        recipient = client.email;
        break;
      case 'whatsapp':
        recipient = client.whatsapp || client.phone;
        break;
      case 'sms':
        recipient = client.phone;
        break;
      default:
        recipient = client.email;
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: `Cliente no tiene ${channelType} configurado`
      });
    }

    // Buscar plantilla de reactivación
    const template = await MessageTemplate.findOne({
      where: {
        templateType: 'reactivation',
        [db.Sequelize.Op.or]: [
          { channelId: null }
        ]
      },
      include: [
        {
          model: CommunicationChannel,
          where: { channelType },
          required: false
        }
      ],
      order: [['channelId', 'DESC']]
    });

    // Preparar variables
    const variables = {
      firstName: client.firstName,
      lastName: client.lastName,
      reactivationDate: reactivationDate || new Date().toLocaleDateString('es-MX')
    };

    // Mensaje por defecto si no hay plantilla
    let message = customMessage;
    if (!message) {
      message = template ? template.messageBody : 
        `¡Estimado {firstName}! Nos complace informarle que su servicio ha sido reactivado el {reactivationDate}. Gracias por su pago y confianza en nuestros servicios.`;
    }

    // Enviar notificación de reactivación
    const result = await communicationPluginService.sendMessage({
      channelType,
      clientId,
      templateId: template ? template.id : null,
      recipient,
      subject: template && template.subject ? template.subject : 'Servicio Reactivado',
      message,
      variables,
      metadata: {
        type: 'reactivation',
        reactivationDate,
        sentBy: req.userId
      }
    });

    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error(`Error enviando notificación de reactivación: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = exports;