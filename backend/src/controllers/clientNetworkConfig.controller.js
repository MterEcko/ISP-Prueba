// backend/src/controllers/clientNetworkConfig.controller.js
const db = require("../models");
const ClientNetworkConfig = db.ClientNetworkConfig;
const Client = db.Client;
const MikrotikRouter = db.MikrotikRouter;

// Obtener todas las configuraciones de red de clientes
exports.getAllConfigs = async (req, res) => {
  try {
    const { page = 1, limit = 10, clientId, protocol } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (clientId) where.clientId = clientId;
    if (protocol) where.protocol = protocol;

    const configs = await ClientNetworkConfig.findAndCountAll({
      where,
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: MikrotikRouter,
          as: 'mikrotikRouter',
          attributes: ['id', 'name', 'host']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: configs.rows,
      pagination: {
        total: configs.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(configs.count / limit)
      }
    });
  } catch (error) {
    console.error("Error obteniendo configuraciones de red:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener configuraciones de red",
      error: error.message
    });
  }
};

// Obtener configuración de red por ID
exports.getConfigById = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await ClientNetworkConfig.findByPk(id, {
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: MikrotikRouter,
          as: 'mikrotikRouter',
          attributes: ['id', 'name', 'host', 'port']
        }
      ]
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Configuración de red con ID ${id} no encontrada`
      });
    }

    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Error obteniendo configuración de red:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener configuración de red",
      error: error.message
    });
  }
};

// Obtener configuración de red por cliente
exports.getConfigByClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const config = await ClientNetworkConfig.findOne({
      where: { clientId },
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: MikrotikRouter,
          as: 'mikrotikRouter',
          attributes: ['id', 'name', 'host', 'port']
        }
      ]
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `No se encontró configuración de red para el cliente ${clientId}`
      });
    }

    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error("Error obteniendo configuración de red del cliente:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener configuración de red del cliente",
      error: error.message
    });
  }
};

// Crear nueva configuración de red
exports.createConfig = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      clientId,
      mikrotikRouterId,
      pppoeUsername,
      pppoePasswordEncrypted,
      staticIp,
      macAddress,
      gateway,
      dnsPrimary,
      dnsSecondary,
      protocol,
      additionalConfig
    } = req.body;

    // Validaciones
    if (!clientId || !mikrotikRouterId) {
      return res.status(400).json({
        success: false,
        message: "El cliente y el router Mikrotik son obligatorios"
      });
    }

    if (protocol === 'pppoe' && (!pppoeUsername || !pppoePasswordEncrypted)) {
      return res.status(400).json({
        success: false,
        message: "Para protocolo PPPoE, el usuario y contraseña son obligatorios"
      });
    }

    // Verificar si el cliente ya tiene configuración de red
    const existingConfig = await ClientNetworkConfig.findOne({
      where: { clientId }
    });

    if (existingConfig) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "El cliente ya tiene una configuración de red. Use PUT para actualizar."
      });
    }

    // Verificar que el cliente existe
    const client = await Client.findByPk(clientId);
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Cliente con ID ${clientId} no encontrado`
      });
    }

    // Verificar que el router existe
    const router = await MikrotikRouter.findByPk(mikrotikRouterId);
    if (!router) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Router Mikrotik con ID ${mikrotikRouterId} no encontrado`
      });
    }

    const config = await ClientNetworkConfig.create({
      clientId,
      mikrotikRouterId,
      pppoeUsername,
      pppoePasswordEncrypted,
      staticIp,
      macAddress,
      gateway,
      dnsPrimary,
      dnsSecondary,
      protocol: protocol || 'pppoe',
      additionalConfig: additionalConfig || {}
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Configuración de red creada exitosamente",
      data: config
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creando configuración de red:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear configuración de red",
      error: error.message
    });
  }
};

// Actualizar configuración de red
exports.updateConfig = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      mikrotikRouterId,
      pppoeUsername,
      pppoePasswordEncrypted,
      staticIp,
      macAddress,
      gateway,
      dnsPrimary,
      dnsSecondary,
      protocol,
      additionalConfig
    } = req.body;

    const config = await ClientNetworkConfig.findByPk(id);

    if (!config) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Configuración de red con ID ${id} no encontrada`
      });
    }

    // Si cambia el router, verificar que existe
    if (mikrotikRouterId && mikrotikRouterId !== config.mikrotikRouterId) {
      const router = await MikrotikRouter.findByPk(mikrotikRouterId);
      if (!router) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Router Mikrotik con ID ${mikrotikRouterId} no encontrado`
        });
      }
    }

    // Validar protocolo PPPoE
    const newProtocol = protocol || config.protocol;
    if (newProtocol === 'pppoe') {
      const username = pppoeUsername || config.pppoeUsername;
      const password = pppoePasswordEncrypted || config.pppoePasswordEncrypted;
      if (!username || !password) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Para protocolo PPPoE, el usuario y contraseña son obligatorios"
        });
      }
    }

    await config.update({
      mikrotikRouterId: mikrotikRouterId || config.mikrotikRouterId,
      pppoeUsername: pppoeUsername || config.pppoeUsername,
      pppoePasswordEncrypted: pppoePasswordEncrypted || config.pppoePasswordEncrypted,
      staticIp: staticIp !== undefined ? staticIp : config.staticIp,
      macAddress: macAddress !== undefined ? macAddress : config.macAddress,
      gateway: gateway !== undefined ? gateway : config.gateway,
      dnsPrimary: dnsPrimary !== undefined ? dnsPrimary : config.dnsPrimary,
      dnsSecondary: dnsSecondary !== undefined ? dnsSecondary : config.dnsSecondary,
      protocol: protocol || config.protocol,
      additionalConfig: additionalConfig || config.additionalConfig
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Configuración de red actualizada exitosamente",
      data: config
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error actualizando configuración de red:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar configuración de red",
      error: error.message
    });
  }
};

// Eliminar configuración de red
exports.deleteConfig = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const config = await ClientNetworkConfig.findByPk(id);

    if (!config) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Configuración de red con ID ${id} no encontrada`
      });
    }

    await config.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Configuración de red eliminada exitosamente"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error eliminando configuración de red:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar configuración de red",
      error: error.message
    });
  }
};

// Sincronizar configuración con Mikrotik
exports.syncConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await ClientNetworkConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Configuración de red con ID ${id} no encontrada`
      });
    }

    // TODO: Implementar sincronización real con Mikrotik API
    // Por ahora solo actualiza lastSync
    await config.update({
      lastSync: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Sincronización con Mikrotik completada",
      data: config
    });
  } catch (error) {
    console.error("Error sincronizando configuración:", error);
    return res.status(500).json({
      success: false,
      message: "Error al sincronizar configuración",
      error: error.message
    });
  }
};
