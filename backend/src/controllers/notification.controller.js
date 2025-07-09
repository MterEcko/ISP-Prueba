// backend/src/controllers/notification.controller.js
const db = require('../models');
const logger = require('../utils/logger');

const NotificationRule = db.NotificationRule;
const NotificationQueue = db.NotificationQueue;
const CommunicationEvent = db.CommunicationEvent;
const CommunicationContact = db.CommunicationContact;
const MessageTemplate = db.MessageTemplate;
const CommunicationChannel = db.CommunicationChannel;
const Client = db.Client;

// ==================== REGLAS DE NOTIFICACIÓN ====================

/**
 * Obtener todas las reglas
 * GET /api/notification-rules
 */
exports.getAllRules = async (req, res) => {
  try {
    const { eventType, channelType, active } = req.query;
    
    const whereClause = {};
    if (eventType) whereClause.eventType = eventType;
    if (channelType) whereClause.channelType = channelType;
    if (active !== undefined) whereClause.active = active === 'true';

    const rules = await NotificationRule.findAll({
      where: whereClause,
      include: [
        {
          model: MessageTemplate,
          attributes: ['id', 'name', 'templateType'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: rules,
      message: `${rules.length} reglas encontradas`
    });

  } catch (error) {
    logger.error(`Error obteniendo reglas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener regla por ID
 * GET /api/notification-rules/:id
 */
exports.getRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await NotificationRule.findByPk(id, {
      include: [
        {
          model: MessageTemplate,
          attributes: ['id', 'name', 'templateType', 'messageBody']
        }
      ]
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: rule,
      message: 'Regla obtenida exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo regla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nueva regla
 * POST /api/notification-rules
 */
exports.createRule = async (req, res) => {
  try {
    const {
      name,
      eventType,
      triggerCondition = {},
      channelType,
      templateId,
      delayMinutes = 0,
      active = true,
      priority = 'normal'
    } = req.body;

    if (!name || !eventType || !channelType) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, tipo de evento y canal son requeridos'
      });
    }

    // Verificar que la plantilla existe si se especifica
    if (templateId) {
      const template = await MessageTemplate.findByPk(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Plantilla no encontrada'
        });
      }
    }

    const rule = await NotificationRule.create({
      name,
      eventType,
      triggerCondition,
      channelType,
      templateId: templateId || null,
      delayMinutes,
      active,
      priority
    });

    logger.info(`Regla de notificación "${name}" creada exitosamente`);

    return res.status(201).json({
      success: true,
      data: rule,
      message: 'Regla creada exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando regla: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar regla
 * PUT /api/notification-rules/:id
 */
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await NotificationRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    // Verificar plantilla si se especifica
    if (updateData.templateId) {
      const template = await MessageTemplate.findByPk(updateData.templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Plantilla no encontrada'
        });
      }
    }

    await rule.update(updateData);

    logger.info(`Regla "${rule.name}" actualizada`);

    return res.status(200).json({
      success: true,
      data: rule,
      message: 'Regla actualizada exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando regla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar regla
 * DELETE /api/notification-rules/:id
 */
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await NotificationRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    await rule.destroy();

    logger.info(`Regla "${rule.name}" eliminada`);

    return res.status(200).json({
      success: true,
      message: 'Regla eliminada exitosamente'
    });

  } catch (error) {
    logger.error(`Error eliminando regla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Activar/desactivar regla
 * POST /api/notification-rules/:id/toggle
 */
exports.toggleRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await NotificationRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    await rule.update({ active: !rule.active });

    logger.info(`Regla "${rule.name}" ${rule.active ? 'activada' : 'desactivada'}`);

    return res.status(200).json({
      success: true,
      data: rule,
      message: `Regla ${rule.active ? 'activada' : 'desactivada'} exitosamente`
    });

  } catch (error) {
    logger.error(`Error cambiando estado de regla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Probar regla
 * POST /api/notification-rules/:id/test
 */
exports.testRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, testData = {} } = req.body;

    const rule = await NotificationRule.findByPk(id, {
      include: [{ model: MessageTemplate }]
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla no encontrada'
      });
    }

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'clientId es requerido para la prueba'
      });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Simular evento
    const mockEvent = {
      eventType: rule.eventType,
      entityType: 'client',
      entityId: clientId,
      clientId: clientId,
      eventData: testData
    };

    // Aquí se integraría con el servicio de comunicación para enviar el mensaje de prueba
    // Por ahora solo simularemos la respuesta

    return res.status(200).json({
      success: true,
      data: {
        rule: {
          id: rule.id,
          name: rule.name,
          eventType: rule.eventType,
          channelType: rule.channelType
        },
        client: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email
        },
        mockEvent,
        message: 'Esta es una prueba de la regla. En producción se enviaría el mensaje real.'
      },
      message: 'Prueba de regla ejecutada exitosamente'
    });

  } catch (error) {
    logger.error(`Error probando regla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== EVENTOS DE COMUNICACIÓN ====================

/**
 * Obtener eventos
 * GET /api/communication-events
 */
exports.getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventType,
      processed,
      clientId,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (eventType) whereClause.eventType = eventType;
    if (processed !== undefined) whereClause.processed = processed === 'true';
    if (clientId) whereClause.clientId = clientId;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: events } = await CommunicationEvent.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      },
      message: `${count} eventos encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo eventos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear evento manual
 * POST /api/communication-events
 */
exports.createEvent = async (req, res) => {
  try {
    const {
      eventType,
      entityType,
      entityId,
      clientId,
      eventData = {},
      priority = 'normal'
    } = req.body;

    if (!eventType || !entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'eventType, entityType y entityId son requeridos'
      });
    }

    const event = await CommunicationEvent.create({
      eventType,
      entityType,
      entityId,
      clientId: clientId || null,
      eventData,
      priority,
      processed: false
    });

    logger.info(`Evento de comunicación creado: ${eventType} para ${entityType}:${entityId}`);

    return res.status(201).json({
      success: true,
      data: event,
      message: 'Evento creado exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando evento: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Procesar eventos pendientes
 * POST /api/communication-events/process
 */
exports.processEvents = async (req, res) => {
  try {
    const { limit = 50, eventType } = req.body;

    const whereClause = { processed: false };
    if (eventType) whereClause.eventType = eventType;

    const pendingEvents = await CommunicationEvent.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });

    let processed = 0;
    let errors = 0;

    for (const event of pendingEvents) {
      try {
        // Buscar reglas que coincidan con este evento
        const matchingRules = await NotificationRule.findAll({
          where: {
            eventType: event.eventType,
            active: true
          },
          include: [{ model: MessageTemplate }]
        });

        let notificationsTriggered = 0;

        for (const rule of matchingRules) {
          try {
            // Evaluar condiciones del trigger
            if (this._evaluateTriggerConditions(rule.triggerCondition, event.eventData)) {
              // Programar notificación
              const scheduledFor = new Date(Date.now() + (rule.delayMinutes * 60 * 1000));
              
              await NotificationQueue.create({
                clientId: event.clientId,
                ruleId: rule.id,
                templateId: rule.templateId,
                recipient: '', // Se determinará al procesar
                messageData: JSON.stringify({
                  channelType: rule.channelType,
                  eventData: event.eventData,
                  ruleId: rule.id,
                  templateId: rule.templateId
                }),
                scheduledFor,
                priority: rule.priority
              });

              notificationsTriggered++;
            }
          } catch (ruleError) {
            logger.error(`Error procesando regla ${rule.id}: ${ruleError.message}`);
          }
        }

        // Marcar evento como procesado
        await event.update({
          processed: true,
          processedAt: new Date(),
          notificationsTriggered
        });

        processed++;

      } catch (eventError) {
        logger.error(`Error procesando evento ${event.id}: ${eventError.message}`);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalEvents: pendingEvents.length,
        processed,
        errors
      },
      message: `${processed} eventos procesados, ${errors} errores`
    });

  } catch (error) {
    logger.error(`Error procesando eventos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== CONTACTOS DE COMUNICACIÓN ====================

/**
 * Obtener contactos de cliente
 * GET /api/clients/:clientId/contacts
 */
exports.getClientContacts = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const contacts = await CommunicationContact.findAll({
      where: { clientId },
      order: [['isPreferred', 'DESC'], ['contactType', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: contacts,
      message: `${contacts.length} contactos encontrados`
    });

  } catch (error) {
    logger.error(`Error obteniendo contactos del cliente ${req.params.clientId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear contacto para cliente
 * POST /api/clients/:clientId/contacts
 */
exports.createClientContact = async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      contactType,
      contactValue,
      isPreferred = false,
      preferences = {},
      optIn = true,
      notes
    } = req.body;

    if (!contactType || !contactValue) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de contacto y valor son requeridos'
      });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Si se marca como preferido, desmarcar otros del mismo tipo
    if (isPreferred) {
      await CommunicationContact.update(
        { isPreferred: false },
        { 
          where: { 
            clientId, 
            contactType,
            isPreferred: true 
          }
        }
      );
    }

    const contact = await CommunicationContact.create({
      clientId,
      contactType,
      contactValue,
      isPreferred,
      preferences,
      optIn,
      optInDate: optIn ? new Date() : null,
      notes
    });

    logger.info(`Contacto ${contactType} creado para cliente ${clientId}`);

    return res.status(201).json({
      success: true,
      data: contact,
      message: 'Contacto creado exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando contacto: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar contacto
 * PUT /api/contacts/:id
 */
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const contact = await CommunicationContact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Si se marca como preferido, desmarcar otros del mismo tipo
    if (updateData.isPreferred && !contact.isPreferred) {
      await CommunicationContact.update(
        { isPreferred: false },
        { 
          where: { 
            clientId: contact.clientId, 
            contactType: contact.contactType,
            isPreferred: true,
            id: { [db.Sequelize.Op.ne]: id }
          }
        }
      );
    }

    await contact.update(updateData);

    logger.info(`Contacto ${contact.contactType} actualizado`);

    return res.status(200).json({
      success: true,
      data: contact,
      message: 'Contacto actualizado exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando contacto ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar contacto
 * DELETE /api/contacts/:id
 */
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await CommunicationContact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    await contact.destroy();

    logger.info(`Contacto ${contact.contactType} eliminado`);

    return res.status(200).json({
      success: true,
      message: 'Contacto eliminado exitosamente'
    });

  } catch (error) {
    logger.error(`Error eliminando contacto ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Verificar contacto
 * POST /api/contacts/:id/verify
 */
exports.verifyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified = true } = req.body;

    const contact = await CommunicationContact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    await contact.update({
      verified,
      verifiedAt: verified ? new Date() : null
    });

    logger.info(`Contacto ${contact.contactType} ${verified ? 'verificado' : 'no verificado'}`);

    return res.status(200).json({
      success: true,
      data: contact,
      message: `Contacto ${verified ? 'verificado' : 'marcado como no verificado'} exitosamente`
    });

  } catch (error) {
    logger.error(`Error verificando contacto ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar preferencias de contacto
 * PUT /api/contacts/:id/preferences
 */
exports.updateContactPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { preferences, optIn } = req.body;

    const contact = await CommunicationContact.findByPk(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    const updateData = {};
    if (preferences) updateData.preferences = { ...contact.preferences, ...preferences };
    if (optIn !== undefined) {
      updateData.optIn = optIn;
      if (optIn) {
        updateData.optInDate = new Date();
        updateData.optOutDate = null;
      } else {
        updateData.optOutDate = new Date();
      }
    }

    await contact.update(updateData);

    logger.info(`Preferencias de contacto ${contact.contactType} actualizadas`);

    return res.status(200).json({
      success: true,
      data: contact,
      message: 'Preferencias actualizadas exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando preferencias del contacto ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ==================== MÉTODOS PRIVADOS ====================

/**
 * Evaluar condiciones de trigger
 * @private
 */
exports._evaluateTriggerConditions = function(conditions, eventData) {
  try {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true; // Sin condiciones = siempre se ejecuta
    }

    // Evaluación simple de condiciones
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = eventData[key];
      
      if (typeof expectedValue === 'object' && expectedValue !== null) {
        // Condiciones complejas (ej: { "operator": "gt", "value": 5 })
        const { operator, value } = expectedValue;
        
        switch (operator) {
          case 'eq':
            if (actualValue !== value) return false;
            break;
          case 'ne':
            if (actualValue === value) return false;
            break;
          case 'gt':
            if (Number(actualValue) <= Number(value)) return false;
            break;
          case 'gte':
            if (Number(actualValue) < Number(value)) return false;
            break;
          case 'lt':
            if (Number(actualValue) >= Number(value)) return false;
            break;
          case 'lte':
            if (Number(actualValue) > Number(value)) return false;
            break;
          case 'contains':
            if (!String(actualValue).includes(String(value))) return false;
            break;
          default:
            if (actualValue !== expectedValue) return false;
        }
      } else {
        // Comparación simple
        if (actualValue !== expectedValue) return false;
      }
    }

    return true;

  } catch (error) {
    logger.error(`Error evaluando condiciones: ${error.message}`);
    return false;
  }
};