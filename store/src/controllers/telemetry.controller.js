const db = require('../models');
const logger = require('../config/logger');
const geoip = require('geoip-lite');
const { TelemetryData, InstallationMetrics, InstallationLocation, Installation } = db;

exports.recordEvent = async (req, res) => {
  try {
    const { installationKey, eventType, data } = req.body;
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    await TelemetryData.create({
      installationId: installation.id,
      eventType,
      data
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.recordMetrics = async (req, res) => {
  try {
    const { installationKey, cpuUsage, memoryUsage, memoryTotal, memoryUsed, diskUsage, diskTotal, diskUsed, networkUpload, networkDownload, activeConnections } = req.body;
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    await InstallationMetrics.create({
      installationId: installation.id,
      cpuUsage,
      memoryUsage,
      memoryTotal,
      memoryUsed,
      diskUsage,
      diskTotal,
      diskUsed,
      networkUpload,
      networkDownload,
      activeConnections
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.recordLocation = async (req, res) => {
  try {
    const { installationKey, latitude, longitude, accuracy, altitude } = req.body;
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    const ipAddress = req.ip;
    const geo = geoip.lookup(ipAddress);

    await InstallationLocation.create({
      installationId: installation.id,
      latitude,
      longitude,
      accuracy,
      altitude,
      country: geo?.country,
      city: geo?.city,
      region: geo?.region,
      ipAddress
    });

    installation.currentLatitude = latitude;
    installation.currentLongitude = longitude;
    installation.currentCountry = geo?.country;
    installation.currentCity = geo?.city;
    await installation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInstallationTelemetry = async (req, res) => {
  try {
    const { installationKey } = req.params;
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    const telemetry = await TelemetryData.findAll({
      where: { installationId: installation.id },
      limit: 100,
      order: [['timestamp', 'DESC']]
    });

    const metrics = await InstallationMetrics.findAll({
      where: { installationId: installation.id },
      limit: 50,
      order: [['timestamp', 'DESC']]
    });

    const locations = await InstallationLocation.findAll({
      where: { installationId: installation.id },
      limit: 20,
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: { telemetry, metrics, locations }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
