/**
 * Servicio para la gestión de asignación de IPs
 * 
 * Este servicio maneja la asignación, liberación y gestión de IPs
 * para usuarios PPPoE en los routers Mikrotik.
 */

const db = require('../models');
const MikrotikIp = db.MikrotikIp;
const IpPool = db.IpPool;
const MikrotikPPPOE = db.MikrotikPPPOE;
const Client = db.Client;
const MikrotikRouter = db.MikrotikRouter;
const { Op } = require('sequelize');
const mikrotikService = require('./mikrotik.service');

/**
 * Busca una IP disponible en un pool específico
 * @param {number} ipPoolId - ID del pool de IPs
 * @returns {Promise<Object|null>} - IP disponible o null si no hay disponibles
 */
exports.findAvailableIp = async (ipPoolId) => {
  try {
    // Verificar que el pool existe
    const pool = await IpPool.findByPk(ipPoolId);
    if (!pool) {
      throw new Error(`Pool de IPs con ID ${ipPoolId} no encontrado`);
    }
    
    // Buscar una IP disponible
    const availableIp = await MikrotikIp.findOne({
      where: {
        ipPoolId,
        status: 'available'
      },
      order: [['id', 'ASC']] // Tomar la primera disponible
    });
    
    return availableIp;
  } catch (error) {
    console.error('Error al buscar IP disponible:', error);
    throw error;
  }
};

/**
 * Asigna una IP a un usuario PPPoE
 * @param {number} mikrotikPPPOEId - ID del usuario PPPoE
 * @param {number} ipPoolId - ID del pool de IPs (opcional)
 * @param {string} specificIp - IP específica a asignar (opcional)
 * @returns {Promise<Object>} - Detalles de la asignación
 */
exports.assignIpToUser = async (mikrotikPPPOEId, ipPoolId = null, specificIp = null) => {
  try {
    // Obtener el usuario PPPoE
    const pppoeUser = await MikrotikPPPOE.findByPk(mikrotikPPPOEId, {
      include: [
        { model: Client },
        { model: MikrotikRouter }
      ]
    });
    
    if (!pppoeUser) {
      throw new Error(`Usuario PPPoE con ID ${mikrotikPPPOEId} no encontrado`);
    }
    
    // Si no se especifica un pool, usar el del usuario
    if (!ipPoolId) {
      ipPoolId = pppoeUser.ipPoolId;
      
      if (!ipPoolId) {
        throw new Error(`El usuario PPPoE no tiene un pool de IPs asignado`);
      }
    }
    
    let ipToAssign;
    
    // Si se especifica una IP, verificar que esté disponible
    if (specificIp) {
      ipToAssign = await MikrotikIp.findOne({
        where: {
          ipAddress: specificIp,
          ipPoolId,
          status: 'available'
        }
      });
      
      if (!ipToAssign) {
        throw new Error(`La IP ${specificIp} no está disponible en el pool especificado`);
      }
    } else {
      // Buscar una IP disponible en el pool
      ipToAssign = await this.findAvailableIp(ipPoolId);
      
      if (!ipToAssign) {
        throw new Error(`No hay IPs disponibles en el pool con ID ${ipPoolId}`);
      }
    }
    
    // Actualizar la IP como asignada
    await ipToAssign.update({
      status: 'assigned',
      clientId: pppoeUser.clientId,
      mikrotikPPPOEId: pppoeUser.id,
      lastSeen: new Date(),
      comment: `Asignada a ${pppoeUser.Client.name} - ${pppoeUser.username}`
    });
    
    // Actualizar el usuario PPPoE con la IP estática
    await pppoeUser.update({
      staticIp: ipToAssign.ipAddress
    });
    
    // Sincronizar con el router Mikrotik si está disponible
    try {
      if (pppoeUser.MikrotikRouter && pppoeUser.mikrotikId) {
        await mikrotikService.updatePPPoEUser(
          pppoeUser.MikrotikRouter.id,
          pppoeUser.mikrotikId,
          { remoteAddress: ipToAssign.ipAddress }
        );
      }
    } catch (syncError) {
      console.error('Error al sincronizar con el router Mikrotik:', syncError);
      // No lanzar error, ya que la asignación en la base de datos fue exitosa
    }
    
    return {
      success: true,
      message: `IP ${ipToAssign.ipAddress} asignada correctamente al usuario ${pppoeUser.username}`,
      ip: ipToAssign,
      user: pppoeUser
    };
  } catch (error) {
    console.error('Error al asignar IP a usuario:', error);
    throw error;
  }
};

/**
 * Libera una IP asignada a un usuario PPPoE
 * @param {number} mikrotikPPPOEId - ID del usuario PPPoE
 * @returns {Promise<Object>} - Detalles de la liberación
 */
exports.releaseIpFromUser = async (mikrotikPPPOEId) => {
  try {
    // Obtener el usuario PPPoE
    const pppoeUser = await MikrotikPPPOE.findByPk(mikrotikPPPOEId, {
      include: [
        { model: Client },
        { model: MikrotikRouter }
      ]
    });
    
    if (!pppoeUser) {
      throw new Error(`Usuario PPPoE con ID ${mikrotikPPPOEId} no encontrado`);
    }
    
    // Buscar la IP asignada al usuario
    const assignedIp = await MikrotikIp.findOne({
      where: {
        mikrotikPPPOEId: pppoeUser.id
      }
    });
    
    if (!assignedIp) {
      throw new Error(`El usuario PPPoE no tiene una IP asignada`);
    }
    
    // Liberar la IP
    await assignedIp.update({
      status: 'available',
      clientId: null,
      mikrotikPPPOEId: null,
      macAddress: null,
      hostname: null,
      comment: `Liberada de ${pppoeUser.Client.name} - ${pppoeUser.username} el ${new Date().toISOString()}`
    });
    
    // Actualizar el usuario PPPoE
    await pppoeUser.update({
      staticIp: null
    });
    
    // Sincronizar con el router Mikrotik si está disponible
    try {
      if (pppoeUser.MikrotikRouter && pppoeUser.mikrotikId) {
        await mikrotikService.updatePPPoEUser(
          pppoeUser.MikrotikRouter.id,
          pppoeUser.mikrotikId,
          { remoteAddress: null }
        );
      }
    } catch (syncError) {
      console.error('Error al sincronizar con el router Mikrotik:', syncError);
      // No lanzar error, ya que la liberación en la base de datos fue exitosa
    }
    
    return {
      success: true,
      message: `IP ${assignedIp.ipAddress} liberada correctamente del usuario ${pppoeUser.username}`,
      ip: assignedIp,
      user: pppoeUser
    };
  } catch (error) {
    console.error('Error al liberar IP de usuario:', error);
    throw error;
  }
};

/**
 * Importa IPs desde un rango CIDR a un pool
 * @param {number} ipPoolId - ID del pool de IPs
 * @param {string} cidr - Rango CIDR (ej: 192.168.1.0/24)
 * @returns {Promise<Object>} - Resultado de la importación
 */
exports.importIpsFromCidr = async (ipPoolId, cidr) => {
  try {
    // Verificar que el pool existe
    const pool = await IpPool.findByPk(ipPoolId);
    if (!pool) {
      throw new Error(`Pool de IPs con ID ${ipPoolId} no encontrado`);
    }
    
    // Parsear el CIDR
    const [baseIp, prefix] = cidr.split('/');
    if (!baseIp || !prefix) {
      throw new Error(`Formato CIDR inválido: ${cidr}`);
    }
    
    const prefixNum = parseInt(prefix, 10);
    if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) {
      throw new Error(`Prefijo CIDR inválido: ${prefix}`);
    }
    
    // Convertir IP a número
    const ipParts = baseIp.split('.').map(part => parseInt(part, 10));
    if (ipParts.length !== 4 || ipParts.some(part => isNaN(part) || part < 0 || part > 255)) {
      throw new Error(`IP base inválida: ${baseIp}`);
    }
    
    const baseIpNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    
    // Calcular rango de IPs
    const maskBits = 32 - prefixNum;
    const ipCount = Math.pow(2, maskBits);
    
    if (ipCount > 65536) {
      throw new Error(`El rango CIDR es demasiado grande (${ipCount} IPs). Máximo permitido: 65536`);
    }
    
    // Crear array de IPs a insertar
    const ipsToInsert = [];
    const existingIps = new Set();
    
    // Obtener IPs existentes en el pool
    const existingIpRecords = await MikrotikIp.findAll({
      where: { ipPoolId },
      attributes: ['ipAddress']
    });
    
    existingIpRecords.forEach(record => {
      existingIps.add(record.ipAddress);
    });
    
    // Generar IPs
    for (let i = 0; i < ipCount; i++) {
      const ipNum = (baseIpNum & ~((1 << maskBits) - 1)) | i;
      const ip = [
        (ipNum >> 24) & 255,
        (ipNum >> 16) & 255,
        (ipNum >> 8) & 255,
        ipNum & 255
      ].join('.');
      
      // Saltar la primera (dirección de red) y última (broadcast) en cada subred
      if (i === 0 || i === ipCount - 1) {
        continue;
      }
      
      // Verificar si la IP ya existe
      if (!existingIps.has(ip)) {
        ipsToInsert.push({
          ipPoolId,
          ipAddress: ip,
          status: 'available',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Insertar IPs en lotes
    if (ipsToInsert.length > 0) {
      await MikrotikIp.bulkCreate(ipsToInsert);
    }
    
    return {
      success: true,
      message: `Se importaron ${ipsToInsert.length} IPs al pool ${pool.name}`,
      totalIps: ipsToInsert.length,
      pool
    };
  } catch (error) {
    console.error('Error al importar IPs desde CIDR:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de uso de un pool de IPs
 * @param {number} ipPoolId - ID del pool de IPs
 * @returns {Promise<Object>} - Estadísticas del pool
 */
exports.getPoolStats = async (ipPoolId) => {
  try {
    // Verificar que el pool existe
    const pool = await IpPool.findByPk(ipPoolId);
    if (!pool) {
      throw new Error(`Pool de IPs con ID ${ipPoolId} no encontrado`);
    }
    
    // Contar IPs por estado
    const stats = await MikrotikIp.findAll({
      where: { ipPoolId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('status')), 'count']
      ],
      group: ['status']
    });
    
    // Formatear resultados
    const result = {
      poolId: ipPoolId,
      poolName: pool.name,
      total: 0,
      available: 0,
      assigned: 0,
      reserved: 0,
      blocked: 0
    };
    
    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.dataValues.count, 10);
      result.total += parseInt(stat.dataValues.count, 10);
    });
    
    // Calcular porcentaje de uso
    result.usagePercent = result.total > 0 
      ? ((result.total - result.available) / result.total * 100).toFixed(2)
      : 0;
    
    return result;
  } catch (error) {
    console.error('Error al obtener estadísticas del pool:', error);
    throw error;
  }
};

/**
 * Sincroniza las IPs asignadas con el router Mikrotik
 * @param {number} routerId - ID del router Mikrotik
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
exports.syncIpsWithRouter = async (routerId) => {
  try {
    // Obtener el router
    const router = await MikrotikRouter.findByPk(routerId);
    if (!router) {
      throw new Error(`Router con ID ${routerId} no encontrado`);
    }
    
    // Obtener todos los usuarios PPPoE del router con IPs asignadas
    const pppoeUsers = await MikrotikPPPOE.findAll({
      where: {
        mikrotikRouterId: routerId,
        staticIp: { [Op.ne]: null }
      },
      include: [
        { model: Client },
        { 
          model: MikrotikIp,
          required: false
        }
      ]
    });
    
    // Sincronizar cada usuario con el router
    const results = {
      success: [],
      failed: []
    };
    
    for (const user of pppoeUsers) {
      try {
        if (user.mikrotikId) {
          await mikrotikService.updatePPPoEUser(
            routerId,
            user.mikrotikId,
            { remoteAddress: user.staticIp }
          );
          
          results.success.push({
            username: user.username,
            ip: user.staticIp
          });
        } else {
          results.failed.push({
            username: user.username,
            reason: 'No tiene ID de Mikrotik'
          });
        }
      } catch (error) {
        results.failed.push({
          username: user.username,
          reason: error.message
        });
      }
    }
    
    return {
      success: true,
      message: `Sincronización completada: ${results.success.length} exitosos, ${results.failed.length} fallidos`,
      results
    };
  } catch (error) {
    console.error('Error al sincronizar IPs con router:', error);
    throw error;
  }
};

/**
 * Verifica y corrige inconsistencias en las asignaciones de IPs
 * @returns {Promise<Object>} - Resultado de la verificación
 */
exports.verifyIpAssignments = async () => {
  try {
    const issues = {
      multipleIpsPerUser: [],
      orphanedIps: [],
      mismatchedIps: [],
      fixed: {
        multipleIpsPerUser: 0,
        orphanedIps: 0,
        mismatchedIps: 0
      }
    };
    
    // Buscar usuarios con múltiples IPs asignadas
    const usersWithMultipleIps = await MikrotikPPPOE.findAll({
      attributes: ['id', 'username', 'staticIp'],
      include: [
        {
          model: MikrotikIp,
          attributes: ['id', 'ipAddress'],
          required: true
        }
      ],
      group: ['MikrotikPPPOE.id'],
      having: db.sequelize.literal('COUNT(MikrotikIps.id) > 1')
    });
    
    // Corregir usuarios con múltiples IPs
    for (const user of usersWithMultipleIps) {
      issues.multipleIpsPerUser.push({
        userId: user.id,
        username: user.username,
        staticIp: user.staticIp,
        assignedIps: user.MikrotikIps.map(ip => ip.ipAddress)
      });
      
      // Mantener solo la primera IP y liberar las demás
      const [keepIp, ...releaseIps] = user.MikrotikIps;
      
      for (const ip of releaseIps) {
        await ip.update({
          status: 'available',
          clientId: null,
          mikrotikPPPOEId: null,
          macAddress: null,
          hostname: null,
          comment: `Liberada automáticamente por corrección de inconsistencias el ${new Date().toISOString()}`
        });
        
        issues.fixed.multipleIpsPerUser++;
      }
    }
    
    // Buscar IPs huérfanas (asignadas a usuarios que no existen)
    const orphanedIps = await MikrotikIp.findAll({
      where: {
        mikrotikPPPOEId: { [Op.ne]: null },
        status: 'assigned'
      },
      include: [
        {
          model: MikrotikPPPOE,
          required: false
        }
      ],
      having: db.sequelize.literal('MikrotikPPPOE.id IS NULL')
    });
    
    // Corregir IPs huérfanas
    for (const ip of orphanedIps) {
      issues.orphanedIps.push({
        ipId: ip.id,
        ipAddress: ip.ipAddress,
        assignedToId: ip.mikrotikPPPOEId
      });
      
      await ip.update({
        status: 'available',
        clientId: null,
        mikrotikPPPOEId: null,
        macAddress: null,
        hostname: null,
        comment: `Liberada automáticamente por corrección de inconsistencias el ${new Date().toISOString()}`
      });
      
      issues.fixed.orphanedIps++;
    }
    
    // Buscar inconsistencias entre staticIp del usuario y la IP asignada
    const usersWithIps = await MikrotikPPPOE.findAll({
      where: {
        staticIp: { [Op.ne]: null }
      },
      include: [
        {
          model: MikrotikIp,
          required: false
        }
      ]
    });
    
    for (const user of usersWithIps) {
      // Caso 1: Usuario tiene staticIp pero no tiene IP asignada en la tabla MikrotikIp
      if (!user.MikrotikIp) {
        issues.mismatchedIps.push({
          userId: user.id,
          username: user.username,
          staticIp: user.staticIp,
          assignedIp: null,
          issue: 'Usuario tiene staticIp pero no tiene IP asignada'
        });
        
        // Buscar la IP en la tabla MikrotikIp
        const ip = await MikrotikIp.findOne({
          where: { ipAddress: user.staticIp }
        });
        
        if (ip) {
          // Asignar la IP al usuario
          await ip.update({
            status: 'assigned',
            clientId: user.clientId,
            mikrotikPPPOEId: user.id,
            lastSeen: new Date(),
            comment: `Asignada automáticamente por corrección de inconsistencias el ${new Date().toISOString()}`
          });
        } else {
          // Limpiar staticIp del usuario
          await user.update({ staticIp: null });
        }
        
        issues.fixed.mismatchedIps++;
      }
      // Caso 2: La IP asignada no coincide con staticIp
      else if (user.staticIp !== user.MikrotikIp.ipAddress) {
        issues.mismatchedIps.push({
          userId: user.id,
          username: user.username,
          staticIp: user.staticIp,
          assignedIp: user.MikrotikIp.ipAddress,
          issue: 'La IP asignada no coincide con staticIp'
        });
        
        // Actualizar staticIp para que coincida con la IP asignada
        await user.update({ staticIp: user.MikrotikIp.ipAddress });
        
        issues.fixed.mismatchedIps++;
      }
    }
    
    return {
      success: true,
      message: `Verificación completada: ${issues.fixed.multipleIpsPerUser + issues.fixed.orphanedIps + issues.fixed.mismatchedIps} problemas corregidos`,
      issues
    };
  } catch (error) {
    console.error('Error al verificar asignaciones de IPs:', error);
    throw error;
  }
};
