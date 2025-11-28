// backend/src/controllers/mikrotikRouter.controller.js
const db = require('../models');
const MikrotikRouter = db.MikrotikRouter;
const Device = db.Device;
const Node = db.Node;
const logger = require('../utils/logger');

const MikrotikRouterController = {
  // Crear router con device automáticamente
  create: async (req, res) => {
    const transaction = await db.sequelize.transaction();
    
    try {
      const {
        // Datos del router
        name,
        ipAddress,
        username,
        password,
        apiPort = 8728,
        systemIdentity,
        routerModel,
        routerosVersion,
        nodeId,
        
        // Datos adicionales del device
        location,
        latitude,
        longitude,
        notes,
        macAddress,
        serialNumber,
        firmwareVersion,
        isFiberDevice = false,  // valor por defecto
        monitoringData,
        specificConfig
      } = req.body;

      // Validaciones
      if (!name || !ipAddress || !username || !password || !nodeId) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, IP, usuario, contraseña y nodo son obligatorios'
        });
      }

      // Verificar que el nodo existe
      const node = await Node.findByPk(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          message: `Nodo con ID ${nodeId} no encontrado`
        });
      }

      // 1. Crear el Device primero
      const device = await Device.create({
        name: name,
        type: 'router',
        brand: 'mikrotik',
        model: routerModel || 'Unknown',
        ipAddress: ipAddress,
		macAddress: macAddress,
		serialNumber: serialNumber,
		firmwareVersion: firmwareVersion,
		isFiberDevice: isFiberDevice,
        username: username,
        password: password, // Considera encriptar esto
        apiPort: apiPort,
        apiType: 'RouterOs',
        status: 'unknown',
        location: location,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
        nodeId: nodeId,
		monitoringData: monitoringData,
		specificConfig: specificConfig,
        active: true,
        connectionParams: {
          apiPort: apiPort,
          protocol: 'RouterOs'
        },
        metadata: {
          isRouterDevice: true,
          routerType: 'mikrotik'
        }
      }, { transaction });

      // 2. Crear el MikrotikRouter con referencia al Device
      const mikrotikRouter = await MikrotikRouter.create({
        deviceId: device.id,
        nodeId: nodeId,
        name: name,
        ipAddress: ipAddress,
        username: username,
        passwordEncrypted: password, // TODO: Implementar encriptación real
        apiPort: apiPort,
        systemIdentity: systemIdentity,
        routerModel: routerModel,
        routerosVersion: routerosVersion,
		lastSync : null,
        active: true
      }, { transaction });

      // 3. Obtener el router creado con todas las relaciones
      const createdRouter = await MikrotikRouter.findByPk(mikrotikRouter.id, {
        include: [
          {
            model: Device,
            as: 'device'
          },
          {
            model: Node,
            attributes: ['id', 'name', 'location']
          }
        ],
        transaction
      });

      await transaction.commit();

      logger.info(`Router Mikrotik ${name} creado exitosamente con Device ID ${device.id}`);

      return res.status(201).json({
        success: true,
        message: 'Router Mikrotik creado exitosamente',
        data: {
          mikrotikRouter: createdRouter,
          deviceId: device.id
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando router Mikrotik: ${error.message}`);
      
      return res.status(500).json({
        success: false,
        message: 'Error al crear router Mikrotik',
        error: error.message
      });
    }
  },

  // Obtener todos los routers
  findAll: async (req, res) => {
    try {
      const { page = 1, size = 10, nodeId, active } = req.query;
      const limit = parseInt(size);
      const offset = (parseInt(page) - 1) * limit;

      const condition = {};
      if (nodeId) condition.nodeId = nodeId;
      if (active !== undefined) condition.active = active === 'true';

      const { count, rows: routers } = await MikrotikRouter.findAndCountAll({
        where: condition,
        limit,
        offset,
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'status', 'lastSeen', 'location']
          },
          {
            model: Node,
            attributes: ['id', 'name', 'location']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        success: true,
        data: {
          totalItems: count,
          routers,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error(`Error obteniendo routers Mikrotik: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener routers',
        error: error.message
      });
    }
  },

  // Obtener router por ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const router = await MikrotikRouter.findByPk(id, {
        include: [
          {
            model: Device,
            as: 'device'
          },
          {
            model: Node,
            attributes: ['id', 'name', 'location']
          },
          {
            model: db.IpPool,
            where: { active: true },
            required: false
            //
          }
        ]
      });

      if (!router) {
        return res.status(404).json({
          success: false,
          message: `Router con ID ${id} no encontrado`
        });
      }

      return res.json({
        success: true,
        data: router
      });

    } catch (error) {
      logger.error(`Error obteniendo router ${req.params.id}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener router',
        error: error.message
      });
    }
  },


// Actualizar router Mikrotik y sincronizar con Device
update: async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Verificar que el router existe
    const router = await MikrotikRouter.findByPk(id, {
      include: [{ model: Device, as: 'device' }]
    });
    
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${id} no encontrado`
      });
    }
    
    // Preparar datos para actualizar MikrotikRouter
    const routerUpdateData = { ...updateData };
    
    // Preparar datos para sincronizar con Device
    const deviceUpdateData = {};
    
    // Sincronizar campos compartidos: MikrotikRouter → Device
    if (updateData.name) deviceUpdateData.name = updateData.name;
    if (updateData.ipAddress) deviceUpdateData.ipAddress = updateData.ipAddress;
    if (updateData.nodeId) deviceUpdateData.nodeId = updateData.nodeId;
    
    // Actualizar MikrotikRouter
    await router.update(routerUpdateData, { transaction });
    
    // Sincronizar con Device si hay campos compartidos
    if (Object.keys(deviceUpdateData).length > 0) {
      await Device.update(deviceUpdateData, {
        where: { id: router.deviceId },
        transaction
      });
    }
    
    // Obtener router actualizado con Device
    const updatedRouter = await MikrotikRouter.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'device'
        },
        {
          model: Node,
          attributes: ['id', 'name', 'location']
        }
      ],
      transaction
    });
    
    await transaction.commit();
    
    logger.info(`Router Mikrotik ${id} actualizado exitosamente`);
    
    return res.json({
      success: true,
      message: 'Router Mikrotik actualizado exitosamente',
      data: updatedRouter
    });
    
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error actualizando router Mikrotik ${req.params.id}: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar router Mikrotik',
      error: error.message
    });
  }
},

  // Eliminar router Mikrotik y su Device asociado
  delete: async (req, res) => {
    const transaction = await db.sequelize.transaction();

    try {
      const { id } = req.params;

      // Verificar que el router existe
      const router = await MikrotikRouter.findByPk(id, {
        include: [{ model: Device, as: 'device' }]
      });

      if (!router) {
        return res.status(404).json({
          success: false,
          message: `Router con ID ${id} no encontrado`
        });
      }

      // Verificar si tiene IpPools asociados
      const ipPoolsCount = await db.IpPool.count({
        where: { mikrotikRouterId: id }
      });

      if (ipPoolsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el router porque tiene ${ipPoolsCount} pool(s) de IP asociado(s)`
        });
      }

      // Verificar si tiene Profiles asociados
      const profilesCount = await db.MikrotikProfile.count({
        where: { mikrotikRouterId: id }
      });

      if (profilesCount > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el router porque tiene ${profilesCount} perfil(es) asociado(s)`
        });
      }

      const deviceId = router.deviceId;

      // Eliminar el MikrotikRouter primero
      await router.destroy({ transaction });

      // Eliminar el Device asociado
      await Device.destroy({
        where: { id: deviceId },
        transaction
      });

      await transaction.commit();

      logger.info(`Router Mikrotik ${id} y su Device ${deviceId} eliminados exitosamente`);

      return res.json({
        success: true,
        message: 'Router Mikrotik eliminado exitosamente'
      });

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error eliminando router Mikrotik ${req.params.id}: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: 'Error al eliminar router Mikrotik',
        error: error.message
      });
    }
  }

};

module.exports = MikrotikRouterController;