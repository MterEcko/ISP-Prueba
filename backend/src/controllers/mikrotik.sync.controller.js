// backend/src/controllers/mikrotik.sync.controller.js
const MikrotikSyncService = require('../services/mikrotik.sync.service');
const logger = require('../utils/logger');

class MikrotikSyncController {
  
  /**
   * Ejecutar sincronización completa
   * GET /api/mikrotik/sync/full
   */
  async runFullSync(req, res) {
    try {
      logger.info('Iniciando sincronización completa desde API');
      
      const syncService = new MikrotikSyncService();
      const results = await syncService.runFullSync();
      
      return res.status(200).json({
        success: true,
        data: results,
        message: 'Sincronización completa ejecutada exitosamente'
      });
      
    } catch (error) {
      logger.error(`Error en sincronización completa: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error ejecutando sincronización completa',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar solo IP Pools
   * POST /api/mikrotik/sync/pools
   */
  async syncPools(req, res) {
    try {
      logger.info('Sincronizando IP Pools desde API');
      
      const syncService = new MikrotikSyncService();
      const results = await syncService.syncIpPools();
      
      return res.status(200).json({
        success: true,
        data: results,
        message: `${results.length} pools procesados`
      });
      
    } catch (error) {
      logger.error(`Error sincronizando pools: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sincronizando IP pools',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar solo IPs de pools
   * POST /api/mikrotik/sync/ips
   */
  async syncPoolIPs(req, res) {
    try {
      logger.info('Sincronizando IPs de pools desde API');
      
      const syncService = new MikrotikSyncService();
      const results = await syncService.syncPoolIPs();
      
      return res.status(200).json({
        success: true,
        data: results,
        message: `IPs sincronizadas en ${results.length} pools`
      });
      
    } catch (error) {
      logger.error(`Error sincronizando IPs: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sincronizando IPs de pools',
        error: error.message
      });
    }
  }

// EN: mikrotik.sync.controller.js

/**
 * Sincronizar solo Perfiles PPPoE (manual)
 * POST /api/mikrotik/sync/profiles
 */
async syncProfiles(req, res) {
  try {
    logger.info('🔄 Sincronización manual de Perfiles PPPoE iniciada desde API');
    
    const results = await this.syncPppoeProfiles();
    
    return res.status(200).json({
      success: true,
      message: `Sincronización completada: ${results.summary.created} creados, ${results.summary.updated} actualizados`,
      data: results.summary,
      details: results.results // ✅ Incluir detalles completos
    });
    
  } catch (error) {
    logger.error(`❌ Error en sincronización manual de perfiles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error sincronizando perfiles PPPoE',
      error: error.message
    });
  }
}
  /**
   * Sincronizar solo Usuarios PPPoE
   * POST /api/mikrotik/sync/users
   */
  async syncUsers(req, res) {
    try {
      logger.info('Sincronizando Usuarios PPPoE desde API');
      
      const syncService = new MikrotikSyncService();
      const results = await syncService.syncPppoeUsers();
      
      return res.status(200).json({
        success: true,
        data: results,
        message: `${results.length} usuarios procesados`
      });
      
    } catch (error) {
      logger.error(`Error sincronizando usuarios: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sincronizando usuarios PPPoE',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar usuario específico
   * POST /api/mikrotik/sync/user/:clientId
   */
  async syncSpecificUser(req, res) {
    try {
      const { clientId } = req.params;
      
      logger.info(`Sincronizando usuario específico: cliente ${clientId}`);
      
      const syncService = new MikrotikSyncService();
      const result = await syncService.syncSpecificUser(clientId);
      
      return res.status(200).json(result);
      
    } catch (error) {
      logger.error(`Error sincronizando usuario específico: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sincronizando usuario específico',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar pool específico
   * POST /api/mikrotik/sync/pool/:poolId
   */
  async syncSpecificPool(req, res) {
    try {
      const { poolId } = req.params;
      
      logger.info(`Sincronizando pool específico: ${poolId}`);
      
      const syncService = new MikrotikSyncService();
      const result = await syncService.syncSpecificPool(poolId);
      
      return res.status(200).json(result);
      
    } catch (error) {
      logger.error(`Error sincronizando pool específico: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sincronizando pool específico',
        error: error.message
      });
    }
  }

  /**
   * Limpiar IPs huérfanas
   * POST /api/mikrotik/sync/cleanup-ips
   */
  async cleanupOrphanedIPs(req, res) {
    try {
      logger.info('Limpiando IPs huérfanas desde API');
      
      const syncService = new MikrotikSyncService();
      const result = await syncService.cleanOrphanedIPs();
      
      return res.status(200).json(result);
      
    } catch (error) {
      logger.error(`Error limpiando IPs huérfanas: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error limpiando IPs huérfanas',
        error: error.message
      });
    }
  }

  /**
   * Obtener configuración de sincronización
   * GET /api/mikrotik/sync/config
   */
  async getConfig(req, res) {
    try {
      const syncService = new MikrotikSyncService();
      const config = await syncService.getConfig();
      
      return res.status(200).json({
        success: true,
        data: config,
        message: 'Configuración de sincronización obtenida'
      });
      
    } catch (error) {
      logger.error(`Error obteniendo configuración: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo configuración de sincronización',
        error: error.message
      });
    }
  }

  /**
   * Actualizar configuración de sincronización
   * PUT /api/mikrotik/sync/config
   */
  async updateConfig(req, res) {
    try {
      const newConfig = req.body;
      
      logger.info('Actualizando configuración de sincronización');
      
      const syncService = new MikrotikSyncService();
      const updatedConfig = await syncService.updateConfig(newConfig);
      
      return res.status(200).json({
        success: true,
        data: updatedConfig,
        message: 'Configuración actualizada exitosamente'
      });
      
    } catch (error) {
      logger.error(`Error actualizando configuración: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando configuración de sincronización',
        error: error.message
      });
    }
  }

  /**
   * Obtener estado de última sincronización
   * GET /api/mikrotik/sync/status
   */
  async getSyncStatus(req, res) {
    try {
      const syncService = new MikrotikSyncService();
      const lastSyncTimes = await syncService.getLastSyncTimes();
      const config = await syncService.getConfig();
      
      const now = new Date();
      const status = {
        lastSync: lastSyncTimes,
        nextSync: {},
        intervals: config.syncIntervals,
        isOverdue: {}
      };

      // Calcular próximas sincronizaciones
      for (const [type, lastTime] of Object.entries(lastSyncTimes)) {
        if (lastTime && config.syncIntervals[type]) {
          const lastSyncDate = new Date(lastTime);
          const intervalHours = config.syncIntervals[type];
          const nextSyncDate = new Date(lastSyncDate.getTime() + (intervalHours * 60 * 60 * 1000));
          
          status.nextSync[type] = nextSyncDate;
          status.isOverdue[type] = now > nextSyncDate;
        } else {
          status.nextSync[type] = 'Nunca ejecutado';
          status.isOverdue[type] = true;
        }
      }
      
      return res.status(200).json({
        success: true,
        data: status,
        message: 'Estado de sincronización obtenido'
      });
      
    } catch (error) {
      logger.error(`Error obteniendo estado de sincronización: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estado de sincronización',
        error: error.message
      });
    }
  }

  /**
   * Forzar creación de archivo de configuración
   * POST /api/mikrotik/sync/create-config
   */
  async createDefaultConfig(req, res) {
    try {
      logger.info('Creando configuración predeterminada');
      
      const syncService = new MikrotikSyncService();
      await syncService.createDefaultConfig();
      const config = await syncService.getConfig();
      
      return res.status(201).json({
        success: true,
        data: config,
        message: 'Configuración predeterminada creada exitosamente'
      });
      
    } catch (error) {
      logger.error(`Error creando configuración: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error creando configuración predeterminada',
        error: error.message
      });
    }
  }

/**
 * Resetear tiempos de sincronización (forzar próxima sincronización)
 */
async resetSyncTimes(req, res) {
  try {
    logger.info('🔄 Reseteando tiempos de sincronización...');

    const syncService = new MikrotikSyncService();
    
    // Resetear todos los tiempos a null para forzar sincronización
    const resetTimes = {
      pools: null,
      profiles: null,
      users: null,
      ips: null
    };

    await db.SystemConfiguration.upsert({
      key: 'mikrotik_sync_times',
      value: JSON.stringify(resetTimes)
    });

    logger.info('✅ Tiempos de sincronización reseteados exitosamente');

    return res.status(200).json({
      success: true,
      message: 'Tiempos de sincronización reseteados - próxima ejecución forzará sincronización completa',
      data: {
        resetAt: new Date(),
        nextSyncWillBeForced: true
      }
    });

  } catch (error) {
    logger.error(`❌ Error reseteando tiempos de sincronización: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al resetear tiempos de sincronización',
      error: error.message
    });
  }
}

}

module.exports = new MikrotikSyncController();