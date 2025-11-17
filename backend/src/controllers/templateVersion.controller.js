// backend/src/controllers/templateVersion.controller.js
const db = require('../models');
const DocumentTemplate = db.DocumentTemplate;

// ===============================
// OBTENER VERSIONES DE UNA PLANTILLA
// ===============================

exports.getTemplateVersions = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Obtener plantilla principal
    const template = await DocumentTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Obtener todas las versiones
    const parentId = template.parentTemplateId || template.id;
    
    const versions = await DocumentTemplate.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { id: parentId },
          { parentTemplateId: parentId }
        ]
      },
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName']
        },
        {
          model: db.User,
          as: 'updater',
          attributes: ['id', 'fullName']
        }
      ],
      order: [['version', 'DESC']]
    });

    return res.status(200).json({
      totalVersions: versions.length,
      activeVersion: versions.find(v => v.isActiveVersion),
      versions
    });
  } catch (error) {
    console.error('Error obteniendo versiones:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo versiones',
      error: error.message 
    });
  }
};

// ===============================
// CREAR NUEVA VERSIÓN
// ===============================

exports.createNewVersion = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { versionNotes, ...templateData } = req.body;
    const userId = req.userId;

    const currentTemplate = await DocumentTemplate.findByPk(templateId);
    if (!currentTemplate) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Crear nueva versión
    const newVersion = await DocumentTemplate.create({
      ...currentTemplate.toJSON(),
      ...templateData,
      id: undefined,
      parentTemplateId: currentTemplate.parentTemplateId || currentTemplate.id,
      version: currentTemplate.version + 1,
      isActiveVersion: true,
      versionNotes: versionNotes || 'Nueva versión',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Desactivar versión anterior
    await currentTemplate.update({ 
      isActiveVersion: false,
      updatedBy: userId
    });

    return res.status(201).json({
      message: 'Nueva versión creada exitosamente',
      version: newVersion
    });
  } catch (error) {
    console.error('Error creando versión:', error);
    return res.status(500).json({ 
      message: 'Error creando versión',
      error: error.message 
    });
  }
};

// ===============================
// RESTAURAR VERSIÓN ANTERIOR
// ===============================

exports.restoreVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const userId = req.userId;

    const versionToRestore = await DocumentTemplate.findByPk(versionId);
    if (!versionToRestore) {
      return res.status(404).json({ message: 'Versión no encontrada' });
    }

    // Desactivar versión actual
    const parentId = versionToRestore.parentTemplateId || versionToRestore.id;
    await DocumentTemplate.update(
      { isActiveVersion: false },
      { 
        where: { 
          [db.Sequelize.Op.or]: [
            { id: parentId },
            { parentTemplateId: parentId }
          ],
          isActiveVersion: true
        }
      }
    );

    // Activar versión seleccionada
    await versionToRestore.update({ 
      isActiveVersion: true,
      updatedBy: userId
    });

    return res.status(200).json({
      message: 'Versión restaurada exitosamente',
      version: versionToRestore
    });
  } catch (error) {
    console.error('Error restaurando versión:', error);
    return res.status(500).json({ 
      message: 'Error restaurando versión',
      error: error.message 
    });
  }
};

// ===============================
// COMPARAR DOS VERSIONES
// ===============================

exports.compareVersions = async (req, res) => {
  try {
    const { version1Id, version2Id } = req.query;

    const version1 = await DocumentTemplate.findByPk(version1Id);
    const version2 = await DocumentTemplate.findByPk(version2Id);

    if (!version1 || !version2) {
      return res.status(404).json({ message: 'Una o ambas versiones no encontradas' });
    }

    // Comparar campos importantes
    const comparison = {
      version1: {
        id: version1.id,
        version: version1.version,
        name: version1.name,
        description: version1.description,
        versionNotes: version1.versionNotes,
        updatedAt: version1.updatedAt
      },
      version2: {
        id: version2.id,
        version: version2.version,
        name: version2.name,
        description: version2.description,
        versionNotes: version2.versionNotes,
        updatedAt: version2.updatedAt
      },
      differences: {
        name: version1.name !== version2.name,
        description: version1.description !== version2.description,
        filePath: version1.filePath !== version2.filePath,
        config: JSON.stringify(version1.config) !== JSON.stringify(version2.config),
        availableVariables: JSON.stringify(version1.availableVariables) !== JSON.stringify(version2.availableVariables)
      }
    };

    return res.status(200).json(comparison);
  } catch (error) {
    console.error('Error comparando versiones:', error);
    return res.status(500).json({ 
      message: 'Error comparando versiones',
      error: error.message 
    });
  }
};