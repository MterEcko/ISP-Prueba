// backend/src/controllers/ip.pool.controller.js
const db = require('../models');
const ClientBilling = db.ClientBilling;
const IpPool = db.IpPool;
const MikrotikRouter = db.MikrotikRouter;
const logger = require('../utils/logger');

// Método: Obtener todos los pools de IP
exports.getAllIpPools = async (req, res) => {
  try {
    const ipPools = await IpPool.findAll({
      include: [
        {
          model: MikrotikRouter,
          as: 'MikrotikRouter',
          attributes: ['id', 'name', 'ipAddress'],
        },
      ],
      order: [['poolName', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: ipPools,
      message: 'IP pools retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving IP pools: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving IP pools',
    });
  }
};

// Método: Obtener un pool de IP por ID
exports.getIpPoolById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const ipPool = await IpPool.findByPk(id, {
      include: [
        {
          model: MikrotikRouter,
          as: 'MikrotikRouter',
          attributes: ['id', 'name', 'ipAddress'],
        },
      ],
    });

    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: ipPool,
      message: 'IP pool retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving IP pool: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving IP pool',
    });
  }
};

// Método: Crear un nuevo pool de IP
exports.createIpPool = async (req, res) => {
  try {
    const {
      mikrotikRouterId, // ✅ Cambiado de mikrotikId
      poolName,
      networkAddress,
      startIp,
      endIp,
      gateway,
      dnsPrimary,
      dnsSecondary,
      poolType,
      active,
    } = req.body;

    if (!mikrotikRouterId || !poolName || !networkAddress || !startIp || !endIp) {
      return res.status(400).json({
        success: false,
        message: 'Mikrotik router ID, pool name, network address, start IP, and end IP are required',
      });
    }

    // Verificar si existe el router Mikrotik
    const mikrotikRouter  = await MikrotikRouter.findByPk(mikrotikRouterId); // ✅ Cambiado
    if (!mikrotikRouter) {
      return res.status(404).json({
        success: false,
        message: 'Mikrotik router not found',
      });
    }

    // Verificar si el nombre del pool ya existe para este router
    const existingPool = await IpPool.findOne({
      where: {
        mikrotikRouterId, // ✅ Cambiado
        poolName,
      },
    });

    if (existingPool) {
      return res.status(400).json({
        success: false,
        message: 'IP pool name already exists for this router',
      });
    }

    const newIpPool = await IpPool.create({
      mikrotikRouterId, // ✅ Cambiado
      poolName,
      networkAddress,
      startIp,
      endIp,
      gateway,
      dnsPrimary,
      dnsSecondary,
      poolType: poolType || 'active',
      active: active !== undefined ? active : true,
    });

    return res.status(201).json({
      success: true,
      data: newIpPool,
      message: 'IP pool created successfully',
    });
  } catch (error) {
    logger.error(`Error creating IP pool: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating IP pool',
    });
  }
};

// Método: Actualizar un pool de IP
exports.updateIpPool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mikrotikRouterId, // ✅ Cambiado
      poolName,
      networkAddress,
      startIp,
      endIp,
      gateway,
      dnsPrimary,
      dnsSecondary,
      poolType,
      active,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const ipPool = await IpPool.findByPk(id);
    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found',
      });
    }

    // Verificar si se cambia el router Mikrotik y si existe
    if (mikrotikRouterId && mikrotikRouterId !== ipPool.mikrotikRouterId) { // ✅ Cambiado
      const MikrotikRouter = await MikrotikRouter.findByPk(mikrotikRouterId); // ✅ Cambiado
      if (!mikrotikRouter) {
        return res.status(404).json({
          success: false,
          message: 'Mikrotik router not found',
        });
      }
    }

    // Verificar si se cambia el nombre del pool y si ya existe
    if (poolName && poolName !== ipPool.poolName) {
      const existingPool = await IpPool.findOne({
        where: {
          mikrotikRouterId: mikrotikRouterId || ipPool.mikrotikRouterId, // ✅ Cambiado
          poolName,
        },
      });
      if (existingPool) {
        return res.status(400).json({
          success: false,
          message: 'IP pool name already exists for this router',
        });
      }
    }

    await ipPool.update({
      mikrotikRouterId: mikrotikRouterId || ipPool.mikrotikRouterId, // ✅ Cambiado
      poolName: poolName || ipPool.poolName,
      networkAddress: networkAddress || ipPool.networkAddress,
      startIp: startIp || ipPool.startIp,
      endIp: endIp || ipPool.endIp,
      gateway: gateway || ipPool.gateway,
      dnsPrimary: dnsPrimary || ipPool.dnsPrimary,
      dnsSecondary: dnsSecondary || ipPool.dnsSecondary,
      poolType: poolType || ipPool.poolType,
      active: active !== undefined ? active : ipPool.active,
    });

    return res.status(200).json({
      success: true,
      data: ipPool,
      message: 'IP pool updated successfully',
    });
  } catch (error) {
    logger.error(`Error updating IP pool: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating IP pool',
    });
  }
};

// Método: Eliminar un pool de IP
exports.deleteIpPool = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const ipPool = await IpPool.findByPk(id);
    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found',
      });
    }

    // Verificar si el pool está asociado con clientes
    const clientCount = await ClientBilling.count({
      where: { currentIpPoolId: id },
    });
    if (clientCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete IP pool. It is associated with ${clientCount} clients.`,
      });
    }

    await ipPool.destroy();

    return res.status(200).json({
      success: true,
      message: 'IP pool deleted successfully',
    });
  } catch (error) {
    logger.error(`Error deleting IP pool: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting IP pool',
    });
  }
};

// Método: Obtener pools de IP por ID de router Mikrotik
exports.getIpPoolsByMikrotikId = async (req, res) => {
  try {
    const { mikrotikRouterId } = req.params; // ✅ Cambiado el nombre del parámetro
    if (!mikrotikRouterId) {
      return res.status(400).json({
        success: false,
        message: 'Mikrotik router ID is required',
      });
    }

    const ipPools = await IpPool.findAll({
      where: { mikrotikRouterId }, // ✅ Cambiado
      order: [['poolName', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: ipPools,
      message: 'IP pools retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving IP pools: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving IP pools',
    });
  }
};

// Método: Obtener pools de IP por tipo
exports.getIpPoolsByType = async (req, res) => {
  try {
    const { poolType } = req.params;
    if (!poolType) {
      return res.status(400).json({
        success: false,
        message: 'Pool type is required',
      });
    }

    const ipPools = await IpPool.findAll({
      where: { poolType },
      include: [
        {
          model: MikrotikRouter,
          as: 'MikrotikRouter',
          attributes: ['id', 'name', 'ipAddress'],
        },
      ],
      order: [['poolName', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: ipPools,
      message: 'IP pools retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving IP pools: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving IP pools',
    });
  }
};

// Método: Obtener clientes en un pool
exports.getPoolClients = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const clients = await ClientBilling.findAll({
      where: { currentIpPoolId: id },
      include: [
        {
          model: db.Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: clients,
      message: 'Pool clients retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving pool clients: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving pool clients',
    });
  }
};

// Método: Sincronizar pool de IP con router Mikrotik
exports.syncIpPoolWithRouter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const ipPool = await IpPool.findByPk(id, {
      include: [
        {
          model: MikrotikRouter,
          as: 'MikrotikRouter',
        },
      ],
    });

    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found',
      });
    }

    // TODO: Integrar con MikrotikService
    // const mikrotikService = require('../services/mikrotik.service');
    // await mikrotikService.syncIpPool(ipPool);

    return res.status(200).json({
      success: true,
      data: ipPool,
      message: 'IP pool synced with router successfully',
    });
  } catch (error) {
    logger.error(`Error syncing IP pool with router: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error syncing IP pool with router',
    });
  }
};

// Método: Obtener IPs disponibles en un pool
exports.getPoolAvailableIPs = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'IP pool ID is required',
      });
    }

    const ipPool = await IpPool.findByPk(id);
    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found',
      });
    }

    // TODO: Integrar con MikrotikService
    // const mikrotikService = require('../services/mikrotik.service');
    // const availableIPs = await mikrotikService.getPoolAvailableIPs(ipPool);

    return res.status(200).json({
      success: true,
      data: {
        pool: ipPool,
        availableIPs: [], // Placeholder para IPs disponibles
      },
      message: 'Available IPs retrieved successfully',
    });
  } catch (error) {
    logger.error(`Error retrieving available IPs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving available IPs',
    });
  }
};

// Método: Sincronizar pools desde Mikrotik
// Sincronizar pools desde Mikrotik
// Sincronizar pools desde Mikrotik
exports.syncPoolsFromMikrotik = async (req, res) => {
  try {
    const { mikrotikRouterId } = req.params;
    
    if (!mikrotikRouterId) {
      return res.status(400).json({
        success: false,
        message: 'Mikrotik router ID es requerido'
      });
    }
    
    // Obtener router Mikrotik con su nodo y zona
    const mikrotikRouter = await db.MikrotikRouter.findByPk(mikrotikRouterId, {
      include: [
        { 
          model: db.Device, 
          as: 'device',
          attributes: ['id', 'name', 'ipAddress']
        },
        {
          model: db.Node,
          attributes: ['id', 'name', 'zoneId'],
          include: [
            {
              model: db.Zone,
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    if (!mikrotikRouter) {
      return res.status(404).json({
        success: false,
        message: 'Router Mikrotik no encontrado'
      });
    }
    
    // Obtener zoneId del nodo (con fallback a zona 1)
    const zoneId = mikrotikRouter.Node?.zoneId || 1;
    
    logger.info(`Sincronizando pools del router ${mikrotikRouter.name} en zona ${zoneId}`);
    
    // Obtener pools del Mikrotik usando el servicio
    const MikrotikService = require('../services/mikrotik.service');
    const pools = await MikrotikService.getIPPools(
      mikrotikRouter.device.ipAddress,
      mikrotikRouter.apiPort,
      mikrotikRouter.username,
      mikrotikRouter.passwordEncrypted
    );
    
    // ✅ AGREGAR ESTOS LOGS PARA DEBUGGING
    console.log('=== DEBUG POOLS MIKROTIK ===');
    console.log('Total pools encontrados:', pools.length);
    pools.forEach((pool, index) => {
      console.log(`Pool ${index}:`, {
        id: pool.id,
        dotId: pool['.id'], 
        name: pool.name,
        ranges: pool.ranges,
        allKeys: Object.keys(pool)
      });
    });
    console.log('============================');

    // Función auxiliar para extraer rangos de IP
    function extractIpRange(ranges) {
      const range = ranges.split(',')[0].trim();
      
      if (range.includes('-')) {
        // Formato: 192.168.1.10-192.168.1.100
        const [start, end] = range.split('-').map(ip => ip.trim());
        const networkParts = start.split('.');
        const networkAddress = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24`;
        
        return {
          startIp: start,
          endIp: end,
          networkAddress: networkAddress
        };
      } else if (range.includes('/')) {
        // Formato: 192.168.1.0/24
        const [network, cidr] = range.split('/');
        const networkParts = network.split('.');
        
        return {
          startIp: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.2`,
          endIp: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.254`,
          networkAddress: range
        };
      } else {
        // IP única
        return {
          startIp: range,
          endIp: range,
          networkAddress: range + '/32'
        };
      }
    }
    
    // Función auxiliar para inferir el tipo de pool
    function inferPoolType(poolName) {
      const name = poolName.toLowerCase();
      
      if (name.includes('activ') || name.includes('client') || name.includes('pppoe')) {
        return 'active';
      }
      
      if (name.includes('suspend') || name.includes('susp')) {
        return 'suspended';
      }
      
      if (name.includes('cort') || name.includes('cut')) {
        return 'cutService';
      }
      
      // Por defecto, asumir activo
      return 'active';
    }
    
    // Sincronizar cada pool
    const syncResults = [];
for (const pool of pools) {
  try {
    // ✅ AGREGAR VALIDACIÓN DEL poolId ANTES DE CREAR
    const poolId = pool['.id'] || pool.id || `auto_${pool.name}`;
    
    if (!poolId) {
      console.error(`❌ Pool sin ID válido:`, pool);
      syncResults.push({
        poolName: pool.name,
        status: 'error',
        error: 'Pool sin ID válido - no se puede sincronizar'
      });
      continue;
    }

    console.log(`✅ Procesando pool: ${pool.name} con ID: ${poolId}`);
    
    // Extraer startIp y endIp del campo ranges
    const { startIp, endIp, networkAddress } = extractIpRange(pool.ranges);
    
    // Inferir tipo de pool basado en el nombre
    const poolType = inferPoolType(pool.name);
    
    const [ipPool, created] = await IpPool.findOrCreate({
      where: {
        mikrotikRouterId: mikrotikRouterId,
        poolId: poolId  // ✅ USAR poolId EN LUGAR DE poolName
      },
      defaults: {
        zoneId: zoneId, // ✅ Usar zoneId del nodo
        mikrotikRouterId: mikrotikRouterId,
        poolId: poolId,  // ✅ AGREGAR poolId AQUÍ
        poolName: pool.name,
        networkAddress: networkAddress,
        startIp: startIp,
        endIp: endIp,
        gateway: networkAddress.includes('/') ? 
          networkAddress.split('/')[0].replace(/\d+$/, '1') : startIp.replace(/\d+$/, '1'),
        dnsPrimary: '8.8.8.8',
        dnsSecondary: '8.8.4.4',
        poolType: poolType,
        active: true,
        ranges: pool.ranges,  // ✅ AGREGAR ranges TAMBIÉN
        lastSyncWithMikrotik: new Date()
      }
    });
    
    // Si ya existía, actualizar datos
    if (!created) {
      await ipPool.update({
        poolName: pool.name,  // ✅ ACTUALIZAR poolName SI CAMBIÓ
        networkAddress: networkAddress,
        startIp: startIp,
        endIp: endIp,
        poolType: poolType,
        ranges: pool.ranges,  // ✅ ACTUALIZAR ranges TAMBIÉN
        lastSyncWithMikrotik: new Date()
      });
    }
    
    syncResults.push({
      poolName: pool.name,
      poolId: poolId,  // ✅ INCLUIR poolId EN RESULTADOS
      poolType: poolType,
      networkAddress: networkAddress,
      status: created ? 'created' : 'updated',
      id: ipPool.id,
      ranges: pool.ranges,
      zoneId: zoneId,
      zoneName: mikrotikRouter.Node?.Zone?.name || 'Zona por defecto'
    });
    
    logger.info(`Pool ${pool.name} (ID: ${poolId}) ${created ? 'creado' : 'actualizado'} en zona ${zoneId}`);
    
  } catch (poolError) {
    logger.error(`Error sincronizando pool ${pool.name}: ${poolError.message}`);
    syncResults.push({
      poolName: pool.name,
      status: 'error',
      error: poolError.message
    });
  }
}
    
    return res.status(200).json({
      success: true,
      data: {
        router: {
          id: mikrotikRouter.id,
          name: mikrotikRouter.name,
          ipAddress: mikrotikRouter.device.ipAddress
        },
        zone: {
          id: zoneId,
          name: mikrotikRouter.Node?.Zone?.name || 'Zona por defecto'
        },
        syncResults: syncResults,
        summary: {
          totalPools: pools.length,
          created: syncResults.filter(r => r.status === 'created').length,
          updated: syncResults.filter(r => r.status === 'updated').length,
          errors: syncResults.filter(r => r.status === 'error').length
        }
      },
      message: `${syncResults.length} pools procesados para router ${mikrotikRouter.name} en zona ${zoneId}`
    });
    
  } catch (error) {
    logger.error(`Error sincronizando pools desde Mikrotik: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error sincronizando pools desde Mikrotik'
    });
  }
};