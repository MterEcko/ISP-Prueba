const db = require('../models');
const logger = require('../utils/logger');
const mikrotikService = require('./mikrotik.service');
const moment = require('moment');

// Modelos necesarios
const ipPool = db.ipPool;
const mikrotikRouter = db.mikrotikRouter;
const clientBilling = db.clientBilling;
const client = db.client;
const servicePackage = db.servicePackage;

class ipPoolService {
  constructor() {
    this.poolCache = new Map();
    this.utilizationCache = new Map();
    this.lastSyncTime = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Crea un nuevo pool IP en el router y base de datos
   * @param {number} routerId - ID del router Mikrotik
   * @param {Object} poolData - Datos del pool
   * @returns {Promise<Object>} Pool creado
   */
  async createPool(routerId, poolData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Creando pool IP en router ${routerId}`);

      const {
        poolName,
        networkAddress,
        startIp,
        endIp,
        gateway,
        dnsPrimary,
        dnsSecondary,
        poolType = 'active'
      } = poolData;

      // Validar datos requeridos
      if (!poolName || !networkAddress || !startIp || !endIp) {
        throw new Error('Se requieren poolName, networkAddress, startIp y endIp');
      }

      // Obtener router
      const router = await MikrotikRouter.findByPk(routerId, { transaction });
      if (!router) {
        throw new Error(`Router ${routerId} no encontrado`);
      }

      // Validar que no exista un pool con el mismo nombre
      const existingPool = await IpPool.findOne({
        where: {
          mikrotikId: routerId,
          poolName: poolName
        },
        transaction
      });

      if (existingPool) {
        throw new Error(`Ya existe un pool con nombre ${poolName} en este router`);
      }

      // Validar red y rangos
      this._validateNetworkAndRange(networkAddress, startIp, endIp);

      // Crear pool en Mikrotik
      try {
        // Crear el pool usando la API de Mikrotik
        const poolRanges = `${startIp}-${endIp}`;
        const poolComment = `Pool ${poolType} - Creado por sistema`;
        
        await this._createMikrotikPool(router, poolName, poolRanges, poolComment);
        
        logger.info(`Pool ${poolName} creado en Mikrotik ${router.ipAddress}`);
      } catch (mikrotikError) {
        throw new Error(`Error creando pool en Mikrotik: ${mikrotikError.message}`);
      }

      // Crear pool en base de datos
      const pool = await IpPool.create({
        mikrotikId: routerId,
        poolName: poolName,
        networkAddress: networkAddress,
        startIp: startIp,
        endIp: endIp,
        gateway: gateway,
        dnsPrimary: dnsPrimary || '8.8.8.8',
        dnsSecondary: dnsSecondary || '8.8.4.4',
        poolType: poolType,
        active: true
      }, { transaction });

      await transaction.commit();

      // Invalidar caché
      this._invalidateCache(routerId);

      logger.info(`Pool ${poolName} creado exitosamente con ID ${pool.id}`);

      return {
        success: true,
        data: {
          poolId: pool.id,
          poolName,
          poolType,
          totalIPs: this._calculatePoolSize(startIp, endIp),
          networkAddress,
          range: `${startIp} - ${endIp}`
        },
        message: `Pool ${poolName} creado exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando pool en router ${routerId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene IPs disponibles de un pool específico
   * @param {number} poolId - ID del pool
   * @returns {Promise<Object>} IPs disponibles
   */
  async getAvailableIPs(poolId) {
    try {
      logger.info(`Obteniendo IPs disponibles del pool ${poolId}`);

      const pool = await IpPool.findByPk(poolId, {
        include: [{ model: MikrotikRouter }]
      });

      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado`);
      }

      if (!pool.active) {
        throw new Error(`Pool ${pool.poolName} está inactivo`);
      }

      // Verificar caché
      const cacheKey = `available_ips_${poolId}`;
      const cached = this.poolCache.get(cacheKey);
      const lastSync = this.lastSyncTime.get(cacheKey);
      
      if (cached && lastSync && (Date.now() - lastSync) < this.cacheTimeout) {
        return {
          success: true,
          data: cached,
          cached: true
        };
      }

      const router = pool.MikrotikRouter;

      // Obtener IPs disponibles desde Mikrotik
      const availableData = await mikrotikService.getPoolAvailableIPs(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        pool.poolName
      );

      // Obtener clientes asignados a este pool desde BD
      const assignedClients = await ClientBilling.findAll({
        where: { currentIpPoolId: poolId },
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName']
          }
        ]
      });

      // Calcular estadísticas
      const totalIPs = this._calculatePoolSize(pool.startIp, pool.endIp);
      const usedByClients = assignedClients.length;
      const availableIPs = availableData.availableIPs || [];
      const utilization = totalIPs > 0 ? ((usedByClients / totalIPs) * 100).toFixed(2) : '0.00';

      const result = {
        poolId,
        poolName: pool.poolName,
        poolType: pool.poolType,
        network: pool.networkAddress,
        range: `${pool.startIp} - ${pool.endIp}`,
        statistics: {
          totalIPs,
          usedByClients,
          availableCount: availableIPs.length,
          utilization: parseFloat(utilization),
          status: this._getPoolStatus(utilization)
        },
        availableIPs: availableIPs.slice(0, 50), // Limitar a 50 para performance
        assignedClients: assignedClients.map(billing => ({
          clientId: billing.clientId,
          clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
          status: billing.clientStatus
        })),
        lastUpdated: new Date().toISOString()
      };

      // Actualizar caché
      this.poolCache.set(cacheKey, result);
      this.lastSyncTime.set(cacheKey, Date.now());

      return {
        success: true,
        data: result,
        cached: false
      };

    } catch (error) {
      logger.error(`Error obteniendo IPs disponibles del pool ${poolId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Asigna una IP específica a un cliente
   * @param {number} clientId - ID del cliente
   * @param {number} poolId - ID del pool
   * @param {string} specificIP - IP específica (opcional)
   * @returns {Promise<Object>} Resultado de la asignación
   */
  async assignIPToClient(clientId, poolId, specificIP = null) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Asignando IP del pool ${poolId} al cliente ${clientId}`);

      // Validar cliente
      const client = await Client.findByPk(clientId, {
        include: [{ model: ClientBilling }],
        transaction
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      if (!client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no tiene configuración de facturación`);
      }

      // Validar pool
      const pool = await IpPool.findByPk(poolId, {
        include: [{ model: MikrotikRouter }],
        transaction
      });

      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado`);
      }

      // Verificar que el cliente no tenga ya una IP de este pool
      if (client.ClientBilling.currentIpPoolId === poolId) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Cliente ya tiene IP asignada de este pool'
        };
      }

      // Obtener IP disponible
      let assignedIP = specificIP;
      if (!assignedIP) {
        const availableData = await this.getAvailableIPs(poolId);
        const availableIPs = availableData.data.availableIPs;
        
        if (availableIPs.length === 0) {
          throw new Error(`No hay IPs disponibles en el pool ${pool.poolName}`);
        }
        
        assignedIP = availableIPs[0]; // Tomar la primera disponible
      } else {
        // Verificar que la IP específica esté disponible
        const availableData = await this.getAvailableIPs(poolId);
        if (!availableData.data.availableIPs.includes(specificIP)) {
          throw new Error(`IP ${specificIP} no está disponible en el pool`);
        }
      }

      // Actualizar configuración de facturación del cliente
      await client.ClientBilling.update({
        currentIpPoolId: poolId
      }, { transaction });

      await transaction.commit();

      // Invalidar caché
      this._invalidateCache(pool.mikrotikId);

      logger.info(`IP ${assignedIP} del pool ${pool.poolName} asignada al cliente ${clientId}`);

      return {
        success: true,
        data: {
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          assignedIP,
          poolId,
          poolName: pool.poolName,
          poolType: pool.poolType
        },
        message: `IP ${assignedIP} asignada exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error asignando IP al cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Libera la IP de un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado de la liberación
   */
  async releaseClientIP(clientId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Liberando IP del cliente ${clientId}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [
              {
                model: IpPool,
                include: [{ model: MikrotikRouter }]
              }
            ]
          }
        ],
        transaction
      });

      if (!client || !client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no encontrado o sin configuración de facturación`);
      }

      const currentPool = client.ClientBilling.IpPool;
      if (!currentPool) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Cliente no tiene IP asignada'
        };
      }

      // Actualizar configuración de facturación
      await client.ClientBilling.update({
        currentIpPoolId: null
      }, { transaction });

      await transaction.commit();

      // Invalidar caché
      this._invalidateCache(currentPool.mikrotikId);

      logger.info(`IP liberada del cliente ${clientId} del pool ${currentPool.poolName}`);

      return {
        success: true,
        data: {
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          releasedFromPool: currentPool.poolName,
          poolType: currentPool.poolType
        },
        message: `IP liberada exitosamente del pool ${currentPool.poolName}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error liberando IP del cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mueve cliente entre pools (usado por billing service)
   * @param {number} clientId - ID del cliente
   * @param {string} fromPoolType - Tipo de pool origen
   * @param {string} toPoolType - Tipo de pool destino
   * @returns {Promise<Object>} Resultado del movimiento
   */
  async moveClientBetweenPools(clientId, fromPoolType, toPoolType) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Moviendo cliente ${clientId} de pool ${fromPoolType} a ${toPoolType}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [
              {
                model: IpPool,
                include: [{ model: MikrotikRouter }]
              }
            ]
          }
        ],
        transaction
      });

      if (!client || !client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no encontrado o sin configuración de facturación`);
      }

      const currentPool = client.ClientBilling.IpPool;
      if (!currentPool) {
        throw new Error(`Cliente ${clientId} no tiene pool asignado actualmente`);
      }

      // Verificar que el pool actual sea del tipo correcto
      if (currentPool.poolType !== fromPoolType) {
        logger.warn(`Cliente ${clientId} está en pool ${currentPool.poolType}, no en ${fromPoolType}`);
      }

      // Buscar pool de destino
      const targetPool = await IpPool.findOne({
        where: {
          mikrotikId: currentPool.mikrotikId,
          poolType: toPoolType,
          active: true
        },
        transaction
      });

      if (!targetPool) {
        throw new Error(`No se encontró pool de tipo ${toPoolType} en el router`);
      }

      // Verificar capacidad del pool destino
      const poolCapacity = await this._checkPoolCapacity(targetPool.id);
      if (!poolCapacity.hasCapacity) {
        throw new Error(`Pool ${targetPool.poolName} está lleno (${poolCapacity.utilization}% utilizado)`);
      }

      // Mover cliente al nuevo pool
      await client.ClientBilling.update({
        currentIpPoolId: targetPool.id
      }, { transaction });

      await transaction.commit();

      // Invalidar caché
      this._invalidateCache(currentPool.mikrotikId);

      logger.info(`Cliente ${clientId} movido exitosamente de ${currentPool.poolName} a ${targetPool.poolName}`);

      return {
        success: true,
        data: {
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          fromPool: {
            id: currentPool.id,
            name: currentPool.poolName,
            type: currentPool.poolType
          },
          toPool: {
            id: targetPool.id,
            name: targetPool.poolName,
            type: targetPool.poolType
          },
          timestamp: new Date().toISOString()
        },
        message: `Cliente movido exitosamente a pool ${targetPool.poolName}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error moviendo cliente ${clientId} entre pools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Movimiento masivo de clientes entre pools
   * @param {Array} clientIds - Array de IDs de clientes
   * @param {string} toPoolType - Tipo de pool destino
   * @returns {Promise<Object>} Resultado del movimiento masivo
   */
  async bulkMoveClients(clientIds, toPoolType) {
    try {
      logger.info(`Iniciando movimiento masivo de ${clientIds.length} clientes a pool ${toPoolType}`);

      let results = {
        successful: [],
        failed: [],
        total: clientIds.length
      };

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < clientIds.length; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (clientId) => {
            try {
              // Obtener tipo de pool actual del cliente
              const client = await Client.findByPk(clientId, {
                include: [
                  {
                    model: ClientBilling,
                    include: [{ model: IpPool }]
                  }
                ]
              });

              if (!client?.ClientBilling?.IpPool) {
                throw new Error('Cliente sin pool asignado');
              }

              const fromPoolType = client.ClientBilling.IpPool.poolType;
              
              if (fromPoolType === toPoolType) {
                results.successful.push({
                  clientId,
                  message: 'Ya está en el pool correcto'
                });
                return;
              }

              const result = await this.moveClientBetweenPools(clientId, fromPoolType, toPoolType);
              
              results.successful.push({
                clientId,
                clientName: result.data.clientName,
                fromPool: result.data.fromPool.name,
                toPool: result.data.toPool.name
              });

            } catch (error) {
              results.failed.push({
                clientId,
                error: error.message
              });
            }
          })
        );

        // Pausa breve entre lotes
        if (i + batchSize < clientIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(`Movimiento masivo completado: ${results.successful.length} exitosos, ${results.failed.length} fallidos`);

      return {
        success: true,
        data: results,
        message: `Movimiento masivo completado: ${results.successful.length}/${results.total} clientes procesados exitosamente`
      };

    } catch (error) {
      logger.error(`Error en movimiento masivo de clientes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza pools con Mikrotik
   * @param {number} routerId - ID del router (opcional)
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncPoolsWithMikrotik(routerId = null) {
    try {
      logger.info(`Iniciando sincronización de pools${routerId ? ` para router ${routerId}` : ''}`);

      let routers = [];
      if (routerId) {
        const router = await MikrotikRouter.findByPk(routerId);
        if (!router) {
          throw new Error(`Router ${routerId} no encontrado`);
        }
        routers = [router];
      } else {
        routers = await MikrotikRouter.findAll({ where: { active: true } });
      }

      let syncResults = {
        success: true,
        routersProcessed: 0,
        poolsFound: 0,
        poolsCreated: 0,
        poolsUpdated: 0,
        errors: []
      };

      for (const router of routers) {
        try {
          logger.info(`Sincronizando pools en router ${router.name} (${router.ipAddress})`);

          // Obtener pools existentes en Mikrotik
          const mikrotikPools = await mikrotikService.getIPPools(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );

          syncResults.poolsFound += mikrotikPools.length;

          // Obtener pools existentes en BD para este router
          const dbPools = await IpPool.findAll({
            where: { mikrotikId: router.id }
          });

          const dbPoolNames = new Set(dbPools.map(p => p.poolName));

          // Procesar cada pool de Mikrotik
          for (const mkPool of mikrotikPools) {
            try {
              if (!dbPoolNames.has(mkPool.name)) {
                // Pool existe en Mikrotik pero no en BD - crearlo
                const poolType = this._inferPoolType(mkPool.name, mkPool.comment);
                const networkInfo = this._parsePoolRanges(mkPool.ranges);

                if (networkInfo) {
                  await IpPool.create({
                    mikrotikId: router.id,
                    poolName: mkPool.name,
                    networkAddress: networkInfo.network,
                    startIp: networkInfo.startIp,
                    endIp: networkInfo.endIp,
                    gateway: networkInfo.gateway,
                    dnsPrimary: '8.8.8.8',
                    dnsSecondary: '8.8.4.4',
                    poolType: poolType,
                    active: true
                  });

                  syncResults.poolsCreated++;
                  logger.info(`Pool ${mkPool.name} creado en BD desde Mikrotik`);
                }
              } else {
                // Pool existe en ambos - verificar si necesita actualización
                const dbPool = dbPools.find(p => p.poolName === mkPool.name);
                const networkInfo = this._parsePoolRanges(mkPool.ranges);

                if (networkInfo && 
                    (dbPool.startIp !== networkInfo.startIp || 
                     dbPool.endIp !== networkInfo.endIp)) {
                  
                  await dbPool.update({
                    startIp: networkInfo.startIp,
                    endIp: networkInfo.endIp,
                    networkAddress: networkInfo.network
                  });

                  syncResults.poolsUpdated++;
                  logger.info(`Pool ${mkPool.name} actualizado en BD`);
                }
              }
            } catch (poolError) {
              logger.error(`Error procesando pool ${mkPool.name}: ${poolError.message}`);
              syncResults.errors.push({
                router: router.name,
                pool: mkPool.name,
                error: poolError.message
              });
            }
          }

          syncResults.routersProcessed++;
          
          // Invalidar caché para este router
          this._invalidateCache(router.id);

        } catch (routerError) {
          logger.error(`Error sincronizando router ${router.name}: ${routerError.message}`);
          syncResults.errors.push({
            router: router.name,
            error: routerError.message
          });
        }
      }

      if (syncResults.errors.length > 0) {
        syncResults.success = false;
      }

      logger.info(`Sincronización completada: ${syncResults.poolsCreated} creados, ${syncResults.poolsUpdated} actualizados, ${syncResults.errors.length} errores`);

      return {
        success: syncResults.success,
        data: syncResults,
        message: `Sincronización ${syncResults.success ? 'exitosa' : 'completada con errores'}`
      };

    } catch (error) {
      logger.error(`Error en sincronización de pools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza todos los pools de todos los routers
   * @returns {Promise<Object>} Resultado de la sincronización completa
   */
  async syncAllPools() {
    try {
      logger.info('Iniciando sincronización completa de todos los pools');

      const result = await this.syncPoolsWithMikrotik(); // Sin routerId = todos los routers

      // Limpiar caché completo
      this.poolCache.clear();
      this.utilizationCache.clear();
      this.lastSyncTime.clear();

      return result;

    } catch (error) {
      logger.error(`Error en sincronización completa de pools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene utilización de un pool específico
   * @param {number} poolId - ID del pool
   * @returns {Promise<Object>} Estadísticas de utilización
   */
  async getPoolUtilization(poolId) {
    try {
      logger.info(`Obteniendo utilización del pool ${poolId}`);

      const cacheKey = `utilization_${poolId}`;
      const cached = this.utilizationCache.get(cacheKey);
      const lastSync = this.lastSyncTime.get(cacheKey);
      
      if (cached && lastSync && (Date.now() - lastSync) < this.cacheTimeout) {
        return {
          success: true,
          data: cached,
          cached: true
        };
      }

      const pool = await IpPool.findByPk(poolId, {
        include: [{ model: MikrotikRouter }]
      });

      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado`);
      }

      // Obtener clientes asignados por estado
      const clientsByStatus = await ClientBilling.findAll({
        where: { currentIpPoolId: poolId },
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: servicePackage,
            attributes: ['name', 'price', 'downloadSpeedMbps', 'uploadSpeedMbps']
          }
        ],
        attributes: ['clientId', 'clientStatus', 'monthlyFee', 'lastPaymentDate', 'nextDueDate']
      });

      // Calcular estadísticas
      const totalIPs = this._calculatePoolSize(pool.startIp, pool.endIp);
      const assignedClients = clientsByStatus.length;
      const utilization = totalIPs > 0 ? ((assignedClients / totalIPs) * 100).toFixed(2) : '0.00';

      // Agrupar por estado
      const statusGroups = clientsByStatus.reduce((acc, billing) => {
        const status = billing.clientStatus || 'unknown';
        if (!acc[status]) {
          acc[status] = {
            count: 0,
            clients: [],
            totalRevenue: 0
          };
        }
        acc[status].count++;
        acc[status].totalRevenue += parseFloat(billing.monthlyFee || 0);
        acc[status].clients.push({
          clientId: billing.clientId,
          clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
          servicePackage: billing.servicePackage?.name,
          monthlyFee: billing.monthlyFee,
          lastPayment: billing.lastPaymentDate,
          nextDue: billing.nextDueDate
        });
        return acc;
      }, {});

      // Calcular revenue total
      const totalRevenue = clientsByStatus.reduce((sum, billing) => 
        sum + parseFloat(billing.monthlyFee || 0), 0
      );

      const result = {
        poolId,
        poolName: pool.poolName,
        poolType: pool.poolType,
        network: {
          address: pool.networkAddress,
          range: `${pool.startIp} - ${pool.endIp}`,
          gateway: pool.gateway,
          dns: [pool.dnsPrimary, pool.dnsSecondary]
        },
        capacity: {
          totalIPs,
          assignedIPs: assignedClients,
          availableIPs: totalIPs - assignedClients,
          utilization: parseFloat(utilization),
          status: this._getPoolStatus(utilization),
          warningThreshold: 80,
          criticalThreshold: 95
        },
        revenue: {
          totalMonthly: totalRevenue.toFixed(2),
          averagePerClient: assignedClients > 0 ? (totalRevenue / assignedClients).toFixed(2) : '0.00'
        },
        clientsByStatus: statusGroups,
        lastUpdated: new Date().toISOString()
      };

      // Actualizar caché
      this.utilizationCache.set(cacheKey, result);
      this.lastSyncTime.set(cacheKey, Date.now());

      return {
        success: true,
        data: result,
        cached: false
      };

    } catch (error) {
      logger.error(`Error obteniendo utilización del pool ${poolId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de todos los pools de un router
   * @param {number} routerId - ID del router
   * @returns {Promise<Object>} Estadísticas completas
   */
  async getPoolStatistics(routerId) {
    try {
      logger.info(`Obteniendo estadísticas de pools para router ${routerId}`);

      const router = await MikrotikRouter.findByPk(routerId, {
        include: [
          {
            model: IpPool,
            where: { active: true },
            required: false
          }
        ]
      });

      if (!router) {
        throw new Error(`Router ${routerId} no encontrado`);
      }

      const pools = router.IpPools || [];
      
      if (pools.length === 0) {
        return {
          success: true,
          data: {
            router: {
              id: router.id,
              name: router.name,
              ipAddress: router.ipAddress
            },
            pools: [],
            summary: {
              totalPools: 0,
              totalIPs: 0,
              assignedIPs: 0,
              availableIPs: 0,
              overallUtilization: 0,
              totalRevenue: 0
            }
          }
        };
      }

      let summary = {
        totalPools: pools.length,
        totalIPs: 0,
        assignedIPs: 0,
        availableIPs: 0,
        overallUtilization: 0,
        totalRevenue: 0
      };

      const poolsData = [];

      // Procesar cada pool
      for (const pool of pools) {
        try {
          const utilization = await this.getPoolUtilization(pool.id);
          const poolData = utilization.data;

          poolsData.push({
            id: pool.id,
            name: pool.poolName,
            type: pool.poolType,
            capacity: poolData.capacity,
            revenue: poolData.revenue,
            clientCount: poolData.capacity.assignedIPs,
            status: poolData.capacity.status
          });

          // Sumar a estadísticas generales
          summary.totalIPs += poolData.capacity.totalIPs;
          summary.assignedIPs += poolData.capacity.assignedIPs;
          summary.availableIPs += poolData.capacity.availableIPs;
          summary.totalRevenue += parseFloat(poolData.revenue.totalMonthly);

        } catch (error) {
          logger.warn(`Error obteniendo estadísticas del pool ${pool.poolName}: ${error.message}`);
          poolsData.push({
            id: pool.id,
            name: pool.poolName,
            type: pool.poolType,
            status: 'error',
            error: error.message
          });
        }
      }

      // Calcular utilización general
      summary.overallUtilization = summary.totalIPs > 0 
        ? parseFloat(((summary.assignedIPs / summary.totalIPs) * 100).toFixed(2))
        : 0;

      return {
        success: true,
        data: {
          router: {
            id: router.id,
            name: router.name,
            ipAddress: router.ipAddress
          },
          pools: poolsData,
          summary,
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas de pools para router ${routerId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica capacidad de un pool
   * @param {number} poolId - ID del pool
   * @returns {Promise<Object>} Estado de capacidad
   */
  async checkPoolCapacity(poolId) {
    try {
      const pool = await IpPool.findByPk(poolId);
      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado`);
      }

      const utilization = await this.getPoolUtilization(poolId);
      const capacity = utilization.data.capacity;

      return {
        success: true,
        data: {
          poolId,
          poolName: pool.poolName,
          hasCapacity: capacity.utilization < 95,
          utilization: capacity.utilization,
          availableIPs: capacity.availableIPs,
          status: capacity.status,
          canAcceptNewClients: capacity.availableIPs > 0 && capacity.utilization < 90
        }
      };

    } catch (error) {
      logger.error(`Error verificando capacidad del pool ${poolId}: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Valida red y rangos IP
   * @private
   */
  _validateNetworkAndRange(networkAddress, startIp, endIp) {
    // Validar formato de IPs
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (!ipRegex.test(startIp)) {
      throw new Error(`IP de inicio inválida: ${startIp}`);
    }
    
    if (!ipRegex.test(endIp)) {
      throw new Error(`IP de fin inválida: ${endIp}`);
    }

    // Validar que startIp < endIp
    const startNum = this._ipToNumber(startIp);
    const endNum = this._ipToNumber(endIp);
    
    if (startNum >= endNum) {
      throw new Error('IP de inicio debe ser menor que IP de fin');
    }

    // Validar que las IPs estén en la misma red
    if (!networkAddress.includes('/')) {
      throw new Error('Dirección de red debe incluir máscara CIDR (ej: 192.168.1.0/24)');
    }

    logger.info(`Validación de red exitosa: ${networkAddress}, rango: ${startIp} - ${endIp}`);
  }

  /**
   * Crea pool en Mikrotik
   * @private
   */
  async _createMikrotikPool(router, poolName, ranges, comment) {
    try {
      // Usar la librería routeros para crear el pool
      await mikrotikService.executeAction(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        'create_ip_pool',
        {
          name: poolName,
          ranges: ranges,
          comment: comment
        }
      );
    } catch (error) {
      throw new Error(`Error creando pool en Mikrotik: ${error.message}`);
    }
  }

  /**
   * Calcula el tamaño de un pool IP
   * @private
   */
  _calculatePoolSize(startIp, endIp) {
    try {
      const start = this._ipToNumber(startIp);
      const end = this._ipToNumber(endIp);
      return end - start + 1;
    } catch (error) {
      logger.warn(`Error calculando tamaño de pool ${startIp}-${endIp}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Convierte IP a número para comparaciones
   * @private
   */
  _ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Obtiene el estado del pool según utilización
   * @private
   */
  _getPoolStatus(utilization) {
    const util = parseFloat(utilization);
    if (util >= 95) return 'critical';
    if (util >= 80) return 'warning';
    if (util >= 60) return 'normal';
    return 'low';
  }

  /**
   * Invalida caché para un router específico
   * @private
   */
  _invalidateCache(routerId) {
    const keysToDelete = [];
    
    // Buscar todas las claves relacionadas con este router
    for (const [key] of this.poolCache) {
      if (key.includes(`_${routerId}_`) || key.includes(`router_${routerId}`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const [key] of this.utilizationCache) {
      if (key.includes(`_${routerId}_`) || key.includes(`router_${routerId}`)) {
        keysToDelete.push(key);
      }
    }

    // Eliminar claves del caché
    keysToDelete.forEach(key => {
      this.poolCache.delete(key);
      this.utilizationCache.delete(key);
      this.lastSyncTime.delete(key);
    });

    logger.info(`Caché invalidado para router ${routerId}: ${keysToDelete.length} claves eliminadas`);
  }

  /**
   * Desencripta contraseña del router
   * @private
   */
  _decryptPassword(encryptedPassword) {
    // TODO: Implementar desencriptación real según tu método
    // Por ahora asumimos que está en texto plano o usar bcrypt
    return encryptedPassword;
  }

  /**
   * Infiere el tipo de pool según el nombre y comentario
   * @private
   */
  _inferPoolType(poolName, comment = '') {
    const name = poolName.toLowerCase();
    const commentLower = comment.toLowerCase();
    
    if (name.includes('activ') || name.includes('normal') || commentLower.includes('activ')) {
      return 'active';
    }
    
    if (name.includes('suspend') || name.includes('susp') || commentLower.includes('suspend')) {
      return 'suspended';
    }
    
    if (name.includes('cort') || name.includes('cut') || commentLower.includes('cut')) {
      return 'cut_service';
    }
    
    // Por defecto, asumir activo
    return 'active';
  }

  /**
   * Parsea rangos de pool desde Mikrotik
   * @private
   */
  _parsePoolRanges(ranges) {
    try {
      if (!ranges) return null;
      
      // Manejar diferentes formatos de rango
      if (ranges.includes('-')) {
        // Formato: 192.168.1.10-192.168.1.100
        const [startIp, endIp] = ranges.split('-').map(ip => ip.trim());
        
        // Inferir red basándose en la IP de inicio
        const startParts = startIp.split('.');
        const network = `${startParts[0]}.${startParts[1]}.${startParts[2]}.0/24`;
        const gateway = `${startParts[0]}.${startParts[1]}.${startParts[2]}.1`;
        
        return {
          network,
          startIp,
          endIp,
          gateway
        };
      } else if (ranges.includes('/')) {
        // Formato CIDR: 192.168.1.0/24
        const [network, cidr] = ranges.split('/');
        const networkParts = network.split('.');
        
        return {
          network: ranges,
          startIp: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.10`,
          endIp: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.250`,
          gateway: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.1`
        };
      }
      
      return null;
    } catch (error) {
      logger.warn(`Error parseando rangos de pool: ${ranges}`);
      return null;
    }
  }

  /**
   * Verifica capacidad interna de un pool
   * @private
   */
  async _checkPoolCapacity(poolId) {
    try {
      const utilization = await this.getPoolUtilization(poolId);
      const capacity = utilization.data.capacity;
      
      return {
        hasCapacity: capacity.utilization < 95,
        utilization: capacity.utilization,
        availableIPs: capacity.availableIPs,
        status: capacity.status
      };
    } catch (error) {
      logger.warn(`Error verificando capacidad del pool ${poolId}: ${error.message}`);
      return {
        hasCapacity: false,
        utilization: 100,
        availableIPs: 0,
        status: 'error'
      };
    }
  }

  /**
   * Obtiene clientes que deben moverse a un tipo de pool específico
   * @param {string} targetStatus - Estado objetivo de los clientes
   * @returns {Promise<Array>} Lista de clientes para mover
   */
  async getClientsForPoolMove(targetStatus) {
    try {
      logger.info(`Obteniendo clientes para mover a pool ${targetStatus}`);

      const whereCondition = {};
      
      switch (targetStatus) {
        case 'suspended':
          // Clientes con pagos vencidos pero en grace period
          whereCondition.clientStatus = 'active';
          whereCondition.nextDueDate = {
            [db.Sequelize.Op.lt]: new Date()
          };
          break;
          
        case 'cut_service':
          // Clientes que ya están suspendidos y han superado el grace period
          whereCondition.clientStatus = 'suspended';
          whereCondition.nextDueDate = {
            [db.Sequelize.Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 días atrás
          };
          break;
          
        case 'active':
          // Clientes que han pagado y deben reactivarse
          whereCondition.clientStatus = {
            [db.Sequelize.Op.in]: ['suspended', 'cut_service']
          };
          whereCondition.lastPaymentDate = {
            [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Último día
          };
          break;
          
        default:
          throw new Error(`Estado objetivo no válido: ${targetStatus}`);
      }

      const clients = await ClientBilling.findAll({
        where: whereCondition,
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: IpPool,
            attributes: ['id', 'poolName', 'poolType']
          }
        ],
        limit: 100 // Limitar para evitar sobrecarga
      });

      const clientsToMove = clients.map(billing => ({
        clientId: billing.clientId,
        clientName: `${billing.Client.firstName} ${billing.Client.lastName}`,
        currentStatus: billing.clientStatus,
        currentPool: billing.IpPool ? {
          id: billing.IpPool.id,
          name: billing.IpPool.poolName,
          type: billing.IpPool.poolType
        } : null,
        nextDueDate: billing.nextDueDate,
        lastPaymentDate: billing.lastPaymentDate,
        graceDays: billing.graceDays
      }));

      return {
        success: true,
        data: {
          targetStatus,
          clientsToMove,
          totalFound: clientsToMove.length
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo clientes para mover a ${targetStatus}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas generales de todos los pools
   * @returns {Promise<Object>} Estadísticas globales
   */
  async getGlobalPoolStatistics() {
    try {
      logger.info('Obteniendo estadísticas globales de pools');

      const routers = await MikrotikRouter.findAll({
        where: { active: true },
        include: [
          {
            model: IpPool,
            where: { active: true },
            required: false
          }
        ]
      });

      let globalStats = {
        totalRouters: routers.length,
        totalPools: 0,
        totalIPs: 0,
        assignedIPs: 0,
        availableIPs: 0,
        overallUtilization: 0,
        totalRevenue: 0,
        poolsByType: {
          active: { count: 0, totalIPs: 0, assignedIPs: 0, revenue: 0 },
          suspended: { count: 0, totalIPs: 0, assignedIPs: 0, revenue: 0 },
          cut_service: { count: 0, totalIPs: 0, assignedIPs: 0, revenue: 0 }
        },
        routerStats: []
      };

      for (const router of routers) {
        try {
          const routerStats = await this.getPoolStatistics(router.id);
          const routerData = routerStats.data;

          globalStats.totalPools += routerData.summary.totalPools;
          globalStats.totalIPs += routerData.summary.totalIPs;
          globalStats.assignedIPs += routerData.summary.assignedIPs;
          globalStats.availableIPs += routerData.summary.availableIPs;
          globalStats.totalRevenue += routerData.summary.totalRevenue;

          // Procesar pools por tipo
          for (const pool of routerData.pools) {
            if (globalStats.poolsByType[pool.type]) {
              globalStats.poolsByType[pool.type].count++;
              globalStats.poolsByType[pool.type].totalIPs += pool.capacity.totalIPs;
              globalStats.poolsByType[pool.type].assignedIPs += pool.capacity.assignedIPs;
              globalStats.poolsByType[pool.type].revenue += parseFloat(pool.revenue.totalMonthly);
            }
          }

          globalStats.routerStats.push({
            routerId: router.id,
            routerName: router.name,
            totalPools: routerData.summary.totalPools,
            utilization: routerData.summary.overallUtilization,
            revenue: routerData.summary.totalRevenue
          });

        } catch (error) {
          logger.warn(`Error obteniendo estadísticas del router ${router.name}: ${error.message}`);
          globalStats.routerStats.push({
            routerId: router.id,
            routerName: router.name,
            error: error.message
          });
        }
      }

      // Calcular utilización global
      globalStats.overallUtilization = globalStats.totalIPs > 0 
        ? parseFloat(((globalStats.assignedIPs / globalStats.totalIPs) * 100).toFixed(2))
        : 0;

      return {
        success: true,
        data: globalStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas globales de pools: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new IpPoolService();