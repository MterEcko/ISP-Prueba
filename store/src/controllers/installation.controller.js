const db = require('../models');
const logger = require('../config/logger');
const crypto = require('crypto');
const { Installation, License } = db;

exports.registerInstallation = async (req, res) => {
  try {
    const { companyName, contactEmail, contactPhone, hardwareId, systemInfo, softwareVersion } = req.body;
    
    const installationKey = crypto.randomBytes(16).toString('hex').toUpperCase();
    
    const installation = await Installation.create({
      installationKey,
      companyName,
      contactEmail,
      contactPhone,
      hardwareId,
      systemInfo,
      softwareVersion,
      status: 'active',
      lastHeartbeat: new Date(),
      isOnline: true
    });

    logger.info(`Nueva instalación registrada: ${installationKey}`);
    
    res.status(201).json({
      success: true,
      data: installation
    });
  } catch (error) {
    logger.error('Error registrando instalación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { installationKey, latitude, longitude, systemInfo } = req.body;
    
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    installation.lastHeartbeat = new Date();
    installation.isOnline = true;
    if (latitude && longitude) {
      installation.currentLatitude = latitude;
      installation.currentLongitude = longitude;
    }
    if (systemInfo) {
      installation.systemInfo = systemInfo;
    }
    await installation.save();

    res.json({ success: true, message: 'Heartbeat recibido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInstallation = async (req, res) => {
  try {
    const { installationKey } = req.params;
    const installation = await Installation.findOne({
      where: { installationKey },
      include: [{ model: License, as: 'currentLicense' }]
    });

    if (!installation) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    res.json({ success: true, data: installation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockInstallation = async (req, res) => {
  try {
    const { installationKey } = req.params;
    const { reason } = req.body;

    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    installation.status = 'blocked';
    installation.blockedReason = reason;
    installation.blockedAt = new Date();
    await installation.save();

    logger.warn(`Instalación bloqueada: ${installationKey} - Razón: ${reason}`);

    res.json({ success: true, message: 'Instalación bloqueada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockInstallation = async (req, res) => {
  try {
    const { installationKey } = req.params;

    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    installation.status = 'active';
    installation.blockedReason = null;
    installation.blockedAt = null;
    await installation.save();

    logger.info(`Instalación desbloqueada: ${installationKey}`);

    res.json({ success: true, message: 'Instalación desbloqueada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllInstallations = async (req, res) => {
  try {
    const installations = await Installation.findAll({
      include: [{ model: License, as: 'currentLicense' }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: installations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
