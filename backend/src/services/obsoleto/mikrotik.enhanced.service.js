const db = require('../models');
const logger = require('../utils/logger');
const mikrotikService = require('./mikrotik.service');
const clientMikrotikService = require('./client.mikrotik.service');
const moment = require('moment');

// Modelos necesarios
const MikrotikRouter = db.MikrotikRouter;
const IpPool = db.IpPool;
const servicePackage = db.servicePackage;
const MikrotikProfile = db.MikrotikProfile;
const ClientBilling = db.ClientBilling;
const ClientNetworkConfig = db.ClientNetworkConfig;
const Client = db.Client;
const DeviceMetric = db.DeviceMetric;
const Device = db.Device;
const Node = db.Node;
const Sector = db.Sector;

class MikrotikEnhancedService {
  constructor() {
    this.trafficCache = new Map(); // Cache para métricas de tráfico
    this.lastCacheUpdate = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Obtiene datos de gráficas de tráfico por cliente
   * @param {number} clientId - ID del cliente
   * @param {string} period - Período de tiempo ('1h', '6h', '24h', '7d', '30d')
   * @returns {Promise<Object>} Datos formateados para Chart.js
   */
  async getClientTrafficGraphs(clientId, period = '24h') {
    try {
      logger.info(`Obteniendo gráficas de tráfico para cliente ${clientId}, período: ${period}`);

      // Validar cliente existe
      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientNetworkConfig,
            include: [{ model: MikrotikRouter }]
          },
          {
            model: ClientBilling,
            include: [{ model: servicePackage }]
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      if (!client.ClientNetworkConfig || !client.ClientNetworkConfig.MikrotikRouter) {
        throw new Error(`Cliente ${clientId} no tiene configuración de red o router asignado`);
      }

      const router = client.ClientNetworkConfig.MikrotikRouter;
      const pppoeUsername = client.ClientNetworkConfig.pppoeUsername;

      // Obtener métricas históricas
      const startDate = this._getStartDateForPeriod(period);
      const metrics = await DeviceMetric.findAll({
        where: {
          deviceId: router.id,
          recordedAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        order: [['recordedAt', 'ASC']],
        limit: 1000 // Limitar para evitar sobrecarga
      });

      // Obtener datos en tiempo real del router
      let currentTraffic = null;
      try {
        const activeSessions = await mikrotikService.getActivePPPoESessions(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted)
        );

        const clientSession = activeSessions.find(session => 
          session.name === pppoeUsername
        );

        if (clientSession) {
          currentTraffic = {
            bytesIn: parseInt(clientSession['bytes-in']) || 0,
            bytesOut: parseInt(clientSession['bytes-out']) || 0,
            packetsIn: parseInt(clientSession['packets-in']) || 0,
            packetsOut: parseInt(clientSession['packets-out']) || 0,
            uptime: clientSession.uptime || '0s'
          };
        }
      } catch (error) {
        logger.warn(`No se pudo obtener tráfico en tiempo real para cliente ${clientId}: ${error.message}`);
      }

      // Formatear datos para Chart.js
      const chartData = this._formatTrafficDataForChart(metrics, period, currentTraffic);

      // Obtener información del paquete contratado
      const packageInfo = client.ClientBilling?.servicePackage ? {
        name: client.ClientBilling.servicePackage.name,
        downloadSpeed: client.ClientBilling.servicePackage.downloadSpeedMbps,
        uploadSpeed: client.ClientBilling.servicePackage.uploadSpeedMbps,
        price: client.ClientBilling.servicePackage.price
      } : null;

      return {
        success: true,
        data: {
          clientId,
          period,
          packageInfo,
          currentTraffic,
          charts: chartData,
          lastUpdate: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo gráficas de tráfico para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene métricas de calidad para un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Métricas de calidad (latencia, packet loss, uptime, señal)
   */
  async getClientQualityMetrics(clientId) {
    try {
      logger.info(`Obteniendo métricas de calidad para cliente ${clientId}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientNetworkConfig,
            include: [{ model: MikrotikRouter }]
          },
          {
            model: Device,
            where: { type: 'cpe' },
            required: false
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      const router = client.ClientNetworkConfig?.MikrotikRouter;
      const cpeDevice = client.Devices?.find(d => d.type === 'cpe');

      let qualityMetrics = {
        connectivity: {
          status: 'unknown',
          lastSeen: null,
          uptime: null
        },
        latency: {
          current: null,
          average24h: null,
          status: 'unknown'
        },
        packetLoss: {
          current: null,
          average24h: null,
          status: 'unknown'
        },
        signalQuality: {
          rssi: null,
          snr: null,
          status: 'unknown',
          lastUpdate: null
        },
        bandwidth: {
          currentDown: null,
          currentUp: null,
          utilizationDown: null,
          utilizationUp: null
        }
      };

      // Verificar conectividad PPPoE si hay router configurado
      if (router && client.ClientNetworkConfig.pppoeUsername) {
        try {
          const activeSessions = await mikrotikService.getActivePPPoESessions(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );

          const clientSession = activeSessions.find(session => 
            session.name === client.ClientNetworkConfig.pppoeUsername
          );

          if (clientSession) {
            qualityMetrics.connectivity = {
              status: 'online',
              lastSeen: new Date().toISOString(),
              uptime: clientSession.uptime
            };

            // Calcular utilización de ancho de banda
            const packageInfo = await this._getClientPackageInfo(clientId);
            if (packageInfo) {
              const currentDownMbps = (parseInt(clientSession['rx-bits-per-second']) || 0) / 1000000;
              const currentUpMbps = (parseInt(clientSession['tx-bits-per-second']) || 0) / 1000000;
              
              qualityMetrics.bandwidth = {
                currentDown: currentDownMbps,
                currentUp: currentUpMbps,
                utilizationDown: (currentDownMbps / packageInfo.downloadSpeedMbps) * 100,
                utilizationUp: (currentUpMbps / packageInfo.uploadSpeedMbps) * 100
              };
            }
          } else {
            qualityMetrics.connectivity.status = 'offline';
          }
        } catch (error) {
          logger.warn(`Error verificando conectividad PPPoE para cliente ${clientId}: ${error.message}`);
          qualityMetrics.connectivity.status = 'error';
        }
      }

      // Obtener métricas de CPE si existe
      if (cpeDevice) {
        try {
          const cpeMetrics = await this._getCPEQualityMetrics(cpeDevice);
          qualityMetrics.signalQuality = cpeMetrics.signalQuality;
          qualityMetrics.latency = cpeMetrics.latency;
          qualityMetrics.packetLoss = cpeMetrics.packetLoss;
        } catch (error) {
          logger.warn(`Error obteniendo métricas de CPE para cliente ${clientId}: ${error.message}`);
        }
      }

      // Obtener métricas históricas de los últimos 24h
      const historicalMetrics = await this._getHistoricalQualityMetrics(clientId, '24h');
      if (historicalMetrics) {
        qualityMetrics.latency.average24h = historicalMetrics.averageLatency;
        qualityMetrics.packetLoss.average24h = historicalMetrics.averagePacketLoss;
      }

      // Determinar estados de calidad
      qualityMetrics.latency.status = this._getLatencyStatus(qualityMetrics.latency.current);
      qualityMetrics.packetLoss.status = this._getPacketLossStatus(qualityMetrics.packetLoss.current);
      qualityMetrics.signalQuality.status = this._getSignalStatus(qualityMetrics.signalQuality.rssi);

      return {
        success: true,
        data: qualityMetrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error obteniendo métricas de calidad para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene datos de topología de red para un nodo
   * @param {number} nodeId - ID del nodo
   * @returns {Promise<Object>} Datos de topología para visualización
   */
  async getNetworkTopologyData(nodeId) {
    try {
      logger.info(`Obteniendo datos de topología para nodo ${nodeId}`);

      const node = await Node.findByPk(nodeId, {
        include: [
          {
            model: Sector,
            include: [
              {
                model: Client,
                where: { active: true },
                required: false,
                include: [
                  {
                    model: ClientNetworkConfig,
                    include: [{ model: MikrotikRouter }]
                  },
                  {
                    model: ClientBilling,
                    include: [{ model: servicePackage }]
                  }
                ]
              }
            ]
          },
          {
            model: MikrotikRouter,
            include: [
              {
                model: IpPool,
                where: { active: true },
                required: false
              }
            ]
          }
        ]
      });

      if (!node) {
        throw new Error(`Nodo ${nodeId} no encontrado`);
      }

      // Construir estructura de topología
      const topology = {
        node: {
          id: node.id,
          name: node.name,
          location: node.location,
          coordinates: {
            latitude: node.latitude,
            longitude: node.longitude
          },
          status: 'unknown'
        },
        routers: [],
        sectors: [],
        clients: [],
        statistics: {
          totalClients: 0,
          activeClients: 0,
          suspendedClients: 0,
          totalBandwidth: 0,
          usedBandwidth: 0,
          poolUtilization: {}
        }
      };

      // Procesar routers del nodo
      for (const router of node.MikrotikRouters || []) {
        const routerData = {
          id: router.id,
          name: router.name,
          ipAddress: router.ipAddress,
          model: router.routerModel,
          version: router.routerosVersion,
          status: 'unknown',
          pools: [],
          interfaces: []
        };

        // Verificar estado del router
        try {
          const systemInfo = await mikrotikService.getDeviceInfo(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );
          
          routerData.status = 'online';
          routerData.uptime = systemInfo.uptime;
          routerData.cpu = systemInfo['cpu-load'];
          routerData.memory = systemInfo['free-memory'];
        } catch (error) {
          routerData.status = 'offline';
          logger.warn(`Router ${router.name} no responde: ${error.message}`);
        }

        // Procesar pools IP
        for (const pool of router.IpPools || []) {
          const poolData = {
            id: pool.id,
            name: pool.poolName,
            type: pool.poolType,
            network: pool.networkAddress,
            range: `${pool.startIp} - ${pool.endtIp}`,
            utilization: 0,
            clientCount: 0
          };

          // Calcular utilización del pool
          const poolClients = await ClientBilling.count({
            where: { currentIpPoolId: pool.id }
          });
          
          const totalIPs = this._calculatePoolSize(pool.startIp, pool.endtIp);
          poolData.utilization = totalIPs > 0 ? (poolClients / totalIPs) * 100 : 0;
          poolData.clientCount = poolClients;
          
          topology.statistics.poolUtilization[pool.poolType] = poolData.utilization;
          
          routerData.pools.push(poolData);
        }

        topology.routers.push(routerData);
      }

      // Procesar sectores
      for (const sector of node.Sectors || []) {
        const sectorData = {
          id: sector.id,
          name: sector.name,
          frequency: sector.frequency,
          azimuth: sector.azimuth,
          polarization: sector.polarization,
          elevation: sector.elevation,
          clientCount: sector.Clients?.length || 0,
          activeClients: 0,
          clients: []
        };

        // Procesar clientes del sector
        for (const client of sector.Clients || []) {
          const clientData = {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            status: client.ClientBilling?.clientStatus || 'unknown',
            package: client.ClientBilling?.servicePackage?.name || 'Sin paquete',
            bandwidth: {
              down: client.ClientBilling?.servicePackage?.downloadSpeedMbps || 0,
              up: client.ClientBilling?.servicePackage?.uploadSpeedMbps || 0
            },
            coordinates: {
              latitude: client.latitude,
              longitude: client.longitude
            }
          };

          if (clientData.status === 'active') {
            sectorData.activeClients++;
            topology.statistics.totalBandwidth += clientData.bandwidth.down;
          }

          sectorData.clients.push(clientData);
          topology.clients.push(clientData);
        }

        topology.sectors.push(sectorData);
      }

      // Calcular estadísticas generales
      topology.statistics.totalClients = topology.clients.length;
      topology.statistics.activeClients = topology.clients.filter(c => c.status === 'active').length;
      topology.statistics.suspendedClients = topology.clients.filter(c => c.status === 'suspended').length;

      return {
        success: true,
        data: topology,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error obteniendo topología de red para nodo ${nodeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene utilización de ancho de banda para un router
   * @param {number} routerId - ID del router Mikrotik
   * @returns {Promise<Object>} Estadísticas de utilización
   */
  async getBandwidthUtilization(routerId) {
    try {
      logger.info(`Obteniendo utilización de ancho de banda para router ${routerId}`);

      const router = await MikrotikRouter.findByPk(routerId, {
        include: [
          {
            model: IpPool,
            include: [
              {
                model: ClientBilling,
                include: [
                  {
                    model: Client,
                    include: [{ model: ClientNetworkConfig }]
                  },
                  { model: servicePackage }
                ]
              }
            ]
          }
        ]
      });

      if (!router) {
        throw new Error(`Router ${routerId} no encontrado`);
      }

      let utilization = {
        router: {
          id: router.id,
          name: router.name,
          ipAddress: router.ipAddress
        },
        summary: {
          totalContractedDown: 0,
          totalContractedUp: 0,
          currentUsageDown: 0,
          currentUsageUp: 0,
          activeClients: 0,
          totalClients: 0
        },
        interfaces: [],
        pools: []
      };

      // Obtener interfaces del router
      try {
        const interfaces = await mikrotikService.executeAction(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted),
          'get_interfaces'
        );

        for (const iface of interfaces) {
          const interfaceData = {
            name: iface.name,
            type: iface.type,
            running: iface.running === 'true',
            rxBytes: parseInt(iface['rx-byte']) || 0,
            txBytes: parseInt(iface['tx-byte']) || 0,
            rxBps: parseInt(iface['rx-bits-per-second']) || 0,
            txBps: parseInt(iface['tx-bits-per-second']) || 0,
            rxMbps: (parseInt(iface['rx-bits-per-second']) || 0) / 1000000,
            txMbps: (parseInt(iface['tx-bits-per-second']) || 0) / 1000000
          };

          utilization.interfaces.push(interfaceData);
        }
      } catch (error) {
        logger.warn(`Error obteniendo interfaces del router ${routerId}: ${error.message}`);
      }

      // Procesar pools y calcular utilización
      for (const pool of router.IpPools || []) {
        const poolData = {
          id: pool.id,
          name: pool.poolName,
          type: pool.poolType,
          contractedBandwidthDown: 0,
          contractedBandwidthUp: 0,
          activeClients: 0,
          clients: []
        };

        // Procesar clientes del pool
        for (const billing of pool.ClientBillings || []) {
          if (billing.Client && billing.servicePackage) {
            const clientData = {
              id: billing.Client.id,
              name: `${billing.Client.firstName} ${billing.Client.lastName}`,
              status: billing.clientStatus,
              package: billing.servicePackage.name,
              contractedDown: billing.servicePackage.downloadSpeedMbps,
              contractedUp: billing.servicePackage.uploadSpeedMbps,
              currentUsageDown: 0,
              currentUsageUp: 0
            };

            // Obtener uso actual si el cliente está activo
            if (billing.clientStatus === 'active' && billing.Client.ClientNetworkConfig?.pppoeUsername) {
              try {
                const activeSessions = await mikrotikService.getActivePPPoESessions(
                  router.ipAddress,
                  router.apiPort,
                  router.username,
                  this._decryptPassword(router.passwordEncrypted)
                );

                const clientSession = activeSessions.find(session => 
                  session.name === billing.Client.ClientNetworkConfig.pppoeUsername
                );

                if (clientSession) {
                  clientData.currentUsageDown = (parseInt(clientSession['rx-bits-per-second']) || 0) / 1000000;
                  clientData.currentUsageUp = (parseInt(clientSession['tx-bits-per-second']) || 0) / 1000000;
                }
              } catch (error) {
                logger.warn(`Error obteniendo sesión PPPoE para cliente ${billing.Client.id}: ${error.message}`);
              }
            }

            poolData.contractedBandwidthDown += clientData.contractedDown;
            poolData.contractedBandwidthUp += clientData.contractedUp;
            
            if (billing.clientStatus === 'active') {
              poolData.activeClients++;
              utilization.summary.currentUsageDown += clientData.currentUsageDown;
              utilization.summary.currentUsageUp += clientData.currentUsageUp;
            }

            poolData.clients.push(clientData);
          }
        }

        utilization.summary.totalContractedDown += poolData.contractedBandwidthDown;
        utilization.summary.totalContractedUp += poolData.contractedBandwidthUp;
        utilization.summary.activeClients += poolData.activeClients;
        utilization.summary.totalClients += poolData.clients.length;

        utilization.pools.push(poolData);
      }

      // Calcular porcentajes de utilización
      utilization.summary.utilizationDown = utilization.summary.totalContractedDown > 0 
        ? (utilization.summary.currentUsageDown / utilization.summary.totalContractedDown) * 100 
        : 0;
      
      utilization.summary.utilizationUp = utilization.summary.totalContractedUp > 0 
        ? (utilization.summary.currentUsageUp / utilization.summary.totalContractedUp) * 100 
        : 0;

      return {
        success: true,
        data: utilization,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error obteniendo utilización de ancho de banda para router ${routerId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza servicePackages con MikrotikProfiles
   * @param {number} routerId - ID del router (opcional, si no se especifica sincroniza todos)
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncservicePackagesWithProfiles(routerId = null) {
    try {
      logger.info(`Iniciando sincronización de paquetes con perfiles Mikrotik${routerId ? ` para router ${routerId}` : ''}`);

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

      const servicePackages = await servicePackage.findAll({ where: { active: true } });
      let syncResults = {
        success: true,
        routersProcessed: 0,
        profilesCreated: 0,
        profilesUpdated: 0,
        errors: []
      };

      for (const router of routers) {
        try {
          logger.info(`Sincronizando router ${router.name} (${router.ipAddress})`);

          // Obtener perfiles existentes en Mikrotik
          const existingProfiles = await mikrotikService.executeAction(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted),
            'get_pppoe_profiles'
          );

          for (const servicePackage of servicePackages) {
            const profileName = `profile-${servicePackage.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Buscar o crear MikrotikProfile en BD
            let [mikrotikProfile, created] = await MikrotikProfile.findOrCreate({
              where: {
                mikrotikId: router.id,
                servicePackageId: servicePackage.id
              },
              defaults: {
                profile_name: profileName,
                rateLimit: `${servicePackage.downloadSpeedMbps}M/${servicePackage.uploadSpeedMbps}M`,
                burstLimit: `${Math.round(servicePackage.downloadSpeedMbps * 1.2)}M/${Math.round(servicePackage.uploadSpeedMbps * 1.2)}M`,
                burstThreshold: `${Math.round(servicePackage.downloadSpeedMbps * 0.8)}M/${Math.round(servicePackage.uploadSpeedMbps * 0.8)}M`,
                burstTime: '8s/8s',
                priority: '8',
                active: true
              }
            });

            // Verificar si el perfil existe en Mikrotik
            const existsInMikrotik = existingProfiles.some(p => p.name === profileName);

            if (!existsInMikrotik) {
              // Crear perfil en Mikrotik
              try {
                await mikrotikService.executeAction(
                  router.ipAddress,
                  router.apiPort,
                  router.username,
                  this._decryptPassword(router.passwordEncrypted),
                  'create_pppoe_profile',
                  {
                    name: profileName,
                    'rate-limit': mikrotikProfile.rateLimit,
                    'burst-limit': mikrotikProfile.burstLimit,
                    'burst-threshold': mikrotikProfile.burstThreshold,
                    'burst-time': mikrotikProfile.burstTime,
                    priority: mikrotikProfile.priority
                  }
                );

                if (created) {
                  syncResults.profilesCreated++;
                } else {
                  syncResults.profilesUpdated++;
                }

                logger.info(`Perfil ${profileName} creado en router ${router.name}`);
              } catch (error) {
                logger.error(`Error creando perfil ${profileName} en router ${router.name}: ${error.message}`);
                syncResults.errors.push({
                  router: router.name,
                  profile: profileName,
                  error: error.message
                });
              }
            } else {
              // Actualizar perfil existente si es necesario
              try {
                await mikrotikService.executeAction(
                  router.ipAddress,
                  router.apiPort,
                  router.username,
                  this._decryptPassword(router.passwordEncrypted),
                  'update_pppoe_profile',
                  {
                    name: profileName,
                    'rate-limit': mikrotikProfile.rateLimit,
                    'burst-limit': mikrotikProfile.burstLimit,
                    'burst-threshold': mikrotikProfile.burstThreshold,
                    'burst-time': mikrotikProfile.burstTime,
                    priority: mikrotikProfile.priority
                  }
                );

                syncResults.profilesUpdated++;
                logger.info(`Perfil ${profileName} actualizado en router ${router.name}`);
              } catch (error) {
                logger.error(`Error actualizando perfil ${profileName} en router ${router.name}: ${error.message}`);
                syncResults.errors.push({
                  router: router.name,
                  profile: profileName,
                  error: error.message
                });
              }
            }

            // Actualizar timestamp de sincronización
            await mikrotikProfile.update({ lastSync: new Date() });
          }

          syncResults.routersProcessed++;
        } catch (error) {
          logger.error(`Error procesando router ${router.name}: ${error.message}`);
          syncResults.errors.push({
            router: router.name,
            error: error.message
          });
        }
      }

      if (syncResults.errors.length > 0) {
        syncResults.success = false;
      }

      logger.info(`Sincronización completada: ${syncResults.profilesCreated} creados, ${syncResults.profilesUpdated} actualizados, ${syncResults.errors.length} errores`);

      return {
        success: syncResults.success,
        data: syncResults,
        message: `Sincronización ${syncResults.success ? 'exitosa' : 'completada con errores'}`
      };

    } catch (error) {
      logger.error(`Error en sincronización de paquetes con perfiles: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Calcula la fecha de inicio según el período especificado
   * @private
   */
  _getStartDateForPeriod(period) {
    const now = new Date();
    switch (period) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Formatea datos de tráfico para Chart.js
   * @private
   */
  _formatTrafficDataForChart(metrics, period, currentTraffic) {
    const labels = [];
    const downloadData = [];
    const uploadData = [];
    const latencyData = [];

    // Agrupar métricas por intervalos según el período
    const intervalMinutes = this._getIntervalForPeriod(period);
    const groupedMetrics = this._groupMetricsByInterval(metrics, intervalMinutes);

    groupedMetrics.forEach(group => {
      labels.push(moment(group.timestamp).format('HH:mm'));
      
      // Convertir bytes a Mbps
      const downloadMbps = group.avgBytesIn ? (group.avgBytesIn * 8) / (1024 * 1024) : 0;
      const uploadMbps = group.avgBytesOut ? (group.avgBytesOut * 8) / (1024 * 1024) : 0;
      
      downloadData.push(downloadMbps.toFixed(2));
      uploadData.push(uploadMbps.toFixed(2));
      latencyData.push(group.avgLatency || 0);
    });

    return {
      bandwidth: {
        labels,
        datasets: [
          {
            label: 'Descarga (Mbps)',
            data: downloadData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Subida (Mbps)',
            data: uploadData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ]
      },
      latency: {
        labels,
        datasets: [
          {
            label: 'Latencia (ms)',
            data: latencyData,
            borderColor: 'rgb(255, 205, 86)',
            backgroundColor: 'rgba(255, 205, 86, 0.2)',
            tension: 0.1
          }
        ]
      },
      summary: {
        currentTraffic,
        peakDownload: Math.max(...downloadData.map(d => parseFloat(d))),
        peakUpload: Math.max(...uploadData.map(d => parseFloat(d))),
        averageLatency: latencyData.length > 0 ? 
          (latencyData.reduce((a, b) => a + b, 0) / latencyData.length).toFixed(2) : 0,
        dataPoints: labels.length
      }
    };
  }

  /**
   * Obtiene el intervalo en minutos según el período
   * @private
   */
  _getIntervalForPeriod(period) {
    switch (period) {
      case '1h': return 2;   // Cada 2 minutos
      case '6h': return 15;  // Cada 15 minutos
      case '24h': return 60; // Cada hora
      case '7d': return 360; // Cada 6 horas
      case '30d': return 1440; // Cada día
      default: return 60;
    }
  }

  /**
   * Agrupa métricas por intervalos de tiempo
   * @private
   */
  _groupMetricsByInterval(metrics, intervalMinutes) {
    const grouped = [];
    const intervalMs = intervalMinutes * 60 * 1000;

    if (metrics.length === 0) return grouped;

    const startTime = new Date(metrics[0].recordedAt).getTime();
    const endTime = new Date(metrics[metrics.length - 1].recordedAt).getTime();

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const intervalEnd = time + intervalMs;
      const intervalMetrics = metrics.filter(m => {
        const metricTime = new Date(m.recordedAt).getTime();
        return metricTime >= time && metricTime < intervalEnd;
      });

      if (intervalMetrics.length > 0) {
        const group = {
          timestamp: new Date(time),
          count: intervalMetrics.length,
          avgBytesIn: 0,
          avgBytesOut: 0,
          avgLatency: 0,
          avgPacketLoss: 0
        };

        // Calcular promedios
        intervalMetrics.forEach(metric => {
          const traffic = metric.interfaceTraffic || {};
          group.avgBytesIn += (traffic.rxBps || 0);
          group.avgBytesOut += (traffic.txBps || 0);
          group.avgLatency += (metric.latency || 0);
          group.avgPacketLoss += (metric.packetLoss || 0);
        });

        group.avgBytesIn /= intervalMetrics.length;
        group.avgBytesOut /= intervalMetrics.length;
        group.avgLatency /= intervalMetrics.length;
        group.avgPacketLoss /= intervalMetrics.length;

        grouped.push(group);
      }
    }

    return grouped;
  }

  /**
   * Desencripta contraseña (implementación simple)
   * @private
   */
  _decryptPassword(encryptedPassword) {
    // TODO: Implementar desencriptación real
    // Por ahora asumimos que está en texto plano o usar una lógica simple
    return encryptedPassword;
  }

  /**
   * Obtiene información del paquete contratado por el cliente
   * @private
   */
  async _getClientPackageInfo(clientId) {
    try {
      const billing = await ClientBilling.findOne({
        where: { clientId: clientId },
        include: [{ model: servicePackage }]
      });

      return billing?.servicePackage || null;
    } catch (error) {
      logger.warn(`Error obteniendo paquete del cliente ${clientId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene métricas de calidad del CPE
   * @private
   */
  async _getCPEQualityMetrics(cpeDevice) {
    const metrics = {
      signalQuality: {
        rssi: null,
        snr: null,
        status: 'unknown',
        lastUpdate: null
      },
      latency: {
        current: null
      },
      packetLoss: {
        current: null
      }
    };

    try {
      // Obtener métricas más recientes del dispositivo
      const latestMetric = await DeviceMetric.findOne({
        where: { deviceId: cpeDevice.id },
        order: [['recordedAt', 'DESC']]
      });

      if (latestMetric) {
        metrics.latency.current = latestMetric.latency;
        metrics.packetLoss.current = latestMetric.packetLoss;
        
        // Extraer métricas específicas de tecnología
        const techMetrics = latestMetric.technologySpecificMetrics || {};
        metrics.signalQuality.rssi = techMetrics.rssi || techMetrics.signal;
        metrics.signalQuality.snr = techMetrics.snr || techMetrics.noise;
        metrics.signalQuality.lastUpdate = latestMetric.recordedAt;
      }

      return metrics;
    } catch (error) {
      logger.warn(`Error obteniendo métricas de CPE ${cpeDevice.id}: ${error.message}`);
      return metrics;
    }
  }

  /**
   * Obtiene métricas históricas de calidad
   * @private
   */
  async _getHistoricalQualityMetrics(clientId, period) {
    try {
      const client = await Client.findByPk(clientId, {
        include: [{ model: Device, where: { type: 'cpe' }, required: false }]
      });

      if (!client?.Devices?.length) return null;

      const startDate = this._getStartDateForPeriod(period);
      const metrics = await DeviceMetric.findAll({
        where: {
          deviceId: { [db.Sequelize.Op.in]: client.Devices.map(d => d.id) },
          recordedAt: { [db.Sequelize.Op.gte]: startDate }
        },
        order: [['recordedAt', 'DESC']],
        limit: 100
      });

      if (metrics.length === 0) return null;

      const averageLatency = metrics.reduce((sum, m) => sum + (m.latency || 0), 0) / metrics.length;
      const averagePacketLoss = metrics.reduce((sum, m) => sum + (m.packetLoss || 0), 0) / metrics.length;

      return {
        averageLatency: parseFloat(averageLatency.toFixed(2)),
        averagePacketLoss: parseFloat(averagePacketLoss.toFixed(2)),
        sampleCount: metrics.length
      };
    } catch (error) {
      logger.warn(`Error obteniendo métricas históricas para cliente ${clientId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Determina el estado de la latencia
   * @private
   */
  _getLatencyStatus(latency) {
    if (latency === null || latency === undefined) return 'unknown';
    if (latency <= 50) return 'excellent';
    if (latency <= 100) return 'good';
    if (latency <= 200) return 'fair';
    return 'poor';
  }

  /**
   * Determina el estado del packet loss
   * @private
   */
  _getPacketLossStatus(packetLoss) {
    if (packetLoss === null || packetLoss === undefined) return 'unknown';
    if (packetLoss <= 1) return 'excellent';
    if (packetLoss <= 3) return 'good';
    if (packetLoss <= 5) return 'fair';
    return 'poor';
  }

  /**
   * Determina el estado de la señal
   * @private
   */
  _getSignalStatus(rssi) {
    if (rssi === null || rssi === undefined) return 'unknown';
    if (rssi >= -50) return 'excellent';
    if (rssi >= -60) return 'good';
    if (rssi >= -70) return 'fair';
    return 'poor';
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
   * Convierte IP a número
   * @private
   */
  _ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Mueve cliente entre pools por estado de pago
   * @param {number} clientId - ID del cliente
   * @param {string} fromPoolType - Tipo de pool origen
   * @param {string} toPoolType - Tipo de pool destino
   * @returns {Promise<Object>} Resultado de la operación
   */
  async moveClientBetweenPools(clientId, fromPoolType, toPoolType) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Moviendo cliente ${clientId} de pool ${fromPoolType} a ${toPoolType}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientBilling,
            include: [{ model: IpPool, as: 'CurrentIpPool' }]
          },
          {
            model: ClientNetworkConfig,
            include: [{ model: MikrotikRouter }]
          }
        ],
        transaction
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      if (!client.ClientBilling) {
        throw new Error(`Cliente ${clientId} no tiene configuración de facturación`);
      }

      const router = client.ClientNetworkConfig?.MikrotikRouter;
      if (!router) {
        throw new Error(`Cliente ${clientId} no tiene router asignado`);
      }

      // Buscar pool de destino
      const targetPool = await IpPool.findOne({
        where: {
          mikrotikId: router.id,
          poolType: toPoolType,
          active: true
        },
        transaction
      });

      if (!targetPool) {
        throw new Error(`Pool de tipo ${toPoolType} no encontrado para router ${router.id}`);
      }

      // Verificar capacidad del pool de destino
      const currentClientsInPool = await ClientBilling.count({
        where: { currentIpPoolId: targetPool.id },
        transaction
      });

      const poolCapacity = this._calculatePoolSize(targetPool.startIp, targetPool.endtIp);
      if (currentClientsInPool >= poolCapacity) {
        throw new Error(`Pool ${targetPool.poolName} está lleno (${currentClientsInPool}/${poolCapacity})`);
      }

      // Actualizar cliente en la base de datos
      await client.ClientBilling.update({
        currentIpPoolId: targetPool.id,
        clientStatus: this._getClientStatusFromPoolType(toPoolType)
      }, { transaction });

      // Si el cliente tiene sesión PPPoE activa, desconectarla para forzar reconexión con nueva IP
      if (client.ClientNetworkConfig.pppoeUsername) {
        try {
          await mikrotikService.executeAction(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted),
            'disconnect_pppoe_user',
            { username: client.ClientNetworkConfig.pppoeUsername }
          );

          logger.info(`Sesión PPPoE desconectada para cliente ${clientId}`);
        } catch (error) {
          logger.warn(`Error desconectando sesión PPPoE para cliente ${clientId}: ${error.message}`);
          // No fallar la transacción por esto
        }
      }

      await transaction.commit();

      return {
        success: true,
        data: {
          clientId,
          fromPool: fromPoolType,
          toPool: toPoolType,
          newPoolId: targetPool.id,
          newStatus: this._getClientStatusFromPoolType(toPoolType)
        },
        message: `Cliente movido exitosamente de ${fromPoolType} a ${toPoolType}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error moviendo cliente ${clientId} entre pools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el estado del cliente según el tipo de pool
   * @private
   */
  _getClientStatusFromPoolType(poolType) {
    switch (poolType) {
      case 'active': return 'active';
      case 'suspended': return 'suspended';
      case 'cutService': return 'cutService';
      default: return 'pending';
    }
  }

  /**
   * Obtiene información completa del sistema de un router
   * @param {number} routerId - ID del router
   * @returns {Promise<Object>} Información del sistema
   */
  async getRouterSystemInfo(routerId) {
    try {
      logger.info(`Obteniendo información del sistema para router ${routerId}`);

      const router = await MikrotikRouter.findByPk(routerId);
      if (!router) {
        throw new Error(`Router ${routerId} no encontrado`);
      }

      const systemInfo = await mikrotikService.getDeviceInfo(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      // Obtener información adicional
      const interfaces = await mikrotikService.executeAction(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        'get_interfaces'
      );

      const resources = await mikrotikService.executeAction(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        'get_system_resources'
      );

      return {
        success: true,
        data: {
          router: {
            id: router.id,
            name: router.name,
            ipAddress: router.ipAddress,
            model: router.routerModel
          },
          system: {
            identity: systemInfo['system-identity'] || systemInfo.identity,
            version: systemInfo.version,
            uptime: systemInfo.uptime,
            buildTime: systemInfo['build-time'],
            factorySoftware: systemInfo['factory-software']
          },
          resources: {
            cpuLoad: resources?.['cpu-load'] || systemInfo['cpu-load'],
            freeMemory: resources?.['free-memory'] || systemInfo['free-memory'],
            totalMemory: resources?.['total-memory'] || systemInfo['total-memory'],
            freeHddSpace: resources?.['free-hdd-space'] || systemInfo['free-hdd-space'],
            totalHddSpace: resources?.['total-hdd-space'] || systemInfo['total-hdd-space'],
            badBlocks: resources?.['bad-blocks'] || 0
          },
          interfaces: interfaces.map(iface => ({
            name: iface.name,
            type: iface.type,
            running: iface.running === 'true',
            disabled: iface.disabled === 'true',
            comment: iface.comment || '',
            mtu: parseInt(iface.mtu) || 0,
            macAddress: iface['mac-address'] || '',
            rxBytes: parseInt(iface['rx-byte']) || 0,
            txBytes: parseInt(iface['tx-byte']) || 0,
            rxPackets: parseInt(iface['rx-packet']) || 0,
            txPackets: parseInt(iface['tx-packet']) || 0,
            rxErrors: parseInt(iface['rx-error']) || 0,
            txErrors: parseInt(iface['tx-error']) || 0,
            rxDrops: parseInt(iface['rx-drop']) || 0,
            txDrops: parseInt(iface['tx-drop']) || 0
          })),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo información del sistema para router ${routerId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica conectividad de un cliente específico
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Estado de conectividad
   */
  async checkClientConnectivity(clientId) {
    try {
      logger.info(`Verificando conectividad del cliente ${clientId}`);

      const client = await Client.findByPk(clientId, {
        include: [
          {
            model: ClientNetworkConfig,
            include: [{ model: MikrotikRouter }]
          },
          {
            model: ClientBilling,
            include: [{ model: servicePackage }]
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      const router = client.ClientNetworkConfig?.MikrotikRouter;
      const pppoeUsername = client.ClientNetworkConfig?.pppoeUsername;

      let connectivity = {
        client: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          package: client.ClientBilling?.servicePackage?.name || 'Sin paquete',
          status: client.ClientBilling?.clientStatus || 'unknown'
        },
        connection: {
          method: client.ClientNetworkConfig?.protocol || 'unknown',
          username: pppoeUsername,
          status: 'unknown',
          ipAddress: null,
          uptime: null,
          lastActivity: null
        },
        traffic: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          currentDownMbps: 0,
          currentUpMbps: 0
        },
        quality: {
          latency: null,
          packetLoss: null,
          signalStrength: null
        }
      };

      if (!router || !pppoeUsername) {
        connectivity.connection.status = 'not_configured';
        return {
          success: true,
          data: connectivity,
          message: 'Cliente no tiene configuración de red completa'
        };
      }

      // Verificar sesión PPPoE activa
      try {
        const activeSessions = await mikrotikService.getActivePPPoESessions(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted)
        );

        const clientSession = activeSessions.find(session => 
          session.name === pppoeUsername
        );

        if (clientSession) {
          connectivity.connection = {
            method: 'pppoe',
            username: pppoeUsername,
            status: 'online',
            ipAddress: clientSession.address,
            uptime: clientSession.uptime,
            lastActivity: new Date().toISOString()
          };

          connectivity.traffic = {
            bytesIn: parseInt(clientSession['bytes-in']) || 0,
            bytesOut: parseInt(clientSession['bytes-out']) || 0,
            packetsIn: parseInt(clientSession['packets-in']) || 0,
            packetsOut: parseInt(clientSession['packets-out']) || 0,
            currentDownMbps: (parseInt(clientSession['rx-bits-per-second']) || 0) / 1000000,
            currentUpMbps: (parseInt(clientSession['tx-bits-per-second']) || 0) / 1000000
          };

          // Realizar ping para verificar latencia
          try {
            const pingResult = await mikrotikService.executeAction(
              router.ipAddress,
              router.apiPort,
              router.username,
              this._decryptPassword(router.passwordEncrypted),
              'ping',
              { 
                address: clientSession.address,
                count: 4
              }
            );

            if (pingResult && pingResult.length > 0) {
              const validPings = pingResult.filter(p => p.status === 'success');
              if (validPings.length > 0) {
                const avgTime = validPings.reduce((sum, p) => sum + parseFloat(p.time), 0) / validPings.length;
                const packetLoss = ((4 - validPings.length) / 4) * 100;
                
                connectivity.quality = {
                  latency: parseFloat(avgTime.toFixed(2)),
                  packetLoss: parseFloat(packetLoss.toFixed(2)),
                  pingCount: 4,
                  successCount: validPings.length
                };
              }
            }
          } catch (error) {
            logger.warn(`Error ejecutando ping para cliente ${clientId}: ${error.message}`);
          }

        } else {
          connectivity.connection.status = 'offline';
        }

      } catch (error) {
        logger.warn(`Error verificando sesión PPPoE para cliente ${clientId}: ${error.message}`);
        connectivity.connection.status = 'error';
      }

      return {
        success: true,
        data: connectivity,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Error verificando conectividad del cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new MikrotikEnhancedService();