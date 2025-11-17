const db = require('../models');
const { Installation, License, Plugin } = db;
const { Op } = require('sequelize');

exports.getDashboard = async (req, res) => {
  try {
    const totalInstallations = await Installation.count();
    const activeInstallations = await Installation.count({ where: { status: 'active' } });
    const onlineInstallations = await Installation.count({ where: { isOnline: true } });
    const blockedInstallations = await Installation.count({ where: { status: 'blocked' } });

    const totalLicenses = await License.count();
    const activeLicenses = await License.count({ where: { status: 'active' } });
    const expiredLicenses = await License.count({ where: { status: 'expired' } });

    const totalPlugins = await Plugin.count();
    const totalDownloads = await Plugin.sum('downloadCount');

    res.json({
      success: true,
      data: {
        installations: { total: totalInstallations, active: activeInstallations, online: onlineInstallations, blocked: blockedInstallations },
        licenses: { total: totalLicenses, active: activeLicenses, expired: expiredLicenses },
        plugins: { total: totalPlugins, totalDownloads }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInstallationsMap = async (req, res) => {
  try {
    const installations = await Installation.findAll({
      attributes: ['id', 'companyName', 'currentLatitude', 'currentLongitude', 'currentCity', 'currentCountry', 'status', 'isOnline'],
      where: {
        currentLatitude: { [Op.not]: null },
        currentLongitude: { [Op.not]: null }
      }
    });

    res.json({ success: true, data: installations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Installation.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        'currentCountry'
      ],
      group: ['currentCountry'],
      where: { currentCountry: { [Op.not]: null } }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
