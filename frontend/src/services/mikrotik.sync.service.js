// backend/src/services/mikrotik.sync.service.js
const fs = require('fs').promises;
const path = require('path');
const db = require('../models');
const MikrotikService = require('./mikrotik.service');
const logger = require('../utils/logger');

class MikrotikSyncService {
  constructor() {
    this.configPath = path.join(__dirname, '../config/mikrotik-sync.json');
    
    this.defaultConfig = {
      syncIntervals: {
        ipPools: 24, // horas
        pppoeProfiles: 12, // horas
        pppoeUsers: 72, // horas (3 días)
        poolIPs: 24, // horas - sincronización de IPs
        tolerance: 3 // días para validaciones
      },
      notifications: {
        enabled: true,
        emailRecipients: ['admin@isp.com'],
        webhookUrl: null
      },
      autoFix: {
        updateNames: true,
        notifyChanges: true,
        createMissingRecords: false,
        syncIpAssignments: true // ✅ NUEVO: sincronizar asignaciones de IP
      },
      ipManagement: {
        autoCreateMissingIPs: true, // Crear registros de IP si no existen
        freeOrphanedIPs: true, // Liberar IPs sin usuario asignado
        blockUnknownIPs: true // Marcar como bloqueadas IPs no encontradas en pool
      }
    };
  }

  /**
   * Validar y crear configuración JSON si no existe
   */
  async ensureConfigExists() {
    try {
      await fs.access(this.configPath);
      logger.info('Archivo de configuración mikrotik-sync.json encontrado');
    } catch (error) {
      logger.info('Creando archivo de configuración mikrotik-sync.json...');
      await this.createDefaultConfig();
    }
  }

  /**
   * Crear configuración predeterminada
   */
  async createDefaultConfig() {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(this.defaultConfig, null, 2),
        'utf8'
      );
      
      logger.info(`Configuración predeterminada creada: ${this.configPath}`);
    } catch (error) {
      logger.error(`Error creando configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leer configuración desde JSON
   */
  async getConfig() {
    await this.ensureConfigExists();
    
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      logger.error(`Error leyendo configuración: ${error.message}`);
      return this.defaultConfig;
    }
  }

  /**
   * Actualizar configuración
   */
  async updateConfig(newConfig) {
    try {
      const currentConfig = await this.getConfig();
      const mergedConfig = { ...currentConfig, ...newConfig };
      
      await fs.writeFile(
        this.configPath,
        JSON.stringify(mergedConfig, null, 2),
        'utf8'
      );
      
      logger.info('Configuración de sincronización actualizada');
      return mergedConfig;
    } catch (error) {
      logger.error(`Error actualizando configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar IP Pools (cada 24 horas)
   */
  async syncIpPools() {
    logger.info('🔄 Iniciando sincronización de IP Pools...');
    const results = [];

    try {
      const routers = await db.MikrotikRouter.findAll({
        where: { active: true },
        include: [
          { model: db.Device, as: 'device' },
          { model: db.Node }
        ]
      });

      for (const router of routers) {
        try {
          logger.info(`Sincronizando pools del router: ${router.name}`);
          
          // Obtener pools desde RouterOS usando IDs
          const routerOsPools = await MikrotikService.getIPPools(
            router.device.ipAddress,
            router.apiPort,
            router.username,
            router.passwordEncrypted
          );

          // Sincronizar cada pool
          for (const rosPool of routerOsPools) {
            const syncResult = await this.syncSinglePool(router, rosPool);
            results.push(syncResult);
          }

        } catch (routerError) {
          logger.error(`Error sincronizando router ${router.name}: ${routerError.message}`);
          results.push({
            router: router.name,
            status: 'error',
            error: routerError.message
          });
        }
      }

      logger.info(`✅ Sincronización de pools completada: ${results.length} pools procesados`);
      return results;

    } catch (error) {
      logger.error(`❌ Error en sincronización de pools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar un pool individual
   */
  async syncSinglePool(router, rosPool) {
    try {
      // Buscar pool en DB usando poolId (ID inmutable de RouterOS)
      let dbPool = await db.IpPool.findOne({
        where: {
          mikrotikRouterId: router.id,
          poolId: rosPool.id // ID inmutable de RouterOS
        }
      });

      if (dbPool) {
        // Verificar si cambió el nombre
        if (dbPool.poolName !== rosPool.name) {
          logger.info(`📝 Pool ${dbPool.poolId}: nombre cambió de "${dbPool.poolName}" a "${rosPool.name}"`);
          
          await dbPool.update({
            poolName: rosPool.name,
            ranges: rosPool.ranges,
            lastSyncWithMikrotik: new Date()
          });

          return {
            router: router.name,
            poolId: rosPool.id,
            action: 'updated',
            changes: ['name'],
            oldName: dbPool.poolName,
            newName: rosPool.name
          };
        } else {
          // Solo actualizar timestamp de sincronización
          await dbPool.update({
            lastSyncWithMikrotik: new Date()
          });

          return {
            router: router.name,
            poolId: rosPool.id,
            action: 'verified',
            status: 'ok'
          };
        }
      } else {
        // Pool no existe en DB - notificar pero no crear automáticamente
        logger.warn(`⚠️ Pool ${rosPool.name} (${rosPool.id}) encontrado en router pero no en DB`);
        
        return {
          router: router.name,
          poolId: rosPool.id,
          action: 'missing_in_db',
          poolName: rosPool.name,
          notification: 'Pool existe en RouterOS pero no en base de datos'
        };
      }

    } catch (error) {
      logger.error(`Error sincronizando pool ${rosPool.name}: ${error.message}`);
      return {
        router: router.name,
        poolId: rosPool.id,
        action: 'error',
        error: error.message
      };
    }
  }

/**
 * Sincronizar Perfiles PPPoE (cada 12 horas)
 */
async syncPppoeProfiles() {
  logger.info('🔄 Iniciando sincronización de Perfiles PPPoE...');
  const results = [];
  
  try {
    const routers = await db.MikrotikRouter.findAll({
      where: { active: true },
      include: [
        { model: db.Device, as: 'device' }
      ]
    });

    logger.info(`📡 ${routers.length} routers Mikrotik encontrados para sincronizar`);
    
    for (const router of routers) {
      try {
        logger.info(`🔧 Sincronizando perfiles del router: ${router.name} (${router.device.ipAddress})`);
        
        // Obtener perfiles desde RouterOS
        const rosProfiles = await MikrotikService.getPPPoEProfiles(
          router.device.ipAddress,
          router.apiPort,
          router.username,
          router.passwordEncrypted
        );

        logger.info(`📋 ${rosProfiles.length} perfiles encontrados en RouterOS para ${router.name}`);
        
        // Sincronizar cada perfil
        for (const rosProfile of rosProfiles) {
          const syncResult = await this.syncSingleProfile(router, rosProfile);
          results.push(syncResult);
        }

        // ✅ NUEVO: Actualizar lastSync del router
        await db.MikrotikRouter.update(
          { lastSync: new Date() },
          { where: { id: router.id } }
        );
        
      } catch (routerError) {
        logger.error(`❌ Error sincronizando perfiles del router ${router.name}: ${routerError.message}`);
        results.push({
          router: router.name,
          routerId: router.id,
          status: 'error',
          error: routerError.message,
          timestamp: new Date()
        });
      }
    }

    // ✅ NUEVO: Estadísticas finales
    const summary = this.generateSyncSummary(results);
    logger.info(`✅ Sincronización completada: ${summary.created} creados, ${summary.updated} actualizados, ${summary.verified} verificados, ${summary.errors} errores`);
    
    return {
      success: true,
      summary,
      results,
      timestamp: new Date()
    };
    
  } catch (error) {
    logger.error(`❌ Error general en sincronización de perfiles: ${error.message}`);
    throw error;
  }
}

/**
 * Sincronizar un perfil individual - VERSIÓN MEJORADA
 */
async syncSingleProfile(router, rosProfile) {
  try {
    // ✅ 1. Buscar perfil en DB usando profileId (ID inmutable de RouterOS)
    let dbProfile = await db.MikrotikProfile.findOne({
      where: {
        mikrotikRouterId: router.id,
        profileId: rosProfile.id // ID inmutable de RouterOS (ej: "*2", "*3")
      }
    });

    if (dbProfile) {
      // ✅ 2. PERFIL EXISTE: Verificar y actualizar cambios
      const changes = [];
      const updateData = { lastSync: new Date() };

      // Verificar cambios en nombre
      if (dbProfile.profileName !== rosProfile.name) {
        changes.push('name');
        updateData.profileName = rosProfile.name;
      }

      // Verificar cambios en rate limit
      if (dbProfile.rateLimit !== rosProfile.rateLimit) {
        changes.push('rateLimit');
        updateData.rateLimit = rosProfile.rateLimit;
      }

      // ✅ NUEVO: Verificar más campos
      if (dbProfile.burstLimit !== (rosProfile.burstLimit || null)) {
        changes.push('burstLimit');
        updateData.burstLimit = rosProfile.burstLimit || null;
      }

      if (dbProfile.burstThreshold !== (rosProfile.burstThreshold || null)) {
        changes.push('burstThreshold');
        updateData.burstThreshold = rosProfile.burstThreshold || null;
      }

      if (dbProfile.burstTime !== (rosProfile.burstTime || null)) {
        changes.push('burstTime');
        updateData.burstTime = rosProfile.burstTime || null;
      }

      if (dbProfile.priority !== (rosProfile.priority || null)) {
        changes.push('priority');
        updateData.priority = rosProfile.priority || null;
      }

      // Actualizar datos adicionales
      updateData.additionalSettings = {
        localAddress: rosProfile.localAddress || '',
        remoteAddress: rosProfile.remoteAddress || '',
        dnsServer: rosProfile.dnsServer || '',
        interfaceList: rosProfile.interfaceList || '',
        addressList: rosProfile.addressList || '',
        onlyOne: rosProfile.onlyOne === 'yes',
        ...dbProfile.additionalSettings // Mantener configuraciones adicionales
      };

      if (changes.length > 0) {
        logger.info(`📝 Perfil ${dbProfile.profileId} (${router.name}): cambios detectados: ${changes.join(', ')}`);
        await dbProfile.update(updateData);
        
        return {
          router: router.name,
          routerId: router.id,
          profileId: rosProfile.id,
          profileName: rosProfile.name,
          action: 'updated',
          changes,
          oldName: dbProfile.profileName,
          newName: rosProfile.name,
          timestamp: new Date()
        };
      } else {
        // Solo actualizar lastSync
        await dbProfile.update({ lastSync: new Date() });
        
        return {
          router: router.name,
          routerId: router.id,
          profileId: rosProfile.id,
          profileName: rosProfile.name,
          action: 'verified',
          status: 'no_changes',
          timestamp: new Date()
        };
      }

    } else {
      // ✅ 3. PERFIL NO EXISTE: Crear automáticamente
      logger.info(`🆕 Creando perfil faltante: ${rosProfile.name} (${rosProfile.id}) en router ${router.name}`);
      
      const newProfile = await db.MikrotikProfile.create({
        mikrotikRouterId: router.id,
        servicePackageId: null, // ✅ Sin vincular inicialmente
        profileId: rosProfile.id,
        profileName: rosProfile.name,
        rateLimit: rosProfile.rateLimit || null,
        burstLimit: rosProfile.burstLimit || null,
        burstThreshold: rosProfile.burstThreshold || null,
        burstTime: rosProfile.burstTime || null,
        priority: rosProfile.priority || null,
        additionalSettings: {
          localAddress: rosProfile.localAddress || '',
          remoteAddress: rosProfile.remoteAddress || '',
          dnsServer: rosProfile.dnsServer || '',
          interfaceList: rosProfile.interfaceList || '',
          addressList: rosProfile.addressList || '',
          onlyOne: rosProfile.onlyOne === 'yes'
        },
        active: true,
        lastSync: new Date()
      });

      logger.info(`✅ Perfil creado exitosamente: ${rosProfile.name} (DB ID: ${newProfile.id})`);
      
      return {
        router: router.name,
        routerId: router.id,
        profileId: rosProfile.id,
        profileName: rosProfile.name,
        action: 'created',
        dbId: newProfile.id,
        rateLimit: rosProfile.rateLimit,
        timestamp: new Date()
      };
    }

  } catch (error) {
    logger.error(`❌ Error sincronizando perfil ${rosProfile.name} en ${router.name}: ${error.message}`);
    
    return {
      router: router.name,
      routerId: router.id,
      profileId: rosProfile.id,
      profileName: rosProfile.name,
      action: 'error',
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * ✅ NUEVO: Generar resumen de sincronización
 */
generateSyncSummary(results) {
  const summary = {
    total: results.length,
    created: 0,
    updated: 0,
    verified: 0,
    errors: 0,
    routers: new Set()
  };

  results.forEach(result => {
    summary.routers.add(result.router);
    
    switch (result.action) {
      case 'created':
        summary.created++;
        break;
      case 'updated':
        summary.updated++;
        break;
      case 'verified':
        summary.verified++;
        break;
      case 'error':
        summary.errors++;
        break;
    }
  });

  summary.routersProcessed = summary.routers.size;
  delete summary.routers; // No necesitamos el Set en el resultado

  return summary;
}


  /**
   * Sincronizar Usuarios PPPoE (cada 3 días)
   */
  async syncPppoeUsers() {
    logger.info('🔄 Iniciando sincronización de Usuarios PPPoE...');
    const results = [];

    try {
      const routers = await db.MikrotikRouter.findAll({
        where: { active: true },
        include: [
          { model: db.Device, as: 'device' }
        ]
      });

      for (const router of routers) {
        try {
          logger.info(`Sincronizando usuarios del router: ${router.name}`);
          
          // Obtener usuarios desde RouterOS
          const rosUsers = await MikrotikService.getPPPoEUsers(
            router.device.ipAddress,
            router.apiPort,
            router.username,
            router.passwordEncrypted
          );

          // Sincronizar cada usuario
          for (const rosUser of rosUsers) {
            const syncResult = await this.syncSingleUser(router, rosUser);
            results.push(syncResult);
          }

        } catch (routerError) {
          logger.error(`Error sincronizando usuarios del router ${router.name}: ${routerError.message}`);
          results.push({
            router: router.name,
            status: 'error',
            error: routerError.message
          });
        }
      }

      logger.info(`✅ Sincronización de usuarios completada: ${results.length} usuarios procesados`);
      return results;

    } catch (error) {
      logger.error(`❌ Error en sincronización de usuarios: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar IPs de pools (cada 24 horas) - ✅ CORREGIDO
   */
  async syncPoolIPs() {
    logger.info('🔄 Iniciando sincronización de IPs de pools...');
    const results = [];

    try {
      const pools = await db.IpPool.findAll({
        where: { active: true },
        include: [
          { 
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          }
        ]
      });

      for (const pool of pools) {
        try {
          logger.info(`Sincronizando IPs del pool: ${pool.poolName} (${pool.poolId})`);
          
          const router = pool.MikrotikRouter;
          
          // Obtener IPs disponibles/ocupadas desde RouterOS usando poolId
          const poolData = await MikrotikService.getPoolAvailableIPs(
            router.device.ipAddress,
            router.apiPort,
            router.username,
            router.passwordEncrypted,
            pool.poolId // Usar poolId en lugar de poolName
          );

          console.log('DEBUG poolData structure:', JSON.stringify(poolData, null, 2));

          // ✅ CORREGIDO: Validación y llamada al método
          let syncResult;
          if (poolData && poolData.availableIPs) {
            syncResult = await this.syncPoolIpAddresses(pool, poolData);
          } else {
            console.log('poolData es inválido para pool', pool.poolName, ':', poolData);
            syncResult = {
              pool: pool.poolName,
              poolId: pool.poolId,
              router: pool.MikrotikRouter.name,
              status: 'error',
              error: 'poolData undefined o sin availableIPs'
            };
          }

          results.push(syncResult);

        } catch (poolError) {
          logger.error(`Error sincronizando pool ${pool.poolName}: ${poolError.message}`);
          results.push({
            pool: pool.poolName,
            poolId: pool.poolId,
            router: pool.MikrotikRouter.name,
            status: 'error',
            error: poolError.message
          });
        }
      }

      logger.info(`✅ Sincronización de IPs completada: ${results.length} pools procesados`);
      return results;

    } catch (error) {
      logger.error(`❌ Error en sincronización de IPs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar IPs de un pool específico - ✅ CORREGIDO
   */
  async syncPoolIpAddresses(pool, poolData) {
    try {
      // ✅ DEBUG: Verificar qué llega al método
      console.log('=== DEBUG syncPoolIpAddresses ===');
      console.log('pool:', pool ? pool.poolName : 'undefined');
      console.log('poolData recibido:', poolData);
      console.log('poolData type:', typeof poolData);
      console.log('poolData.availableIPs:', poolData ? poolData.availableIPs : 'poolData is undefined');
      console.log('==============================');

      // ✅ CORREGIDO: Usar nombres correctos de propiedades
      const availableIPs = poolData.availableIPs || [];
      const occupiedIPs = poolData.usedIPs || [];
      const totalIPsInPool = poolData.totalAvailable || 0;
      
      let created = 0;
      let updated = 0;
      let freed = 0;

      console.log(`Procesando ${availableIPs.length} IPs disponibles y ${occupiedIPs.length} IPs ocupadas`);

      // 1. Procesar IPs ocupadas (marcar como assigned)
      for (const occupiedIp of occupiedIPs) {
        const [ipRecord, wasCreated] = await db.MikrotikIp.findOrCreate({
          where: {
            ipPoolId: pool.id,
            ipAddress: occupiedIp
          },
          defaults: {
            status: 'assigned'
          }
        });

        if (wasCreated) {
          created++;
          logger.debug(`IP ${occupiedIp} creada como ocupada`);
        } else if (ipRecord.status !== 'assigned') {
          await ipRecord.update({ status: 'assigned' });
          updated++;
          logger.debug(`IP ${occupiedIp} actualizada a ocupada`);
        }
      }

      // 2. Procesar IPs disponibles (marcar como available)
      for (const availableIp of availableIPs) {
        const [ipRecord, wasCreated] = await db.MikrotikIp.findOrCreate({
          where: {
            ipPoolId: pool.id,
            ipAddress: availableIp
          },
          defaults: {
            status: 'available'
          }
        });

        if (wasCreated) {
          created++;
          logger.debug(`IP ${availableIp} creada como disponible`);
        } else if (ipRecord.status !== 'available') {
          await ipRecord.update({ 
            status: 'available',
            clientId: null,
            mikrotikPPPOEId: null
          });
          freed++;
          logger.debug(`IP ${availableIp} liberada`);
        }
      }

      // 3. Marcar IPs en BD que ya no existen en RouterOS como bloqueadas
      const allRouterIPs = [...availableIPs, ...occupiedIPs];
      const dbIPs = await db.MikrotikIp.findAll({
        where: { ipPoolId: pool.id }
      });

      for (const dbIp of dbIPs) {
        if (!allRouterIPs.includes(dbIp.ipAddress) && dbIp.status !== 'blocked') {
          await dbIp.update({ status: 'blocked' });
          logger.warn(`IP ${dbIp.ipAddress} no encontrada en RouterOS, marcada como bloqueada`);
        }
      }

      logger.info(`Pool ${pool.poolName}: ${created} creadas, ${updated} actualizadas, ${freed} liberadas`);

      return {
        pool: pool.poolName,
        poolId: pool.poolId,
        router: pool.MikrotikRouter.name,
        status: 'success',
        totalIPs: totalIPsInPool,
        stats: {
          created,
          updated,
          freed,
          available: availableIPs.length,
          occupied: occupiedIPs.length
        }
      };

    } catch (error) {
      logger.error(`Error sincronizando IPs del pool ${pool.poolName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar un usuario individual
   */
  async syncSingleUser(router, rosUser) {
    try {
      // Buscar usuario en DB usando mikrotikUserId (ID inmutable de RouterOS)
      let dbUser = await db.MikrotikPPPOE.findOne({
        where: {
          mikrotikRouterId: router.id,
          mikrotikUserId: rosUser.id // ID inmutable de RouterOS
        },
        include: [{ model: db.Client }]
      });

      if (dbUser) {
        const changes = [];
        const updateData = { lastSyncWithMikrotik: new Date() };

        // Verificar cambios
        if (dbUser.username !== rosUser.name) {
          changes.push('username');
          updateData.username = rosUser.name;
        }

        if (dbUser.currentProfileName !== rosUser.profile) {
          changes.push('profile');
          updateData.currentProfileName = rosUser.profile;
        }

        if (rosUser.disabled !== undefined) {
          const newStatus = rosUser.disabled ? 'disabled' : 'active';
          if (dbUser.status !== newStatus) {
            changes.push('status');
            updateData.status = newStatus;
          }
        }

        // Sincronizar IP asignada si existe
        if (rosUser.address && rosUser.address !== dbUser.staticIp) {
          changes.push('ip');
          await this.syncUserIP(dbUser, rosUser.address);
        }

        if (changes.length > 0) {
          logger.info(`📝 Usuario ${dbUser.mikrotikUserId}: cambios detectados: ${changes.join(', ')}`);
          await dbUser.update(updateData);

          return {
            router: router.name,
            userId: rosUser.id,
            action: 'updated',
            changes,
            username: rosUser.name,
            clientName: dbUser.Client ? `${dbUser.Client.firstName} ${dbUser.Client.lastName}` : 'Sin cliente'
          };
        } else {
          await dbUser.update({ lastSyncWithMikrotik: new Date() });
          return {
            router: router.name,
            userId: rosUser.id,
            action: 'verified',
            status: 'ok'
          };
        }
      } else {
        // Usuario no existe en DB
        logger.warn(`⚠️ Usuario ${rosUser.name} (${rosUser.id}) encontrado en router pero no en DB`);
        
        return {
          router: router.name,
          userId: rosUser.id,
          action: 'missing_in_db',
          username: rosUser.name,
          profile: rosUser.profile,
          address: rosUser.address,
          notification: 'Usuario existe en RouterOS pero no en base de datos'
        };
      }

    } catch (error) {
      logger.error(`Error sincronizando usuario ${rosUser.name}: ${error.message}`);
      return {
        router: router.name,
        userId: rosUser.id,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * Sincronizar IP asignada a un usuario
   */
  async syncUserIP(dbUser, assignedIP) {
    try {
      // Buscar si ya tiene una IP asignada
      const currentIP = await db.MikrotikIp.findOne({
        where: { mikrotikPPPOEId: dbUser.id }
      });

      if (currentIP && currentIP.ipAddress !== assignedIP) {
        // Liberar IP anterior
        await currentIP.update({
          status: 'available',
          clientId: null,
          mikrotikPPPOEId: null
        });
        logger.info(`IP ${currentIP.ipAddress} liberada del usuario ${dbUser.username}`);
      }

      if (assignedIP) {
        // Buscar la nueva IP en el pool del usuario
        const pool = await db.IpPool.findOne({
          where: { 
            mikrotikRouterId: dbUser.mikrotikRouterId,
            poolId: dbUser.poolId 
          }
        });

        if (pool) {
          // Asignar nueva IP
          await db.MikrotikIp.upsert({
            ipPoolId: pool.id,
            ipAddress: assignedIP,
            clientId: dbUser.clientId,
            mikrotikPPPOEId: dbUser.id,
            status: 'assigned'
          });
          
          logger.info(`IP ${assignedIP} asignada al usuario ${dbUser.username}`);
        }
      }

    } catch (error) {
      logger.error(`Error sincronizando IP para usuario ${dbUser.username}: ${error.message}`);
    }
  }

  /**
   * Ejecutar sincronización completa basada en configuración
   */
  async runFullSync() {
    const config = await this.getConfig();
    const results = {
      timestamp: new Date(),
      pools: [],
      profiles: [],
      users: [],
      ips: [] // ✅ NUEVO: resultados de sincronización de IPs
    };

    try {
      // Verificar si es tiempo de sincronizar cada tipo
      const lastSyncTimes = await this.getLastSyncTimes();
      const now = new Date();

      // IP Pools (cada 24 horas)
      if (this.shouldSync(lastSyncTimes.pools, config.syncIntervals.ipPools, now)) {
        logger.info('🔄 Ejecutando sincronización de IP Pools...');
        results.pools = await this.syncIpPools();
        await this.updateLastSyncTime('pools');
      }

      // Pool IPs (cada 24 horas) - ✅ NUEVO
      if (this.shouldSync(lastSyncTimes.ips, config.syncIntervals.poolIPs, now)) {
        logger.info('🔄 Ejecutando sincronización de IPs de pools...');
        results.ips = await this.syncPoolIPs();
        await this.updateLastSyncTime('ips');
      }

      // Perfiles PPPoE (cada 12 horas)
      if (this.shouldSync(lastSyncTimes.profiles, config.syncIntervals.pppoeProfiles, now)) {
        logger.info('🔄 Ejecutando sincronización de Perfiles PPPoE...');
        results.profiles = await this.syncPppoeProfiles();
        await this.updateLastSyncTime('profiles');
      }

      // Usuarios PPPoE (cada 3 días)
      if (this.shouldSync(lastSyncTimes.users, config.syncIntervals.pppoeUsers, now)) {
        logger.info('🔄 Ejecutando sincronización de Usuarios PPPoE...');
        results.users = await this.syncPppoeUsers();
        await this.updateLastSyncTime('users');
      }

      return results;

    } catch (error) {
      logger.error(`❌ Error en sincronización completa: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar si es tiempo de sincronizar
   */
  shouldSync(lastSyncTime, intervalHours, now) {
    if (!lastSyncTime) return true;
    
    const timeDiff = now - new Date(lastSyncTime);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= intervalHours;
  }

  /**
   * Obtener últimos tiempos de sincronización
   */
  async getLastSyncTimes() {
    // Implementar lógica para obtener últimos tiempos desde DB o archivo
    // Por simplicidad, usar configuración del sistema
    const config = await db.SystemConfiguration.findOne({
      where: { configKey: 'mikrotik_sync_times' }
    });

    if (config && config.value) {
      return JSON.parse(config.value);
    }

    return {
      pools: null,
      profiles: null,
      users: null,
      ips: null // ✅ NUEVO: tiempo de sincronización de IPs
    };
  }

  /**
   * Actualizar tiempo de última sincronización
   */
  async updateLastSyncTime(type) {
    const times = await this.getLastSyncTimes();
    times[type] = new Date();

    await db.SystemConfiguration.upsert({
      configKey: 'mikrotik_sync_times',
      value: JSON.stringify(times)
    });
  }

  /**
   * ✅ NUEVO: Sincronizar usuario específico manualmente
   */
  async syncSpecificUser(clientId) {
    try {
      const pppoeUser = await db.MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: db.Client },
          { model: db.MikrotikRouter, include: [{ model: db.Device, as: 'device' }] }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;

      // Obtener usuarios desde RouterOS
      const rosUsers = await MikrotikService.getPPPoEUsers(
        router.device.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted
      );

      const rosUser = rosUsers.find(u => u.id === pppoeUser.mikrotikUserId);

      if (!rosUser) {
        return {
          success: false,
          message: `Usuario ${pppoeUser.username} no encontrado en RouterOS`,
          clientId: clientId
        };
      }

      const syncResult = await this.syncSingleUser(router, rosUser);

      return {
        success: true,
        data: syncResult,
        message: `Usuario ${pppoeUser.username} sincronizado exitosamente`
      };

    } catch (error) {
      logger.error(`Error sincronizando usuario específico ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Sincronizar pool específico manualmente - CORREGIDO
   */
  async syncSpecificPool(poolId) {
    try {
      const pool = await db.IpPool.findByPk(poolId, {
        include: [
          { 
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          }
        ]
      });

      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado`);
      }

      const router = pool.MikrotikRouter;

      // Obtener datos del pool desde RouterOS
      const poolData = await MikrotikService.getPoolAvailableIPs(
        router.device.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted,
        pool.poolId
      );

      // ✅ CORREGIDO: Validación y llamada al método
      let syncResult;
      if (poolData && poolData.availableIPs) {
        syncResult = await this.syncPoolIpAddresses(pool, poolData);
      } else {
        console.log('poolData es inválido:', poolData);
        syncResult = {
          pool: pool.poolName,
          poolId: pool.poolId,
          router: pool.MikrotikRouter.name,
          status: 'error',
          error: 'poolData undefined o sin availableIPs'
        };
      }

      return {
        success: true,
        data: syncResult,
        message: `Pool ${pool.poolName} sincronizado exitosamente`
      };

    } catch (error) {
      logger.error(`Error sincronizando pool específico ${poolId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Limpiar IPs huérfanas (sin usuario asignado)
   */
  async cleanOrphanedIPs() {
    try {
      logger.info('🧹 Limpiando IPs huérfanas...');

      // Buscar IPs marcadas como asignadas pero sin usuario
      const orphanedIPs = await db.MikrotikIp.findAll({
        where: {
          status: 'assigned',
          mikrotikPPPOEId: null
        }
      });

      let cleaned = 0;

      for (const ip of orphanedIPs) {
        await ip.update({
          status: 'available',
          clientId: null
        });
        cleaned++;
        logger.info(`IP ${ip.ipAddress} liberada (huérfana)`);
      }

      return {
        success: true,
        cleaned: cleaned,
        message: `${cleaned} IPs huérfanas limpiadas`
      };

    } catch (error) {
      logger.error(`Error limpiando IPs huérfanas: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MikrotikSyncService;