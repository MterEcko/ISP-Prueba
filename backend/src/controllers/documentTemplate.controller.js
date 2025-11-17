// backend/src/controllers/documentTemplate.controller.js
const db = require('../models');
const DocumentTemplate = db.DocumentTemplate;
const fs = require('fs').promises;
const path = require('path');

// ===============================
// OBTENER PLANTILLAS ACTIVAS (Para usuarios normales)
// ===============================

exports.getActiveTemplates = async (req, res) => {
  try {
    const { category } = req.query;

    const whereConditions = {
      enabled: true,
      isActiveVersion: true
    };

    if (category) {
      whereConditions.category = category;
    }

    const templates = await DocumentTemplate.findAll({
      where: whereConditions,
      attributes: [
        'id',
        'name',
        'description',
        'icon',
        'category',
        'templateType',
        'requiresSignature',
        'availableVariables'
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    return res.status(200).json(templates);
  } catch (error) {
    console.error('Error obteniendo plantillas activas:', error);
    return res.status(500).json({
      message: 'Error obteniendo plantillas',
      error: error.message
    });
  }
};

// ===============================
// OBTENER TODAS LAS PLANTILLAS (Admin)
// ===============================

exports.getAllTemplates = async (req, res) => {
  try {
    const { category, enabled, search } = req.query;

    const whereConditions = {
      isActiveVersion: true
    };

    if (category) {
      whereConditions.category = category;
    }

    if (enabled !== undefined) {
      whereConditions.enabled = enabled === 'true';
    }

    if (search) {
      whereConditions[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const templates = await DocumentTemplate.findAll({
      where: whereConditions,
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: db.User,
          as: 'updater',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json(templates);
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    return res.status(500).json({
      message: 'Error obteniendo plantillas',
      error: error.message
    });
  }
};

// ===============================
// OBTENER PLANTILLA POR ID
// ===============================

exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await DocumentTemplate.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: db.User,
          as: 'updater',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error('Error obteniendo plantilla:', error);
    return res.status(500).json({
      message: 'Error obteniendo plantilla',
      error: error.message
    });
  }
};

// ===============================
// CREAR PLANTILLA
// ===============================

exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      templateType,
      icon,
      category,
      filePath,
      requiresSignature,
      availableVariables,
      config
    } = req.body;

    const userId = req.userId;

    // Validar que no exista una plantilla con el mismo nombre
    const existingTemplate = await DocumentTemplate.findOne({
      where: { name }
    });

    if (existingTemplate) {
      return res.status(409).json({
        message: 'Ya existe una plantilla con ese nombre'
      });
    }

    // Crear plantilla
    const template = await DocumentTemplate.create({
      name,
      description,
      templateType: templateType || 'contract',
      icon: icon || '??',
      category: category || 'general',
      filePath,
      requiresSignature: requiresSignature || false,
      availableVariables: availableVariables || [],
      config: config || {},
      enabled: false, // Por defecto deshabilitada
      version: 1,
      isActiveVersion: true,
      createdBy: userId,
      updatedBy: userId
    });

    return res.status(201).json({
      message: 'Plantilla creada exitosamente',
      template
    });
  } catch (error) {
    console.error('Error creando plantilla:', error);
    return res.status(500).json({
      message: 'Error creando plantilla',
      error: error.message
    });
  }
};

// ===============================
// ACTUALIZAR PLANTILLA
// ===============================

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const template = await DocumentTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Actualizar campos
    await template.update({
      ...req.body,
      updatedBy: userId
    });

    return res.status(200).json({
      message: 'Plantilla actualizada exitosamente',
      template
    });
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    return res.status(500).json({
      message: 'Error actualizando plantilla',
      error: error.message
    });
  }
};

// ===============================
// HABILITAR/DESHABILITAR PLANTILLA
// ===============================

exports.toggleTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const userId = req.userId;

    const template = await DocumentTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    await template.update({
      enabled: enabled !== undefined ? enabled : !template.enabled,
      updatedBy: userId
    });

    return res.status(200).json({
      message: `Plantilla ${template.enabled ? 'habilitada' : 'deshabilitada'} exitosamente`,
      template
    });
  } catch (error) {
    console.error('Error cambiando estado de plantilla:', error);
    return res.status(500).json({
      message: 'Error cambiando estado',
      error: error.message
    });
  }
};

// ===============================
// ELIMINAR PLANTILLA
// ===============================

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await DocumentTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Verificar si tiene documentos generados
    const documentsCount = await db.GeneratedDocumentHistory.count({
      where: { templateId: id }
    });

    if (documentsCount > 0) {
      return res.status(400).json({
        message: `No se puede eliminar. Hay ${documentsCount} documentos generados con esta plantilla.`,
        documentsCount
      });
    }

    // Eliminar plantilla
    await template.destroy();

    return res.status(200).json({
      message: 'Plantilla eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando plantilla:', error);
    return res.status(500).json({
      message: 'Error eliminando plantilla',
      error: error.message
    });
  }
};

// ===============================
// OBTENER CONTENIDO HTML DE PLANTILLA
// ===============================

exports.getTemplateContent = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await DocumentTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Leer archivo HTML
    const templatePath = path.join(
      __dirname,
      '../../templates/documents',
      path.basename(template.filePath)
    );

    try {
      const htmlContent = await fs.readFile(templatePath, 'utf-8');

      return res.status(200).json({
        template: {
          id: template.id,
          name: template.name,
          filePath: template.filePath
        },
        htmlContent
      });
    } catch (error) {
      return res.status(404).json({
        message: 'Archivo HTML no encontrado',
        path: template.filePath
      });
    }
  } catch (error) {
    console.error('Error obteniendo contenido de plantilla:', error);
    return res.status(500).json({
      message: 'Error obteniendo contenido',
      error: error.message
    });
  }
};

// ===============================
// OBTENER VARIABLES DE UN CLIENTE
// ===============================

exports.getClientVariables = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Obtener cliente con todas las relaciones
    const client = await db.Client.findByPk(clientId, {
      include: [
        {
          model: db.Sector,
          as: 'Sector',
          include: [{
            model: db.Node,
            as: 'Node',
            include: [{
              model: db.Zone,
              as: 'Zone'
            }]
          }]
        },
        {
          model: db.Subscription,
          as: 'subscriptions',
          where: { status: 'active' },
          required: false,
          include: [{
            model: db.ServicePackage,
            as: 'servicePackage'
          }]
        }
      ]
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Construir objeto de variables
    const subscription = client.subscriptions?.[0];

    const variables = {
      // Cliente
      nombre_completo: `${client.firstName} ${client.lastName}`,
      nombre: client.firstName,
      apellidos: client.lastName,
      email: client.email || 'No especificado',
      telefono: client.phone || 'No especificado',
      whatsapp: client.whatsapp || client.phone || 'No especificado',
      domicilio: client.address || 'No especificado',
      
      // Contrato
      numero_cliente: client.id,
      numero_contrato: client.contractNumber || `ISP-${client.id.toString().padStart(6, '0')}`,
      fecha_inicio: client.startDate ? formatDate(client.startDate) : formatDate(new Date()),
      
      // Servicio
      plan_servicio: subscription?.servicePackage?.name || 'No asignado',
      velocidad_descarga: subscription?.servicePackage?.downloadSpeedMbps || 'N/A',
      velocidad_subida: subscription?.servicePackage?.uploadSpeedMbps || 'N/A',
      precio_mensual: subscription?.monthlyFee || subscription?.servicePackage?.price || '0',
      
      // Red
      usuario_pppoe: subscription?.pppoeUsername || 'No asignado',
      ip_asignada: subscription?.assignedIpAddress || 'DHCP',
      
      // Ubicación
      zona: client.Sector?.Node?.Zone?.name || 'No asignada',
      nodo: client.Sector?.Node?.name || 'No asignado',
      sector: client.Sector?.name || 'No asignado',
      
      // Fechas
      fecha_generacion: formatDate(new Date()),
      fecha_instalacion: client.startDate ? formatDate(client.startDate) : formatDate(new Date()),
      
      // Coordenadas
      latitud: client.latitude,
      longitud: client.longitude
    };

    return res.status(200).json({
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      variables
    });
  } catch (error) {
    console.error('Error obteniendo variables del cliente:', error);
    return res.status(500).json({
      message: 'Error obteniendo variables',
      error: error.message
    });
  }
};

// ===============================
// FUNCIÓN AUXILIAR
// ===============================

function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}