// backend/src/controllers/template.controller.js
const db = require('../models');
const logger = require('../utils/logger');

const MessageTemplate = db.MessageTemplate;
const CommunicationChannel = db.CommunicationChannel;

/**
 * Obtener todas las plantillas
 * GET /api/templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const { channelId, templateType, active } = req.query;
    
    const whereClause = {};
    if (channelId) whereClause.channelId = channelId;
    if (templateType) whereClause.templateType = templateType;
    if (active !== undefined) whereClause.active = active === 'true';

    const templates = await MessageTemplate.findAll({
      where: whereClause,
      include: [
        {
          model: CommunicationChannel,
          as: 'channel',
          attributes: ['id', 'name', 'channelType'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: templates,
      message: `${templates.length} plantillas encontradas`
    });

  } catch (error) {
    logger.error(`Error obteniendo plantillas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener plantilla por ID
 * GET /api/templates/:id
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await MessageTemplate.findByPk(id, {
      include: [
        {
          model: CommunicationChannel,
          as: 'channel',
          attributes: ['id', 'name', 'channelType']
        }
      ]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: template,
      message: 'Plantilla obtenida exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo plantilla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nueva plantilla
 * POST /api/templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      channelId,
      name,
      subject,
      messageBody,
      templateType,
      variables = [],
      active = true
    } = req.body;

    if (!name || !messageBody || !templateType) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, cuerpo del mensaje y tipo de plantilla son requeridos'
      });
    }

    // Verificar que el canal existe si se especifica
    if (channelId) {
      const channel = await CommunicationChannel.findByPk(channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Canal de comunicación no encontrado'
        });
      }
    }

    const template = await MessageTemplate.create({
      channelId: channelId || null,
      name,
      subject: subject || null,
      messageBody,
      templateType,
      variables,
      active
    });

    logger.info(`Plantilla "${name}" creada exitosamente`);

    return res.status(201).json({
      success: true,
      data: template,
      message: 'Plantilla creada exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando plantilla: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar plantilla
 * PUT /api/templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      channelId,
      name,
      subject,
      messageBody,
      templateType,
      variables,
      active
    } = req.body;

    const template = await MessageTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    // Verificar canal si se especifica
    if (channelId && channelId !== template.channelId) {
      const channel = await CommunicationChannel.findByPk(channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Canal de comunicación no encontrado'
        });
      }
    }

    await template.update({
      channelId: channelId !== undefined ? channelId : template.channelId,
      name: name || template.name,
      subject: subject !== undefined ? subject : template.subject,
      messageBody: messageBody || template.messageBody,
      templateType: templateType || template.templateType,
      variables: variables || template.variables,
      active: active !== undefined ? active : template.active
    });

    logger.info(`Plantilla "${template.name}" actualizada`);

    return res.status(200).json({
      success: true,
      data: template,
      message: 'Plantilla actualizada exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando plantilla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar plantilla
 * DELETE /api/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await MessageTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    await template.destroy();

    logger.info(`Plantilla "${template.name}" eliminada`);

    return res.status(200).json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });

  } catch (error) {
    logger.error(`Error eliminando plantilla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Vista previa de plantilla
 * POST /api/templates/:id/preview
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables = {}, clientId } = req.body;

    const template = await MessageTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    // Obtener datos del cliente si se especifica
    let client = null;
    if (clientId) {
      const Client = db.Client;
      client = await Client.findByPk(clientId);
    }

    // Procesar plantilla con variables
    const processedSubject = this._processTemplate(template.subject || '', variables, client);
    const processedBody = this._processTemplate(template.messageBody, variables, client);

    return res.status(200).json({
      success: true,
      data: {
        original: {
          subject: template.subject,
          messageBody: template.messageBody
        },
        processed: {
          subject: processedSubject,
          messageBody: processedBody
        },
        variables: {
          provided: variables,
          client: client ? {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone
          } : null
        }
      },
      message: 'Vista previa generada exitosamente'
    });

  } catch (error) {
    logger.error(`Error generando vista previa: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Duplicar plantilla
 * POST /api/templates/:id/duplicate
 */
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    const originalTemplate = await MessageTemplate.findByPk(id);
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    const duplicatedTemplate = await MessageTemplate.create({
      channelId: originalTemplate.channelId,
      name: newName || `${originalTemplate.name} (Copia)`,
      subject: originalTemplate.subject,
      messageBody: originalTemplate.messageBody,
      templateType: originalTemplate.templateType,
      variables: originalTemplate.variables,
      active: false // Crear como inactiva por defecto
    });

    logger.info(`Plantilla "${originalTemplate.name}" duplicada como "${duplicatedTemplate.name}"`);

    return res.status(201).json({
      success: true,
      data: duplicatedTemplate,
      message: 'Plantilla duplicada exitosamente'
    });

  } catch (error) {
    logger.error(`Error duplicando plantilla ${req.params.id}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener variables disponibles
 * GET /api/templates/variables
 */
exports.getAvailableVariables = async (req, res) => {
  try {
    const variables = {
      client: [
        { name: 'firstName', description: 'Nombre del cliente' },
        { name: 'lastName', description: 'Apellidos del cliente' },
        { name: 'fullName', description: 'Nombre completo del cliente' },
        { name: 'email', description: 'Email del cliente' },
        { name: 'phone', description: 'Teléfono del cliente' },
        { name: 'clientId', description: 'ID del cliente' }
      ],
      billing: [
        { name: 'invoiceNumber', description: 'Número de factura' },
        { name: 'amount', description: 'Monto de la factura' },
        { name: 'dueDate', description: 'Fecha de vencimiento' },
        { name: 'daysOverdue', description: 'Días de atraso' }
      ],
      system: [
        { name: 'currentDate', description: 'Fecha actual' },
        { name: 'currentTime', description: 'Hora actual' },
        { name: 'currentYear', description: 'Año actual' }
      ],
      service: [
        { name: 'servicePlan', description: 'Plan de servicio' },
        { name: 'downloadSpeed', description: 'Velocidad de descarga' },
        { name: 'uploadSpeed', description: 'Velocidad de subida' },
        { name: 'suspensionDate', description: 'Fecha de suspensión' },
        { name: 'reactivationDate', description: 'Fecha de reactivación' }
      ]
    };

    return res.status(200).json({
      success: true,
      data: variables,
      message: 'Variables disponibles obtenidas exitosamente'
    });

  } catch (error) {
    logger.error(`Error obteniendo variables: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Método privado para procesar plantillas
exports._processTemplate = function(template, variables = {}, client = null) {
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
};

