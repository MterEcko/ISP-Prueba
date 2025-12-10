const db = require('../models');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const crypto = require('crypto');

/**
 * Upload plugin to marketplace
 */
exports.uploadPlugin = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const uploadedFile = req.file;
    const tempPath = uploadedFile.path;

    // Extraer y validar ZIP
    const zip = new AdmZip(tempPath);
    const zipEntries = zip.getEntries();

    // Buscar manifest.json
    const manifestEntry = zipEntries.find(entry => entry.entryName === 'manifest.json' || entry.entryName.endsWith('/manifest.json'));

    if (!manifestEntry) {
      await fs.unlink(tempPath);
      return res.status(400).json({
        success: false,
        message: 'El ZIP debe contener un archivo manifest.json'
      });
    }

    // Leer y parsear manifest
    const manifestContent = manifestEntry.getData().toString('utf8');
    let manifest;

    try {
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      await fs.unlink(tempPath);
      return res.status(400).json({
        success: false,
        message: 'El manifest.json tiene un formato JSON inválido'
      });
    }

    // Validar campos requeridos
    const requiredFields = ['name', 'version', 'description', 'author'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length > 0) {
      await fs.unlink(tempPath);
      return res.status(400).json({
        success: false,
        message: `Campos faltantes en manifest.json: ${missingFields.join(', ')}`
      });
    }

    // Verificar si ya existe plugin con ese ID
    const existingPlugin = await db.SystemPlugin.findOne({
      where: { identifier: manifest.identifier || manifest.name.toLowerCase().replace(/\s+/g, '-') }
    });

    if (existingPlugin && req.body.update !== 'true') {
      await fs.unlink(tempPath);
      return res.status(409).json({
        success: false,
        message: 'Ya existe un plugin con ese identificador. Use update=true para actualizar.'
      });
    }

    // Crear directorio de destino
    const pluginIdentifier = manifest.identifier || manifest.name.toLowerCase().replace(/\s+/g, '-');
    const pluginDir = path.join(__dirname, '../../uploads/plugins', pluginIdentifier);

    await fs.mkdir(pluginDir, { recursive: true });

    // Extraer contenido
    zip.extractAllTo(pluginDir, true);

    // Calcular hash del archivo original
    const fileBuffer = await fs.readFile(tempPath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Guardar información en BD
    const pluginData = {
      name: manifest.name,
      identifier: pluginIdentifier,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      authorEmail: manifest.authorEmail || null,
      category: manifest.category || 'general',
      price: manifest.price || 0,
      icon: manifest.icon || null,
      screenshots: manifest.screenshots || [],
      tags: manifest.tags || [],
      requirements: manifest.requirements || {},
      downloadCount: 0,
      rating: 0,
      isActive: req.body.publish === 'true',
      manifestJson: manifest,
      fileHash,
      filePath: path.relative(path.join(__dirname, '../../uploads'), pluginDir),
      fileSize: fileBuffer.length
    };

    let plugin;
    if (existingPlugin) {
      await existingPlugin.update(pluginData);
      plugin = existingPlugin;
    } else {
      plugin = await db.SystemPlugin.create(pluginData);
    }

    // Limpiar archivo temporal
    await fs.unlink(tempPath);

    res.status(201).json({
      success: true,
      data: plugin,
      message: existingPlugin ? 'Plugin actualizado correctamente' : 'Plugin subido correctamente'
    });
  } catch (error) {
    console.error('Error uploading plugin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el plugin',
      error: error.message
    });
  }
};

/**
 * Get plugin upload by ID
 */
exports.getPluginUpload = async (req, res) => {
  try {
    const plugin = await db.SystemPlugin.findByPk(req.params.id);

    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: 'Plugin no encontrado'
      });
    }

    res.json({
      success: true,
      data: plugin
    });
  } catch (error) {
    console.error('Error getting plugin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plugin',
      error: error.message
    });
  }
};

/**
 * Get all uploaded plugins
 */
exports.getAllPluginUploads = async (req, res) => {
  try {
    const where = {};

    if (req.query.category) {
      where.category = req.query.category;
    }

    if (req.query.isActive !== undefined) {
      where.isActive = req.query.isActive === 'true';
    }

    const plugins = await db.SystemPlugin.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: plugins
    });
  } catch (error) {
    console.error('Error getting plugins:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plugins',
      error: error.message
    });
  }
};

/**
 * Update plugin status (publish/unpublish)
 */
exports.updatePluginStatus = async (req, res) => {
  try {
    const plugin = await db.SystemPlugin.findByPk(req.params.id);

    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: 'Plugin no encontrado'
      });
    }

    await plugin.update({
      isActive: req.body.isActive
    });

    res.json({
      success: true,
      data: plugin,
      message: plugin.isActive ? 'Plugin publicado' : 'Plugin despublicado'
    });
  } catch (error) {
    console.error('Error updating plugin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado del plugin',
      error: error.message
    });
  }
};

/**
 * Delete plugin upload
 */
exports.deletePluginUpload = async (req, res) => {
  try {
    const plugin = await db.SystemPlugin.findByPk(req.params.id);

    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: 'Plugin no encontrado'
      });
    }

    // Eliminar directorio del plugin
    const pluginDir = path.join(__dirname, '../../uploads/plugins', plugin.identifier);

    try {
      await fs.rm(pluginDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Could not delete plugin directory:', error);
    }

    // Eliminar de BD
    await plugin.destroy();

    res.json({
      success: true,
      message: 'Plugin eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting plugin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar plugin',
      error: error.message
    });
  }
};

/**
 * Validate plugin manifest
 */
exports.validateManifest = async (req, res) => {
  try {
    const manifest = req.body;

    const requiredFields = ['name', 'version', 'description', 'author'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: `Campos faltantes: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validar formato de versión (semver)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(manifest.version)) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Formato de versión inválido. Use formato semver (ej: 1.0.0)'
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Manifest válido'
    });
  } catch (error) {
    console.error('Error validating manifest:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar manifest',
      error: error.message
    });
  }
};
