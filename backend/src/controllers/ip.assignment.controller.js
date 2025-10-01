/**
 * Controlador para la gestión de IPs
 * 
 * Este controlador maneja las operaciones relacionadas con la asignación
 * y gestión de IPs para usuarios PPPoE.
 */

const ipAssignmentService = require('../services/ip.assignment.service');
const db = require('../models');
const MikrotikIp = db.MikrotikIp;
const IpPool = db.IpPool;
const MikrotikPPPOE = db.MikrotikPPPOE;
const Client = db.Client;

/**
 * Obtiene todas las IPs de un pool específico
 */
exports.getIpsByPool = async (req, res) => {
  try {
    const { poolId } = req.params;
    const { page = 0, size = 10, status } = req.query;
    
    const limit = parseInt(size);
    const offset = page * limit;
    
    // Construir condición de búsqueda
    const condition = { ipPoolId: poolId };
    if (status) {
      condition.status = status;
    }
    
    // Obtener IPs paginadas
    const ips = await MikrotikIp.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        },
        {
          model: MikrotikPPPOE,
          attributes: ['id', 'username', 'status'],
          required: false
        },
        {
          model: IpPool,
          attributes: ['id', 'poolName', 'networkAddress', 'mikrotikRouterId'],
          required: true
        }
      ],
      order: [['ipAddress', 'ASC']]
    });
    
    // Obtener estadísticas del pool
    const poolStats = await ipAssignmentService.getPoolStats(poolId);
    
    return res.send({
      totalItems: ips.count,
      items: ips.rows,
      currentPage: page,
      totalPages: Math.ceil(ips.count / limit),
      stats: poolStats
    });
  } catch (error) {
    console.error('Error al obtener IPs por pool:', error);
    return res.status(500).send({
      message: error.message || 'Error al obtener IPs por pool'
    });
  }
};

/**
 * Asigna una IP a un usuario PPPoE
 */
exports.assignIpToUser = async (req, res) => {
  try {
    const { mikrotikPPPOEId } = req.params;
    const { ipPoolId, specificIp } = req.body;
    
    const result = await ipAssignmentService.assignIpToUser(
      mikrotikPPPOEId,
      ipPoolId,
      specificIp
    );
    
    return res.send(result);
  } catch (error) {
    console.error('Error al asignar IP a usuario:', error);
    return res.status(500).send({
      message: error.message || 'Error al asignar IP a usuario'
    });
  }
};

/**
 * Libera una IP asignada a un usuario PPPoE
 */
exports.releaseIpFromUser = async (req, res) => {
  try {
    const { mikrotikPPPOEId } = req.params;
    
    const result = await ipAssignmentService.releaseIpFromUser(mikrotikPPPOEId);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al liberar IP de usuario:', error);
    return res.status(500).send({
      message: error.message || 'Error al liberar IP de usuario'
    });
  }
};

/**
 * Importa IPs desde un rango CIDR a un pool
 */
exports.importIpsFromCidr = async (req, res) => {
  try {
    const { poolId } = req.params;
    const { cidr } = req.body;
    
    if (!cidr) {
      return res.status(400).send({
        message: 'Se requiere un rango CIDR'
      });
    }
    
    const result = await ipAssignmentService.importIpsFromCidr(poolId, cidr);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al importar IPs desde CIDR:', error);
    return res.status(500).send({
      message: error.message || 'Error al importar IPs desde CIDR'
    });
  }
};

/**
 * Obtiene estadísticas de un pool de IPs
 */
exports.getPoolStats = async (req, res) => {
  try {
    const { poolId } = req.params;
    
    const stats = await ipAssignmentService.getPoolStats(poolId);
    
    return res.send(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas del pool:', error);
    return res.status(500).send({
      message: error.message || 'Error al obtener estadísticas del pool'
    });
  }
};

/**
 * Sincroniza las IPs asignadas con el router Mikrotik
 */
exports.syncIpsWithRouter = async (req, res) => {
  try {
    const { routerId } = req.params;
    
    const result = await ipAssignmentService.syncIpsWithRouter(routerId);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al sincronizar IPs con router:', error);
    return res.status(500).send({
      message: error.message || 'Error al sincronizar IPs con router'
    });
  }
};

/**
 * Verifica y corrige inconsistencias en las asignaciones de IPs
 */
exports.verifyIpAssignments = async (req, res) => {
  try {
    const result = await ipAssignmentService.verifyIpAssignments();
    
    return res.send(result);
  } catch (error) {
    console.error('Error al verificar asignaciones de IPs:', error);
    return res.status(500).send({
      message: error.message || 'Error al verificar asignaciones de IPs'
    });
  }
};

/**
 * Actualiza una IP específica
 */
exports.updateIp = async (req, res) => {
  try {
    const { ipId } = req.params;
    const { status, comment } = req.body;
    
    // Verificar que la IP existe
    const ip = await MikrotikIp.findByPk(ipId);
    if (!ip) {
      return res.status(404).send({
        message: `IP con ID ${ipId} no encontrada`
      });
    }
    
    // Actualizar campos permitidos
    const updateData = {};
    if (status) updateData.status = status;
    if (comment !== undefined) updateData.comment = comment;
    
    await ip.update(updateData);
    
    return res.send({
      success: true,
      message: `IP ${ip.ipAddress} actualizada correctamente`,
      ip
    });
  } catch (error) {
    console.error('Error al actualizar IP:', error);
    return res.status(500).send({
      message: error.message || 'Error al actualizar IP'
    });
  }
};
