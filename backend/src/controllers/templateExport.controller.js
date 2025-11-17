// backend/src/controllers/templateExport.controller.js
const db = require('../models');
const DocumentTemplate = db.DocumentTemplate;
const TemplateExport = db.TemplateExport;
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

// ===============================
// DUPLICAR PLANTILLA
// ===============================

exports.duplicateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { newName } = req.body;
    const userId = req.userId;

    const originalTemplate = await DocumentTemplate.findByPk(templateId);
    if (!originalTemplate) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Crear copia
    const duplicate = await DocumentTemplate.create({
      ...originalTemplate.toJSON(),
      id: undefined,
      name: newName || `${originalTemplate.name} (Copia)`,
      version: 1,
      parentTemplateId: null,
      isActiveVersion: true,
      enabled: false, // Deshabilitada por defecto
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(201).json({
      message: 'Plantilla duplicada exitosamente',
      template: duplicate
    });
  } catch (error) {
    console.error('Error duplicando plantilla:', error);
    return res.status(500).json({ 
      message: 'Error duplicando plantilla',
      error: error.message 
    });
  }
};

// ===============================
// EXPORTAR PLANTILLA
// ===============================

exports.exportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { format = 'json', includeHtml = true } = req.query;
    const userId = req.userId;

    const template = await DocumentTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Preparar datos de exportación
    const exportData = {
      template: {
        name: template.name,
        description: template.description,
        templateType: template.templateType,
        icon: template.icon,
        category: template.category,
        requiresSignature: template.requiresSignature,
        availableVariables: template.availableVariables,
        config: template.config,
        metadata: template.metadata
      },
      exportInfo: {
        exportedAt: new Date(),
        version: template.version,
        systemVersion: '1.0.0'
      }
    };

    // Incluir HTML si se solicita
    if (includeHtml) {
      try {
        const htmlPath = path.join(
          __dirname,
          '../../templates/documents',
          path.basename(template.filePath)
        );
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        exportData.htmlContent = htmlContent;
        exportData.template.filePath = template.filePath;
      } catch (error) {
        console.error('Error leyendo HTML:', error);
        exportData.htmlContent = null;
      }
    }

    // Generar hash
    const fileHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(exportData))
      .digest('hex');

    // Registrar exportación
    const exportRecord = await TemplateExport.create({
      templateId: template.id,
      exportedBy: userId,
      exportFormat: format,
      exportData: exportData,
      fileHash: fileHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    });

    if (format === 'json') {
      // Exportar como JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${template.name.replace(/\s+/g, '_')}_export.json"`);
      return res.status(200).json(exportData);
    } else if (format === 'zip') {
      // Exportar como ZIP (JSON + HTML)
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${template.name.replace(/\s+/g, '_')}_export.zip"`);
      
      archive.pipe(res);
      
      // Agregar JSON
      archive.append(JSON.stringify(exportData, null, 2), { 
        name: 'template.json' 
      });
      
      // Agregar HTML si existe
      if (exportData.htmlContent) {
        archive.append(exportData.htmlContent, { 
          name: template.filePath 
        });
      }
      
      await archive.finalize();
      
      // Incrementar contador de descargas
      await exportRecord.increment('downloadCount');
    }
  } catch (error) {
    console.error('Error exportando plantilla:', error);
    return res.status(500).json({ 
      message: 'Error exportando plantilla',
      error: error.message 
    });
  }
};

// ===============================
// IMPORTAR PLANTILLA
// ===============================

exports.importTemplate = async (req, res) => {
  try {
    const { templateData, htmlContent, overwriteExisting = false } = req.body;
    const userId = req.userId;

    if (!templateData) {
      return res.status(400).json({ message: 'Datos de plantilla requeridos' });
    }

    // Verificar si ya existe una plantilla con el mismo nombre
    const existingTemplate = await DocumentTemplate.findOne({
      where: { name: templateData.name }
    });

    if (existingTemplate && !overwriteExisting) {
      return res.status(409).json({ 
        message: 'Ya existe una plantilla con ese nombre',
        existingId: existingTemplate.id
      });
    }

    // Generar nombre de archivo único si se incluye HTML
    let filePath = templateData.filePath;
    if (htmlContent) {
      const timestamp = Date.now();
      filePath = `imported_${timestamp}_${path.basename(templateData.filePath)}`;
      
      // Guardar archivo HTML
      const htmlPath = path.join(
        __dirname,
        '../../templates/documents',
        filePath
      );
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');
    }

    // Crear plantilla
    const imported = await DocumentTemplate.create({
      ...templateData,
      filePath: filePath,
      version: 1,
      isActiveVersion: true,
      enabled: false, // Deshabilitada por defecto
      createdBy: userId,
      updatedBy: userId
    });

    return res.status(201).json({
      message: 'Plantilla importada exitosamente',
      template: imported
    });
  } catch (error) {
    console.error('Error importando plantilla:', error);
    return res.status(500).json({ 
      message: 'Error importando plantilla',
      error: error.message 
    });
  }
};

// ===============================
// OBTENER HISTORIAL DE EXPORTACIONES
// ===============================

exports.getExportHistory = async (req, res) => {
  try {
    const { templateId } = req.params;

    const exports = await TemplateExport.findAll({
      where: { templateId },
      include: [
        {
          model: db.User,
          as: 'exporter',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return res.status(200).json(exports);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo historial de exportaciones',
      error: error.message 
    });
  }
};