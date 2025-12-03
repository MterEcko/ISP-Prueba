const db = require('../models');
const logger = require('../config/logger');
const { Plugin, PluginDownload, Installation, License } = db;

/**
 * Obtener todos los plugins con filtrado por licencia
 */
exports.getAllPlugins = async (req, res) => {
  try {
    const { licenseKey, category, search } = req.query;

    let whereClause = { status: 'published' };

    // Filtrar por categoría si se proporciona
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    // Buscar por nombre/descripción
    if (search) {
      whereClause = {
        ...whereClause,
        [db.Sequelize.Op.or]: [
          { name: { [db.Sequelize.Op.like]: `%${search}%` } },
          { description: { [db.Sequelize.Op.like]: `%${search}%` } }
        ]
      };
    }

    let plugins = await Plugin.findAll({
      where: whereClause,
      order: [['downloadCount', 'DESC']]
    });

    // Si se proporciona licenseKey, filtrar por licencia
    if (licenseKey) {
      const license = await License.findOne({ where: { licenseKey } });

      if (license) {
        // Agregar información de disponibilidad según licencia
        plugins = plugins.map(plugin => {
          const pluginData = plugin.toJSON();
          const requiredLicense = plugin.requirements?.requiredLicense || 'basic';

          // Determinar si el plugin está disponible para esta licencia
          const licenseHierarchy = { basic: 1, medium: 2, advanced: 3, enterprise: 4 };
          const userLevel = licenseHierarchy[license.planType] || 1;
          const requiredLevel = licenseHierarchy[requiredLicense] || 1;

          pluginData.isAvailable = userLevel >= requiredLevel;
          pluginData.requiresUpgrade = userLevel < requiredLevel;
          pluginData.userLicenseType = license.planType;

          return pluginData;
        });
      }
    }

    res.json({ success: true, data: plugins });
  } catch (error) {
    logger.error('Error getting plugins:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlugin = async (req, res) => {
  try {
    const plugin = await Plugin.findByPk(req.params.id);
    if (!plugin) return res.status(404).json({ success: false, message: 'Plugin no encontrado' });
    res.json({ success: true, data: plugin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadPlugin = async (req, res) => {
  try {
    const { id } = req.params;
    const { installationKey } = req.body;

    const plugin = await Plugin.findByPk(id);
    if (!plugin) return res.status(404).json({ success: false, message: 'Plugin no encontrado' });

    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    plugin.downloadCount += 1;
    await plugin.save();

    await PluginDownload.create({
      pluginId: plugin.id,
      installationId: installation.id,
      version: plugin.version
    });

    res.json({
      success: true,
      data: {
        downloadUrl: `/downloads/${plugin.filePath}`,
        version: plugin.version,
        fileHash: plugin.fileHash
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlugin = async (req, res) => {
  try {
    const plugin = await Plugin.create(req.body);
    res.status(201).json({ success: true, data: plugin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Activar plugin - registra la activación y valida licencia
 */
exports.activatePlugin = async (req, res) => {
  try {
    const { id } = req.params;
    const { installationKey, licenseKey } = req.body;

    // Buscar plugin
    const plugin = await Plugin.findByPk(id);
    if (!plugin) {
      return res.status(404).json({ success: false, message: 'Plugin no encontrado' });
    }

    // Buscar instalación
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    // Buscar licencia
    const license = await License.findOne({ where: { licenseKey } });
    if (!license) {
      return res.status(404).json({ success: false, message: 'Licencia no encontrada' });
    }

    // Validar que la licencia permita este plugin
    const requiredLicense = plugin.requirements?.requiredLicense || 'basic';
    const licenseHierarchy = { basic: 1, medium: 2, advanced: 3, enterprise: 4 };
    const userLevel = licenseHierarchy[license.planType] || 1;
    const requiredLevel = licenseHierarchy[requiredLicense] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Este plugin requiere licencia ${requiredLicense}. Tu licencia es ${license.planType}`,
        requiresUpgrade: true,
        requiredLicense,
        currentLicense: license.planType
      });
    }

    // Si es plugin de pago y no es gratuito, verificar pago
    if (!plugin.isFree && plugin.price > 0) {
      // TODO: Aquí iría la verificación de pago
      // Por ahora asumimos que si llegó aquí puede activarlo
    }

    // Registrar descarga/activación
    await PluginDownload.create({
      pluginId: plugin.id,
      installationId: installation.id,
      version: plugin.version
    });

    // Incrementar contador de descargas
    plugin.downloadCount += 1;
    await plugin.save();

    logger.info(`Plugin ${plugin.name} activado por instalación ${installation.companyName}`);

    res.json({
      success: true,
      message: 'Plugin activado correctamente',
      data: {
        pluginId: plugin.id,
        pluginName: plugin.name,
        version: plugin.version,
        activatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error activating plugin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
