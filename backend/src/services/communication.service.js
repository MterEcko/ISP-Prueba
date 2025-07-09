const db = require('../models');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const { Telegraf } = require('telegraf');
const moment = require('moment');

// Modelos necesarios
const CommunicationChannel = db.CommunicationChannel;
const MessageTemplate = db.MessageTemplate;
const CommunicationLog = db.CommunicationLog;
const Client = db.Client;
const ClientBilling = db.ClientBilling;
const servicePackage = db.servicePackage;
const Invoice = db.Invoice;
const PaymentReminder = db.PaymentReminder;
const Ticket = db.Ticket;
const User = db.User;
const SystemConfiguration = db.SystemConfiguration;

class CommunicationService {
  constructor() {
    this.emailTransporter = null;
    this.telegramBot = null;
    this.whatsappClient = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Inicializa los clientes de comunicación
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('Inicializando servicios de comunicación');

      // Inicializar Email
      await this._initializeEmailTransporter();
      
      // Inicializar Telegram
      await this._initializeTelegramBot();
      
      // Inicializar WhatsApp (comentado hasta tener configuración)
      // await this._initializeWhatsApp();

      logger.info('Servicios de comunicación inicializados exitosamente');
    } catch (error) {
      logger.error(`Error inicializando servicios de comunicación: ${error.message}`);
    }
  }

  /**
   * Envía un mensaje usando un template específico
   * @param {string} channelType - Tipo de canal (email, telegram, whatsapp, sms)
   * @param {string} recipient - Destinatario (email, phone, chat_id)
   * @param {number} templateId - ID del template
   * @param {Object} variables - Variables para reemplazar en el template
   * @param {number} clientId - ID del cliente (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMessage(channelType, recipient, templateId, variables = {}, clientId = null) {
    try {
      logger.info(`Enviando mensaje ${channelType} a ${recipient} con template ${templateId}`);

      // Validar canal
      const channel = await CommunicationChannel.findOne({
        where: { channelType: channelType, active: true }
      });

      if (!channel) {
        throw new Error(`Canal ${channelType} no encontrado o inactivo`);
      }

      // Obtener template
      const template = await MessageTemplate.findByPk(templateId);
      if (!template || !template.active) {
        throw new Error(`Template ${templateId} no encontrado o inactivo`);
      }

      // Procesar template con variables
      const processedContent = await this.processTemplate(templateId, variables);
      
      // Crear log de comunicación
      const communicationLog = await CommunicationLog.create({
        clientId: clientId,
        channelId: channel.id,
        templateId: templateId,
        recipient: recipient,
        subject: processedContent.subject,
        messageSent: processedContent.message,
        status: 'pending'
      });

      try {
        let result;
        
        // Enviar según el tipo de canal
        switch (channelType.toLowerCase()) {
          case 'email':
            result = await this.sendEmail(
              recipient, 
              processedContent.subject, 
              processedContent.message,
              processedContent.attachments
            );
            break;
            
          case 'telegram':
            result = await this.sendTelegram(recipient, processedContent.message);
            break;
            
          case 'whatsapp':
            result = await this.sendWhatsApp(recipient, processedContent.message, processedContent.mediaUrl);
            break;
            
          case 'sms':
            result = await this.sendSMS(recipient, processedContent.message);
            break;
            
          default:
            throw new Error(`Tipo de canal no soportado: ${channelType}`);
        }

        // Actualizar log con resultado exitoso
        await communicationLog.update({
          status: 'sent',
          sentAt: new Date(),
          gatewayResponse: result
        });

        return {
          success: true,
          data: {
            communicationLogId: communicationLog.id,
            recipient,
            channelType,
            subject: processedContent.subject,
            status: 'sent',
            sentAt: new Date().toISOString()
          },
          message: `Mensaje enviado exitosamente por ${channelType}`
        };

      } catch (sendError) {
        // Actualizar log con error
        await communicationLog.update({
          status: 'failed',
          errorMessage: sendError.message
        });

        throw sendError;
      }

    } catch (error) {
      logger.error(`Error enviando mensaje ${channelType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía mensajes masivos a múltiples destinatarios
   * @param {string} channelType - Tipo de canal
   * @param {Array} recipients - Lista de destinatarios
   * @param {number} templateId - ID del template
   * @param {Object} globalVariables - Variables globales para todos
   * @param {Array} individualVariables - Variables específicas por destinatario (opcional)
   * @returns {Promise<Object>} Resultado del envío masivo
   */
  async sendBulkMessage(channelType, recipients, templateId, globalVariables = {}, individualVariables = []) {
    try {
      logger.info(`Iniciando envío masivo ${channelType} a ${recipients.length} destinatarios`);

      let results = {
        successful: [],
        failed: [],
        total: recipients.length
      };

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (recipient, index) => {
            try {
              const actualIndex = i + index;
              const variables = {
                ...globalVariables,
                ...(individualVariables[actualIndex] || {})
              };

              const result = await this.sendMessage(
                channelType,
                recipient.address || recipient,
                templateId,
                variables,
                recipient.clientId || null
              );

              results.successful.push({
                recipient: recipient.address || recipient,
                clientId: recipient.clientId || null,
                communicationLogId: result.data.communicationLogId,
                sentAt: result.data.sentAt
              });

            } catch (error) {
              results.failed.push({
                recipient: recipient.address || recipient,
                clientId: recipient.clientId || null,
                error: error.message
              });
            }
          })
        );

        // Pausa breve entre lotes
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Envío masivo completado: ${results.successful.length} exitosos, ${results.failed.length} fallidos`);

      return {
        success: true,
        data: results,
        message: `Envío masivo completado: ${results.successful.length}/${results.total} mensajes enviados exitosamente`
      };

    } catch (error) {
      logger.error(`Error en envío masivo ${channelType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Programa un mensaje para envío futuro
   * @param {Object} messageData - Datos del mensaje
   * @param {Date} sendAt - Fecha/hora programada
   * @returns {Promise<Object>} Resultado de la programación
   */
  async scheduleMessage(messageData, sendAt) {
    try {
      logger.info(`Programando mensaje para ${sendAt}`);

      const { channelType, recipient, templateId, variables = {}, clientId } = messageData;

      // Validar fecha futura
      if (new Date(sendAt) <= new Date()) {
        throw new Error('La fecha de envío debe ser futura');
      }

      // Crear registro programado (esto requeriría una tabla adicional o usar un job scheduler)
      // Por simplicidad, lo agregamos a la cola con delay
      const delay = new Date(sendAt).getTime() - Date.now();
      
      setTimeout(async () => {
        try {
          await this.sendMessage(channelType, recipient, templateId, variables, clientId);
          logger.info(`Mensaje programado enviado a ${recipient}`);
        } catch (error) {
          logger.error(`Error enviando mensaje programado: ${error.message}`);
        }
      }, delay);

      return {
        success: true,
        data: {
          scheduledFor: sendAt,
          recipient,
          channelType,
          templateId
        },
        message: `Mensaje programado exitosamente para ${moment(sendAt).format('DD/MM/YYYY HH:mm')}`
      };

    } catch (error) {
      logger.error(`Error programando mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa un template reemplazando variables
   * @param {number} templateId - ID del template
   * @param {Object} variables - Variables para reemplazar
   * @returns {Promise<Object>} Template procesado
   */
  async processTemplate(templateId, variables = {}) {
    try {
      const template = await MessageTemplate.findByPk(templateId, {
        include: [{ model: CommunicationChannel }]
      });

      if (!template) {
        throw new Error(`Template ${templateId} no encontrado`);
      }

      // Variables disponibles del sistema
      const systemVariables = await this.getAvailableVariables(template.templateType);
      const allVariables = { ...systemVariables, ...variables };

      // Procesar subject y mensaje
      let processedSubject = template.subject || '';
      let processedMessage = template.messageBody || '';

      // Reemplazar variables en formato {variable}
      Object.keys(allVariables).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        processedSubject = processedSubject.replace(regex, allVariables[key] || '');
        processedMessage = processedMessage.replace(regex, allVariables[key] || '');
      });

      return {
        subject: processedSubject,
        message: processedMessage,
        channelType: template.CommunicationChannel.channelType,
        attachments: null, // TODO: Implementar si es necesario
        mediaUrl: null // TODO: Para WhatsApp si es necesario
      };

    } catch (error) {
      logger.error(`Error procesando template ${templateId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene variables disponibles según el tipo de template
   * @param {string} templateType - Tipo de template
   * @returns {Promise<Object>} Variables disponibles
   */
  async getAvailableVariables(templateType) {
    const now = new Date();
    
    const baseVariables = {
      fecha_actual: moment(now).format('DD/MM/YYYY'),
      hora_actual: moment(now).format('HH:mm'),
      año_actual: now.getFullYear().toString(),
      mes_actual: moment(now).format('MMMM'),
      nombre_empresa: 'ISP Sistema', // TODO: Obtener de configuración
      telefono_soporte: '555-1234', // TODO: Obtener de configuración
      email_soporte: 'soporte@isp.com' // TODO: Obtener de configuración
    };

    // Variables específicas por tipo
    switch (templateType) {
      case 'payment_reminder':
        return {
          ...baseVariables,
          dias_vencido: '{dias_vencido}',
          monto_adeudado: '{monto_adeudado}',
          fecha_vencimiento: '{fecha_vencimiento}',
          numero_factura: '{numero_factura}'
        };
        
      case 'installation':
        return {
          ...baseVariables,
          fecha_instalacion: '{fecha_instalacion}',
          hora_instalacion: '{hora_instalacion}',
          tecnico_asignado: '{tecnico_asignado}',
          direccion_instalacion: '{direccion_instalacion}'
        };
        
      case 'welcome':
        return {
          ...baseVariables,
          usuario_pppoe: '{usuario_pppoe}',
          password_pppoe: '{password_pppoe}',
          velocidad_descarga: '{velocidad_descarga}',
          velocidad_subida: '{velocidad_subida}'
        };
        
      default:
        return baseVariables;
    }
  }

  /**
   * Valida un template antes de guardarlo
   * @param {Object} templateData - Datos del template
   * @returns {Promise<Object>} Resultado de la validación
   */
  async validateTemplate(templateData) {
    try {
      const { name, messageBody, templateType, channelId } = templateData;

      // Validaciones básicas
      if (!name || !messageBody || !templateType || !channelId) {
        throw new Error('Campos requeridos: name, messageBody, templateType, channelId');
      }

      // Verificar que el canal existe
      const channel = await CommunicationChannel.findByPk(channelId);
      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      // Verificar variables utilizadas
      const usedVariables = this._extractVariablesFromText(messageBody);
      const availableVariables = await this.getAvailableVariables(templateType);
      const invalidVariables = usedVariables.filter(
        variable => !availableVariables.hasOwnProperty(variable)
      );

      return {
        success: true,
        data: {
          validVariables: usedVariables.filter(v => availableVariables.hasOwnProperty(v)),
          invalidVariables,
          availableVariables: Object.keys(availableVariables),
          isValid: invalidVariables.length === 0
        },
        message: invalidVariables.length === 0 
          ? 'Template válido' 
          : `Variables inválidas encontradas: ${invalidVariables.join(', ')}`
      };

    } catch (error) {
      logger.error(`Error validando template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía email
   * @param {string} recipient - Email destinatario
   * @param {string} subject - Asunto
   * @param {string} body - Cuerpo del mensaje
   * @param {Array} attachments - Archivos adjuntos (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail(recipient, subject, body, attachments = null) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Transportador de email no inicializado');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@isp.com',
        to: recipient,
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
        text: body
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const result = await this.emailTransporter.sendMail(mailOptions);

      logger.info(`Email enviado exitosamente a ${recipient}, messageId: ${result.messageId}`);

      return {
        messageId: result.messageId,
        response: result.response,
        accepted: result.accepted,
        rejected: result.rejected
      };

    } catch (error) {
      logger.error(`Error enviando email a ${recipient}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía mensaje por Telegram
   * @param {string} chatId - ID del chat de Telegram
   * @param {string} message - Mensaje
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendTelegram(chatId, message) {
    try {
      if (!this.telegramBot) {
        throw new Error('Bot de Telegram no inicializado');
      }

      const result = await this.telegramBot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML'
      });

      logger.info(`Mensaje de Telegram enviado a ${chatId}, messageId: ${result.message_id}`);

      return {
        messageId: result.message_id,
        chatId: result.chat.id,
        date: result.date
      };

    } catch (error) {
      logger.error(`Error enviando Telegram a ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía mensaje por WhatsApp
   * @param {string} phone - Número de teléfono
   * @param {string} message - Mensaje
   * @param {string} mediaUrl - URL de media (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendWhatsApp(phone, message, mediaUrl = null) {
    try {
      // TODO: Implementar cliente de WhatsApp
      // Por ahora solo simular el envío
      logger.warn(`WhatsApp no implementado - Mensaje para ${phone}: ${message}`);
      
      return {
        success: false,
        message: 'WhatsApp no implementado aún'
      };

    } catch (error) {
      logger.error(`Error enviando WhatsApp a ${phone}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía SMS
   * @param {string} phone - Número de teléfono
   * @param {string} message - Mensaje
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendSMS(phone, message) {
    try {
      // TODO: Implementar proveedor de SMS
      logger.warn(`SMS no implementado - Mensaje para ${phone}: ${message}`);
      
      return {
        success: false,
        message: 'SMS no implementado aún'
      };

    } catch (error) {
      logger.error(`Error enviando SMS a ${phone}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estado de entrega de un mensaje
   * @param {number} messageId - ID del mensaje en CommunicationLog
   * @returns {Promise<Object>} Estado de entrega
   */
  async getDeliveryStatus(messageId) {
    try {
      const log = await CommunicationLog.findByPk(messageId, {
        include: [
          { model: CommunicationChannel },
          { model: MessageTemplate },
          { model: Client, required: false }
        ]
      });

      if (!log) {
        throw new Error(`Mensaje ${messageId} no encontrado`);
      }

      return {
        success: true,
        data: {
          messageId,
          status: log.status,
          recipient: log.recipient,
          channelType: log.CommunicationChannel.channelType,
          template: log.MessageTemplate.name,
          sentAt: log.sentAt,
          deliveredAt: log.deliveredAt,
          errorMessage: log.errorMessage,
          clientName: log.Client ? `${log.Client.firstName} ${log.Client.lastName}` : null
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo estado de mensaje ${messageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de comunicaciones por canal
   * @param {number} channelId - ID del canal
   * @param {string} period - Período ('7d', '30d', '90d')
   * @returns {Promise<Object>} Estadísticas del canal
   */
  async getChannelStatistics(channelId, period = '30d') {
    try {
      const startDate = this._getStartDateForPeriod(period);
      
      const channel = await CommunicationChannel.findByPk(channelId);
      if (!channel) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      // Estadísticas generales
      const totalMessages = await CommunicationLog.count({
        where: {
          channelId,
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        }
      });

      const sentMessages = await CommunicationLog.count({
        where: {
          channelId,
          status: 'sent',
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        }
      });

      const failedMessages = await CommunicationLog.count({
        where: {
          channelId,
          status: 'failed',
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        }
      });

      // Estadísticas por template
      const templateStats = await CommunicationLog.findAll({
        where: {
          channelId,
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        include: [{ model: MessageTemplate }],
        attributes: [
          'templateId',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('CommunicationLog.id')), 'count'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN status = 'sent' THEN 1 ELSE 0 END")), 'sent'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")), 'failed']
        ],
        group: ['templateId', 'MessageTemplate.id', 'MessageTemplate.name'],
        raw: false
      });

      const successRate = totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(2) : '0.00';

      return {
        success: true,
        data: {
          channel: {
            id: channel.id,
            name: channel.name,
            type: channel.channelType
          },
          period,
          statistics: {
            totalMessages,
            sentMessages,
            failedMessages,
            pendingMessages: totalMessages - sentMessages - failedMessages,
            successRate: parseFloat(successRate)
          },
          templateStats: templateStats.map(stat => ({
            templateId: stat.templateId,
            templateName: stat.MessageTemplate.name,
            totalSent: parseInt(stat.get('count')),
            successful: parseInt(stat.get('sent')),
            failed: parseInt(stat.get('failed'))
          }))
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas del canal ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene mensajes no entregados
   * @param {number} channelId - ID del canal (opcional)
   * @returns {Promise<Object>} Mensajes no entregados
   */
  async getUndeliveredMessages(channelId = null) {
    try {
      const whereCondition = {
        status: ['pending', 'failed']
      };

      if (channelId) {
        whereCondition.channelId = channelId;
      }

      const undeliveredMessages = await CommunicationLog.findAll({
        where: whereCondition,
        include: [
          { model: CommunicationChannel },
          { model: MessageTemplate },
          { model: Client, required: false }
        ],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      const messages = undeliveredMessages.map(log => ({
        id: log.id,
        recipient: log.recipient,
        channelType: log.CommunicationChannel.channelType,
        templateName: log.MessageTemplate.name,
        status: log.status,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
        clientName: log.Client ? `${log.Client.firstName} ${log.Client.lastName}` : null
      }));

      return {
        success: true,
        data: {
          undeliveredCount: messages.length,
          messages
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo mensajes no entregados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía recordatorios de pago automáticos
   * @returns {Promise<Object>} Resultado del envío de recordatorios
   */
  async sendPaymentReminders() {
    try {
      logger.info('Iniciando envío de recordatorios de pago');

      // Obtener clientes con facturas vencidas
      const overdueClients = await ClientBilling.findAll({
        where: {
          nextDueDate: {
            [db.Sequelize.Op.lt]: new Date()
          },
          clientStatus: ['active', 'suspended']
        },
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp']
          },
          {
            model: servicePackage,
            attributes: ['name', 'price']
          }
        ]
      });

      let results = {
        processed: 0,
        sent: 0,
        failed: 0,
        details: []
      };

      // Buscar template de recordatorio de pago
      const reminderTemplate = await MessageTemplate.findOne({
        where: { templateType: 'payment_reminder', active: true }
      });

      if (!reminderTemplate) {
        throw new Error('Template de recordatorio de pago no encontrado');
      }

      for (const billing of overdueClients) {
        results.processed++;
        
        try {
          const client = billing.Client;
          const daysOverdue = Math.floor((new Date() - new Date(billing.nextDueDate)) / (1000 * 60 * 60 * 24));

          // Verificar si ya se envió recordatorio reciente
          const recentReminder = await PaymentReminder.findOne({
            where: {
              clientId: client.id,
              createdAt: {
                [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
              }
            }
          });

          if (recentReminder) {
            continue; // Skip si ya se envió recordatorio reciente
          }

          const variables = {
            nombre_cliente: `${client.firstName} ${client.lastName}`,
            dias_vencido: daysOverdue.toString(),
            monto_adeudado: billing.monthlyFee.toString(),
            fecha_vencimiento: moment(billing.nextDueDate).format('DD/MM/YYYY'),
            paquete_servicio: billing.servicePackage.name
          };

          // Determinar canal preferido (email primero, luego WhatsApp)
          let channelType = 'email';
          let recipient = client.email;

          if (!client.email && client.whatsapp) {
            channelType = 'whatsapp';
            recipient = client.whatsapp;
          }

          if (recipient) {
            // Enviar recordatorio
            await this.sendMessage(
              channelType,
              recipient,
              reminderTemplate.id,
              variables,
              client.id
            );

            // Registrar recordatorio
            await PaymentReminder.create({
              clientId: client.id,
              reminderType: channelType,
              status: 'sent',
              daysOverdue: daysOverdue,
              messageSent: `Recordatorio enviado por ${channelType}`,
              sentAt: new Date()
            });

            results.sent++;
            results.details.push({
              clientId: client.id,
              clientName: `${client.firstName} ${client.lastName}`,
              channel: channelType,
              recipient,
              daysOverdue,
              status: 'sent'
            });

          } else {
            results.failed++;
            results.details.push({
              clientId: client.id,
              clientName: `${client.firstName} ${client.lastName}`,
              status: 'failed',
              error: 'No hay email ni WhatsApp configurado'
            });
          }

        } catch (error) {
          results.failed++;
          results.details.push({
            clientId: billing.Client.id,
            clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
            status: 'failed',
            error: error.message
          });
        }
      }

      logger.info(`Recordatorios de pago completados: ${results.sent} enviados, ${results.failed} fallidos`);

      return {
        success: true,
        data: results,
        message: `Proceso completado: ${results.sent}/${results.processed} recordatorios enviados`
      };

    } catch (error) {
      logger.error(`Error enviando recordatorios de pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía notificaciones de instalación
   * @param {number} ticketId - ID del ticket de instalación
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendInstallationNotifications(ticketId) {
    try {
      logger.info(`Enviando notificación de instalación para ticket ${ticketId}`);

      const ticket = await Ticket.findByPk(ticketId, {
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp']
          },
          {
            model: User,
            as: 'assignedTo',
            attributes: ['id', 'fullName', 'email']
          }
        ]
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      // Buscar template de instalación
      const installationTemplate = await MessageTemplate.findOne({
        where: { templateType: 'installation', active: true }
      });

      if (!installationTemplate) {
        throw new Error('Template de instalación no encontrado');
      }

      const client = ticket.Client;
      const technician = ticket.assignedTo;

      const variables = {
        nombre_cliente: `${client.firstName} ${client.lastName}`,
        fecha_instalacion: ticket.scheduledDate ? moment(ticket.scheduledDate).format('DD/MM/YYYY') : 'Por confirmar',
        hora_instalacion: ticket.scheduledTime || 'Por confirmar',
        tecnico_asignado: technician ? technician.fullName : 'Por asignar',
        telefono_tecnico: technician ? technician.email : '', // TODO: Agregar campo phone a usuarios
        descripcion_trabajo: ticket.description
      };

      let results = {
        sent: 0,
        failed: 0,
        details: []
      };

      // Enviar por email si está disponible
      if (client.email) {
        try {
          await this.sendMessage(
            'email',
            client.email,
            installationTemplate.id,
            variables,
            client.id
          );

          results.sent++;
          results.details.push({
            channel: 'email',
            recipient: client.email,
            status: 'sent'
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            channel: 'email',
            recipient: client.email,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Enviar por WhatsApp si está disponible
      if (client.whatsapp) {
        try {
          await this.sendMessage(
            'whatsapp',
            client.whatsapp,
            installationTemplate.id,
            variables,
            client.id
          );

          results.sent++;
          results.details.push({
            channel: 'whatsapp',
            recipient: client.whatsapp,
            status: 'sent'
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            channel: 'whatsapp',
            recipient: client.whatsapp,
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          ticketId,
          clientName: `${client.firstName} ${client.lastName}`,
          results
        },
        message: `Notificaciones de instalación: ${results.sent} enviadas, ${results.failed} fallidas`
      };

    } catch (error) {
      logger.error(`Error enviando notificaciones de instalación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía alertas de mantenimiento
   * @param {string} alertType - Tipo de alerta (network_down, maintenance, etc.)
   * @param {string} message - Mensaje de la alerta
   * @param {Array} targetUsers - Usuarios objetivo (opcional, por defecto técnicos)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMaintenanceAlerts(alertType, message, targetUsers = null) {
    try {
      logger.info(`Enviando alerta de mantenimiento: ${alertType}`);

      // Si no se especifican usuarios, obtener técnicos y administradores
      if (!targetUsers) {
        targetUsers = await User.findAll({
          include: [
            {
              model: db.Role,
              where: {
                name: { [db.Sequelize.Op.in]: ['admin', 'tecnico'] }
              }
            }
          ],
          attributes: ['id', 'fullName', 'email']
        });
      }

      // Buscar template de mantenimiento o crear mensaje directo
      let templateId = null;
      const maintenanceTemplate = await MessageTemplate.findOne({
        where: { templateType: 'maintenance', active: true }
      });

      const variables = {
        tipo_alerta: alertType,
        mensaje_alerta: message,
        fecha_alerta: moment().format('DD/MM/YYYY HH:mm'),
        nivel_urgencia: this._getAlertUrgencyLevel(alertType)
      };

      let results = {
        sent: 0,
        failed: 0,
        details: []
      };

      for (const user of targetUsers) {
        try {
          if (user.email) {
            if (maintenanceTemplate) {
              await this.sendMessage(
                'email',
                user.email,
                maintenanceTemplate.id,
                variables
              );
            } else {
              // Envío directo sin template
              await this.sendEmail(
                user.email,
                `Alerta de Sistema: ${alertType}`,
                `${user.fullName},\n\n${message}\n\nFecha: ${moment().format('DD/MM/YYYY HH:mm')}`
              );
            }

            results.sent++;
            results.details.push({
              userId: user.id,
              userName: user.fullName,
              channel: 'email',
              recipient: user.email,
              status: 'sent'
            });
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            userId: user.id,
            userName: user.fullName,
            channel: 'email',
            recipient: user.email,
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          alertType,
          message,
          targetCount: targetUsers.length,
          results
        },
        message: `Alertas de mantenimiento: ${results.sent} enviadas, ${results.failed} fallidas`
      };

    } catch (error) {
      logger.error(`Error enviando alertas de mantenimiento: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Inicializa el transportador de email
   * @private
   */
  async _initializeEmailTransporter() {
    try {
      // Obtener configuración SMTP del sistema
      const smtpConfig = await this._getEmailConfiguration();
      
      this.emailTransporter = nodemailer.createTransporter({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password
        }
      });

      // Verificar conexión
      await this.emailTransporter.verify();
      logger.info('Transportador de email inicializado exitosamente');

    } catch (error) {
      logger.warn(`No se pudo inicializar email: ${error.message}`);
      this.emailTransporter = null;
    }
  }

  /**
   * Inicializa el bot de Telegram
   * @private
   */
  async _initializeTelegramBot() {
    try {
      const telegramToken = await this._getTelegramConfiguration();
      
      if (telegramToken) {
        this.telegramBot = new Telegraf(telegramToken);
        logger.info('Bot de Telegram inicializado exitosamente');
      } else {
        logger.warn('Token de Telegram no configurado');
      }

    } catch (error) {
      logger.warn(`No se pudo inicializar Telegram: ${error.message}`);
      this.telegramBot = null;
    }
  }

  /**
   * Obtiene configuración de email del sistema
   * @private
   */
  async _getEmailConfiguration() {
    try {
      const configs = await SystemConfiguration.findAll({
        where: {
          module: 'email',
          active: true
        }
      });

      const emailConfig = {};
      configs.forEach(config => {
        emailConfig[config.configKey.replace('smtp_', '')] = config.configValue;
      });

      return {
        host: emailConfig.host || process.env.SMTP_HOST || 'localhost',
        port: parseInt(emailConfig.port || process.env.SMTP_PORT || '587'),
        secure: (emailConfig.secure || process.env.SMTP_SECURE) === 'true',
        user: emailConfig.user || process.env.SMTP_USER,
        password: emailConfig.password || process.env.SMTP_PASSWORD
      };

    } catch (error) {
      logger.warn(`Error obteniendo configuración de email: ${error.message}`);
      return {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD
      };
    }
  }

  /**
   * Obtiene configuración de Telegram del sistema
   * @private
   */
  async _getTelegramConfiguration() {
    try {
      const telegramConfig = await SystemConfiguration.findOne({
        where: {
          configKey: 'telegram_bot_token',
          module: 'telegram',
          active: true
        }
      });

      return telegramConfig ? telegramConfig.configValue : process.env.TELEGRAM_BOT_TOKEN;

    } catch (error) {
      logger.warn(`Error obteniendo configuración de Telegram: ${error.message}`);
      return process.env.TELEGRAM_BOT_TOKEN;
    }
  }

  /**
   * Extrae variables de un texto en formato {variable}
   * @private
   */
  _extractVariablesFromText(text) {
    const regex = /{([^}]+)}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Eliminar duplicados
  }

  /**
   * Obtiene fecha de inicio según el período
   * @private
   */
  _getStartDateForPeriod(period) {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Obtiene nivel de urgencia para alertas
   * @private
   */
  _getAlertUrgencyLevel(alertType) {
    switch (alertType.toLowerCase()) {
      case 'network_down':
      case 'critical_failure':
        return 'CRÍTICO';
      case 'maintenance':
      case 'scheduled_downtime':
        return 'INFORMATIVO';
      case 'performance_warning':
      case 'capacity_warning':
        return 'ADVERTENCIA';
      default:
        return 'INFORMATIVO';
    }
  }

  /**
   * Procesa cola de mensajes pendientes
   * @private
   */
  async _processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        
        try {
          await this.sendMessage(
            message.channelType,
            message.recipient,
            message.templateId,
            message.variables,
            message.clientId
          );

          logger.info(`Mensaje de cola procesado exitosamente: ${message.recipient}`);

        } catch (error) {
          logger.error(`Error procesando mensaje de cola: ${error.message}`);
          
          // Reintentar si no ha alcanzado el límite
          if (!message.retryCount) message.retryCount = 0;
          
          if (message.retryCount < this.retryAttempts) {
            message.retryCount++;
            setTimeout(() => {
              this.messageQueue.push(message);
            }, this.retryDelay * message.retryCount);
          }
        }

        // Pausa breve entre mensajes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Agrega mensaje a la cola de procesamiento
   * @private
   */
  _queueMessage(messageData) {
    this.messageQueue.push(messageData);
    
    // Procesar cola si no se está procesando
    if (!this.isProcessingQueue) {
      setTimeout(() => this._processMessageQueue(), 1000);
    }
  }

  /**
   * Limpia logs antiguos de comunicaciones
   * @param {number} daysToKeep - Días a mantener (por defecto 90)
   * @returns {Promise<void>}
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const deletedCount = await CommunicationLog.destroy({
        where: {
          createdAt: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      logger.info(`Limpieza de logs completada: ${deletedCount} registros eliminados`);

    } catch (error) {
      logger.error(`Error en limpieza de logs: ${error.message}`);
    }
  }

  /**
   * Obtiene resumen de actividad de comunicaciones
   * @param {string} period - Período de análisis
   * @returns {Promise<Object>} Resumen de actividad
   */
  async getActivitySummary(period = '30d') {
    try {
      const startDate = this._getStartDateForPeriod(period);

      const summary = await CommunicationLog.findAll({
        where: {
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        include: [{ model: CommunicationChannel }],
        attributes: [
          'channelId',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('CommunicationLog.id')), 'totalMessages'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN status = 'sent' THEN 1 ELSE 0 END")), 'sentMessages'],
          [db.Sequelize.fn('SUM', db.Sequelize.literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")), 'failedMessages']
        ],
        group: ['channelId', 'CommunicationChannel.id', 'CommunicationChannel.name', 'CommunicationChannel.channelType'],
        raw: false
      });

      const activityByChannel = summary.map(item => ({
        channelId: item.channelId,
        channelName: item.CommunicationChannel.name,
        channelType: item.CommunicationChannel.channelType,
        totalMessages: parseInt(item.get('totalMessages')),
        sentMessages: parseInt(item.get('sentMessages')),
        failedMessages: parseInt(item.get('failedMessages')),
        successRate: parseInt(item.get('totalMessages')) > 0 
          ? ((parseInt(item.get('sentMessages')) / parseInt(item.get('totalMessages'))) * 100).toFixed(2)
          : '0.00'
      }));

      const totalActivity = activityByChannel.reduce((acc, channel) => ({
        totalMessages: acc.totalMessages + channel.totalMessages,
        sentMessages: acc.sentMessages + channel.sentMessages,
        failedMessages: acc.failedMessages + channel.failedMessages
      }), { totalMessages: 0, sentMessages: 0, failedMessages: 0 });

      return {
        success: true,
        data: {
          period,
          summary: {
            ...totalActivity,
            overallSuccessRate: totalActivity.totalMessages > 0 
              ? ((totalActivity.sentMessages / totalActivity.totalMessages) * 100).toFixed(2)
              : '0.00'
          },
          channelBreakdown: activityByChannel
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo resumen de actividad: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CommunicationService();