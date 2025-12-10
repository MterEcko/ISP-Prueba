// backend/src/controllers/mikrotikIp.controller.js
const db = require("../models");
const MikrotikIp = db.MikrotikIp;

exports.getAll = async (req, res) => {
  try {
    const { ipPoolId, clientId, status } = req.query;
    const where = {};
    if (ipPoolId) where.ipPoolId = ipPoolId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const ips = await MikrotikIp.findAll({
      where,
      include: [
        { model: db.IpPool, as: 'ipPool', attributes: ['id', 'name', 'range'] },
        { model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] },
        { model: db.MikrotikPPPOE, as: 'mikrotikPPPOE', attributes: ['id', 'username'] }
      ],
      order: [['ipAddress', 'ASC']]
    });

    return res.status(200).json({ success: true, data: ips });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const ip = await MikrotikIp.findByPk(req.params.id, {
      include: [
        { model: db.IpPool, as: 'ipPool' },
        { model: db.Client, as: 'client' },
        { model: db.MikrotikPPPOE, as: 'mikrotikPPPOE' }
      ]
    });
    if (!ip) return res.status(404).json({ success: false, message: "IP no encontrada" });
    return res.status(200).json({ success: true, data: ip });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { ipPoolId, ipAddress, clientId, mikrotikPPPOEId, status, macAddress, hostname, comment } = req.body;

    if (!ipPoolId || !ipAddress) {
      return res.status(400).json({ success: false, message: "ipPoolId e ipAddress son obligatorios" });
    }

    const ip = await MikrotikIp.create({
      ipPoolId, ipAddress, clientId, mikrotikPPPOEId, status: status || 'available', macAddress, hostname, comment
    });

    return res.status(201).json({ success: true, message: "IP creada exitosamente", data: ip });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const ip = await MikrotikIp.findByPk(req.params.id);
    if (!ip) return res.status(404).json({ success: false, message: "IP no encontrada" });

    const { clientId, mikrotikPPPOEId, status, macAddress, hostname, comment, lastSeen } = req.body;
    await ip.update({
      clientId: clientId !== undefined ? clientId : ip.clientId,
      mikrotikPPPOEId: mikrotikPPPOEId !== undefined ? mikrotikPPPOEId : ip.mikrotikPPPOEId,
      status: status || ip.status,
      macAddress: macAddress !== undefined ? macAddress : ip.macAddress,
      hostname: hostname !== undefined ? hostname : ip.hostname,
      comment: comment !== undefined ? comment : ip.comment,
      lastSeen: lastSeen || ip.lastSeen
    });

    return res.status(200).json({ success: true, message: "IP actualizada exitosamente", data: ip });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const ip = await MikrotikIp.findByPk(req.params.id);
    if (!ip) return res.status(404).json({ success: false, message: "IP no encontrada" });

    await ip.destroy();
    return res.status(200).json({ success: true, message: "IP eliminada exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
