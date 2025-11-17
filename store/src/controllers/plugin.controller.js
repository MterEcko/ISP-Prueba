const db = require('../models');
const logger = require('../config/logger');
const { Plugin, PluginDownload, Installation } = db;

exports.getAllPlugins = async (req, res) => {
  try {
    const plugins = await Plugin.findAll({
      where: { status: 'published' },
      order: [['downloadCount', 'DESC']]
    });
    res.json({ success: true, data: plugins });
  } catch (error) {
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
