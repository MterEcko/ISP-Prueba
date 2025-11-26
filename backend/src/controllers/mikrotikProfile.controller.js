// backend/src/controllers/mikrotikProfile.controller.js
const db = require("../models");
const MikrotikProfile = db.MikrotikProfile;

exports.getAll = async (req, res) => {
  try {
    const { mikrotikRouterId, servicePackageId, active } = req.query;
    const where = {};
    if (mikrotikRouterId) where.mikrotikRouterId = mikrotikRouterId;
    if (servicePackageId) where.servicePackageId = servicePackageId;
    if (active !== undefined) where.active = active === 'true';

    const profiles = await MikrotikProfile.findAll({
      where,
      include: [
        { model: db.MikrotikRouter, as: 'mikrotikRouter', attributes: ['id', 'name', 'host'] },
        { model: db.ServicePackage, as: 'servicePackage', attributes: ['id', 'name', 'price'] }
      ],
      order: [['profileName', 'ASC']]
    });

    return res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const profile = await MikrotikProfile.findByPk(req.params.id, {
      include: [
        { model: db.MikrotikRouter, as: 'mikrotikRouter' },
        { model: db.ServicePackage, as: 'servicePackage' }
      ]
    });
    if (!profile) return res.status(404).json({ success: false, message: "Perfil no encontrado" });
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { mikrotikRouterId, servicePackageId, profileId, profileName, rateLimit, burstLimit, burstThreshold, burstTime, priority, additionalSettings, active } = req.body;

    if (!mikrotikRouterId || !profileId || !profileName || !rateLimit) {
      return res.status(400).json({ success: false, message: "mikrotikRouterId, profileId, profileName y rateLimit son obligatorios" });
    }

    const profile = await MikrotikProfile.create({
      mikrotikRouterId, servicePackageId, profileId, profileName, rateLimit, burstLimit, burstThreshold, burstTime, priority,
      additionalSettings: additionalSettings || {},
      active: active !== undefined ? active : true
    });

    return res.status(201).json({ success: true, message: "Perfil creado exitosamente", data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const profile = await MikrotikProfile.findByPk(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: "Perfil no encontrado" });

    const { servicePackageId, profileName, rateLimit, burstLimit, burstThreshold, burstTime, priority, additionalSettings, active } = req.body;
    await profile.update({
      servicePackageId: servicePackageId !== undefined ? servicePackageId : profile.servicePackageId,
      profileName: profileName || profile.profileName,
      rateLimit: rateLimit || profile.rateLimit,
      burstLimit: burstLimit !== undefined ? burstLimit : profile.burstLimit,
      burstThreshold: burstThreshold !== undefined ? burstThreshold : profile.burstThreshold,
      burstTime: burstTime !== undefined ? burstTime : profile.burstTime,
      priority: priority !== undefined ? priority : profile.priority,
      additionalSettings: additionalSettings || profile.additionalSettings,
      active: active !== undefined ? active : profile.active,
      lastSync: new Date()
    });

    return res.status(200).json({ success: true, message: "Perfil actualizado exitosamente", data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const profile = await MikrotikProfile.findByPk(req.params.id);
    if (!profile) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Perfil no encontrado" });
    }

    // Verificar si hay usuarios PPPoE usando este perfil
    const pppoeCount = await db.MikrotikPPPOE.count({ where: { profileId: profile.profileId } });
    if (pppoeCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el perfil porque tiene ${pppoeCount} usuario(s) PPPoE asociado(s)`
      });
    }

    await profile.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ success: true, message: "Perfil eliminado exitosamente" });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};
