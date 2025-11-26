// backend/src/controllers/mikrotikPPPOE.controller.js
const db = require("../models");
const MikrotikPPPOE = db.MikrotikPPPOE;

exports.getAll = async (req, res) => {
  try {
    const { mikrotikRouterId, clientId, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (mikrotikRouterId) where.mikrotikRouterId = mikrotikRouterId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const pppoes = await MikrotikPPPOE.findAndCountAll({
      where,
      include: [
        { model: db.MikrotikRouter, as: 'mikrotikRouter', attributes: ['id', 'name', 'host'] },
        { model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] },
        { model: db.Subscription, as: 'subscription', attributes: ['id', 'status'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: pppoes.rows,
      pagination: { total: pppoes.count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(pppoes.count / limit) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const pppoe = await MikrotikPPPOE.findByPk(req.params.id, {
      include: [
        { model: db.MikrotikRouter, as: 'mikrotikRouter' },
        { model: db.Client, as: 'client' },
        { model: db.Subscription, as: 'subscription' }
      ]
    });
    if (!pppoe) return res.status(404).json({ success: false, message: "PPPoE no encontrado" });
    return res.status(200).json({ success: true, data: pppoe });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { mikrotikRouterId, clientId, subscriptionId, username, passwordEncrypted, profileId, poolId, staticIp, mikrotikUserId, status } = req.body;

    if (!mikrotikRouterId || !clientId || !passwordEncrypted || !profileId || !mikrotikUserId) {
      return res.status(400).json({ success: false, message: "mikrotikRouterId, clientId, passwordEncrypted, profileId y mikrotikUserId son obligatorios" });
    }

    const pppoe = await MikrotikPPPOE.create({
      mikrotikRouterId, clientId, subscriptionId, username, passwordEncrypted, profileId, poolId, staticIp, mikrotikUserId, status: status || 'active'
    });

    return res.status(201).json({ success: true, message: "PPPoE creado exitosamente", data: pppoe });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const pppoe = await MikrotikPPPOE.findByPk(req.params.id);
    if (!pppoe) return res.status(404).json({ success: false, message: "PPPoE no encontrado" });

    const { username, passwordEncrypted, profileId, poolId, staticIp, status, lastConnected, uptime, bytesIn, bytesOut } = req.body;
    await pppoe.update({
      username: username || pppoe.username,
      passwordEncrypted: passwordEncrypted || pppoe.passwordEncrypted,
      profileId: profileId || pppoe.profileId,
      poolId: poolId !== undefined ? poolId : pppoe.poolId,
      staticIp: staticIp !== undefined ? staticIp : pppoe.staticIp,
      status: status || pppoe.status,
      lastConnected: lastConnected || pppoe.lastConnected,
      uptime: uptime || pppoe.uptime,
      bytesIn: bytesIn !== undefined ? bytesIn : pppoe.bytesIn,
      bytesOut: bytesOut !== undefined ? bytesOut : pppoe.bytesOut,
      lastSyncWithMikrotik: new Date()
    });

    return res.status(200).json({ success: true, message: "PPPoE actualizado exitosamente", data: pppoe });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const pppoe = await MikrotikPPPOE.findByPk(req.params.id);
    if (!pppoe) return res.status(404).json({ success: false, message: "PPPoE no encontrado" });

    await pppoe.destroy();
    return res.status(200).json({ success: true, message: "PPPoE eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
