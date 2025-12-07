// services/client.mikrotik.service.js - Integración de clientes con Mikrotik usando IDs
const db = require('../models');
const logger = require('../utils/logger');
const mikrotikService = require('./mikrotik.service');

// Modelos necesarios
const Client = db.Client;
const MikrotikPPPOE = db.MikrotikPPPOE;
const MikrotikRouter = db.MikrotikRouter;
const MikrotikProfile = db.MikrotikProfile;
const IpPool = db.IpPool;
const ServicePackage = db.ServicePackage;
const ClientBilling = db.ClientBilling;

class ClientMikrotikService {
  
  /**
   * Crear un usuario PPPoE para un cliente
   * @param {number} clientId - ID del cliente
   * @param {number} deviceId - ID del dispositivo/router Mikrotik
   * @param {Object} pppoeData - Datos del usuario PPPoE
   * @returns {Promise<Object>} Usuario PPPoE creado
   */
  async createClientPPPoE(clientId, deviceId, pppoeData) {
    const transaction = await db.sequelize.transaction();
    
    try {
    // ✅ VALIDAR CONTRASEÑA AL INICIO
    if (!pppoeData.password) {
      throw new Error('Se requiere password para crear un usuario PPPoE');
    }

    logger.info(`Creando usuario PPPoE para cliente ${clientId} en dispositivo ${deviceId}`);
    

      // Validar cliente
      const client = await Client.findByPk(clientId, {
        include: [{ model: ClientBilling, as: 'clientBilling',  include: [{ model: ServicePackage, as: 'ServicePackage'  }] }],
        transaction
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // Validar router/dispositivo Mikrotik
      const router = await MikrotikRouter.findOne({
        where: { deviceId: deviceId },
        transaction
      });

      if (!router) {
        throw new Error(`Router Mikrotik para dispositivo ${deviceId} no encontrado`);
      }

      // Verificar que el cliente no tenga ya un usuario PPPoE en este router
      const existingUser = await MikrotikPPPOE.findOne({
        where: { 
          clientId: clientId,
          mikrotikRouterId: router.id
        },
        transaction
      });

      if (existingUser) {
        throw new Error(`Cliente ${clientId} ya tiene un usuario PPPoE en el router ${router.name}`);
      }

      // ✅ MEJORA: Obtener perfil usando profileId si se especifica, sino usar el del paquete
      let profileId = null;
      let currentProfileName = null;
      let poolId = null;
      let currentPoolName = null;

      if (pppoeData.profileId) {
        // Perfil específico proporcionado por ID
        profileId = pppoeData.profileId;
        currentProfileName = pppoeData.profileName || null;
      } else if (pppoeData.profileName) {
        // Solo se proporcionó el nombre, obtener el ID desde Mikrotik
        const profiles = await mikrotikService.getPPPoEProfiles(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted)
        );
        
        const profile = profiles.find(p => p.name === pppoeData.profileName);
        if (profile) {
          profileId = profile.id;
          currentProfileName = profile.name;
        } else {
          throw new Error(`Perfil ${pppoeData.profileName} no encontrado en el router`);
        }
      } else if (client.billing?.ServicePackage) {
        // Usar perfil del paquete de servicio
        const servicePackageProfile = await MikrotikProfile.findOne({
          where: {
            mikrotikRouterId: router.id,
            servicePackageId: client.ClientBilling.ServicePackage.id,
            active: true
          },
          transaction
        });

        if (servicePackageProfile) {
          profileId = servicePackageProfile.profileId;
          currentProfileName = servicePackageProfile.profileName;
        } else {
          throw new Error(`No se encontró perfil configurado para el paquete ${client.ClientBilling.ServicePackage.name} en el router ${router.name}`);
        }
      } else {
        throw new Error('No se especificó perfil y el cliente no tiene paquete de servicio asignado');
      }

      // ✅ MEJORA: Manejar pool usando poolId si se especifica
      if (pppoeData.poolId) {
        poolId = pppoeData.poolId;
        currentPoolName = pppoeData.poolName || null;
      } else if (pppoeData.poolName) {
        // Solo se proporcionó el nombre del pool, obtener el ID
        const pools = await mikrotikService.getIPPools(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted)
        );
        
        const pool = pools.find(p => p.name === pppoeData.poolName);
        if (pool) {
          poolId = pool.id;
          currentPoolName = pool.name;
        }
      }

      // Generar username único si no se proporciona
      const username = pppoeData.username || this._generateUsername(client);

      // Crear usuario en Mikrotik usando IDs
      const mikrotikUserData = {
        name: username,
        password: pppoeData.password,
        profile: currentProfileName, // Mikrotik aún usa nombres para crear
        profileId: profileId, // Para referencia interna
        service: 'pppoe'
      };

      // Si hay pool, agregarlo
      if (poolId && currentPoolName) {
        mikrotikUserData.remoteAddress = currentPoolName; // Mikrotik usa nombres para pools también
        mikrotikUserData.poolId = poolId; // Para referencia interna
      }

      // Opcional: IP estática específica
      if (pppoeData.staticIp) {
        mikrotikUserData.remoteAddress = pppoeData.staticIp;
      }

      // Crear usuario en Mikrotik
      const createdUser = await mikrotikService.createPPPoEUser(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        mikrotikUserData
      );

      if (!createdUser || (!createdUser.id && !createdUser.mikrotikUserId)) {
        throw new Error('Error creando usuario en Mikrotik - no se obtuvo ID válido');
      }

      // ✅ CREAR REGISTRO EN BD CON IDS INMUTABLES
      const pppoeUser = await MikrotikPPPOE.create({
        mikrotikRouterId: router.id,
        clientId: clientId,
        subscriptionId: client.ClientBilling?.id || null,
        username: username,
        passwordEncrypted: this._encryptPassword(pppoeData.password),
        
        // ✅ CAMPOS CON IDS INMUTABLES
        profileId: profileId,
        currentProfileName: currentProfileName,
        poolId: poolId,
        currentPoolName: currentPoolName,
        
        staticIp: pppoeData.staticIp || null,
        mikrotikUserId: createdUser.mikrotikUserId || createdUser.id, // ID del usuario en RouterOS
        status: 'active',
        lastSyncWithMikrotik: new Date()
      }, { transaction });

      // ✅ ASIGNAR IP AUTOMÁTICAMENTE SI NO ES ESTÁTICA
      let assignedIpInfo = null;
      if (!pppoeData.staticIp && poolId) {
        try {
          assignedIpInfo = await this._assignNextAvailableIP(router, poolId, pppoeUser, transaction);
          logger.info(`IP ${assignedIpInfo.ipAddress} asignada automáticamente al usuario ${username}`);
        } catch (ipError) {
          logger.warn(`No se pudo asignar IP automáticamente: ${ipError.message}`);
        }
      }

      await transaction.commit();

      logger.info(`Usuario PPPoE ${username} creado exitosamente para cliente ${clientId}`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          pppoeUser: {
            id: pppoeUser.id,
            username: pppoeUser.username,
            profileId: pppoeUser.profileId,
            profileName: pppoeUser.currentProfileName,
            poolId: pppoeUser.poolId,
            poolName: pppoeUser.currentPoolName,
            staticIp: pppoeUser.staticIp,
            mikrotikUserId: pppoeUser.mikrotikUserId,
            status: pppoeUser.status
          },
          assignedIP: assignedIpInfo ? {
            ipAddress: assignedIpInfo.ipAddress,
            poolName: assignedIpInfo.poolName,
            assignmentType: pppoeData.staticIp ? 'static' : 'automatic'
          } : null,
          router: {
            id: router.id,
            name: router.name,
            ipAddress: router.ipAddress
          }
        },
        message: `Usuario PPPoE ${username} creado exitosamente${assignedIpInfo ? ` con IP ${assignedIpInfo.ipAddress}` : ''}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando usuario PPPoE para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar un usuario PPPoE de un cliente
   * @param {number} clientId - ID del cliente
   * @param {Object} pppoeData - Datos a actualizar
   * @returns {Promise<Object>} Usuario PPPoE actualizado
   */
  async updateClientPPPoE(clientId, pppoeData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Actualizando usuario PPPoE para cliente ${clientId}`);

      // Obtener usuario PPPoE existente
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ],
        transaction
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;
      const updateData = {};
      const mikrotikUpdateData = {};

      // ✅ MANEJAR ACTUALIZACIÓN DE PERFIL USANDO IDS
      if (pppoeData.profileId) {
        // Actualizar por ID de perfil
        updateData.profileId = pppoeData.profileId;
        
        // Si se proporciona el nombre también, actualizarlo
        if (pppoeData.profileName) {
          updateData.currentProfileName = pppoeData.profileName;
          mikrotikUpdateData.profile = pppoeData.profileName;
        } else {
          // Obtener el nombre actual del perfil desde Mikrotik
          const profiles = await mikrotikService.getPPPoEProfiles(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );
          
          const profile = profiles.find(p => p.id === pppoeData.profileId);
          if (profile) {
            updateData.currentProfileName = profile.name;
            mikrotikUpdateData.profile = profile.name;
          } else {
            throw new Error(`Perfil con ID ${pppoeData.profileId} no encontrado en el router`);
          }
        }
      } else if (pppoeData.profileName) {
        // Solo se proporcionó el nombre, mantener el ID actual pero actualizar nombre
        updateData.currentProfileName = pppoeData.profileName;
        mikrotikUpdateData.profile = pppoeData.profileName;
      }

      // ✅ MANEJAR ACTUALIZACIÓN DE POOL USANDO IDS
      if (pppoeData.poolId) {
        updateData.poolId = pppoeData.poolId;
        
        if (pppoeData.poolName) {
          updateData.currentPoolName = pppoeData.poolName;
          mikrotikUpdateData.remoteAddress = pppoeData.poolName;
        } else {
          // Obtener el nombre actual del pool desde Mikrotik
          const pools = await mikrotikService.getIPPools(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );
          
          const pool = pools.find(p => p.id === pppoeData.poolId);
          if (pool) {
            updateData.currentPoolName = pool.name;
            mikrotikUpdateData.remoteAddress = pool.name;
          }
        }

        // ✅ SI CAMBIÓ EL POOL, REASIGNAR IP
        if (updateData.poolId !== pppoeUser.poolId) {
          await this._moveUserToNewPool(pppoeUser, updateData.poolId, updateData.currentPoolName, transaction);
        }

      } else if (pppoeData.poolName) {
        updateData.currentPoolName = pppoeData.poolName;
        mikrotikUpdateData.remoteAddress = pppoeData.poolName;
      }

      // Otros campos actualizables
      if (pppoeData.password) {
        updateData.passwordEncrypted = this._encryptPassword(pppoeData.password);
        mikrotikUpdateData.password = pppoeData.password;
      }

      if (pppoeData.staticIp !== undefined) {
        updateData.staticIp = pppoeData.staticIp;
        mikrotikUpdateData.remoteAddress = pppoeData.staticIp || updateData.currentPoolName;
      }

      if (pppoeData.disabled !== undefined) {
        updateData.status = pppoeData.disabled ? 'disabled' : 'active';
        mikrotikUpdateData.disabled = pppoeData.disabled;
      }

      // Actualizar en Mikrotik si hay cambios
      if (Object.keys(mikrotikUpdateData).length > 0) {
        await mikrotikService.updatePPPoEUser(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted),
          pppoeUser.mikrotikUserId,
          mikrotikUpdateData
        );
      }

      // Actualizar en base de datos
      if (Object.keys(updateData).length > 0) {
        updateData.lastSyncWithMikrotik = new Date();
        await pppoeUser.update(updateData, { transaction });
      }

      await transaction.commit();

      // Recargar usuario con datos actualizados
      await pppoeUser.reload();

      logger.info(`Usuario PPPoE ${pppoeUser.username} actualizado exitosamente`);

      return {
        success: true,
        data: {
          clientId: clientId,
          pppoeUser: {
            id: pppoeUser.id,
            username: pppoeUser.username,
            profileId: pppoeUser.profileId,
            profileName: pppoeUser.currentProfileName,
            poolId: pppoeUser.poolId,
            poolName: pppoeUser.currentPoolName,
            staticIp: pppoeUser.staticIp,
            status: pppoeUser.status,
            lastSync: pppoeUser.lastSyncWithMikrotik
          },
          updatedFields: Object.keys(updateData)
        },
        message: 'Usuario PPPoE actualizado exitosamente'
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error actualizando usuario PPPoE para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar un usuario PPPoE de un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteClientPPPoE(clientId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Eliminando usuario PPPoE para cliente ${clientId}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ],
        transaction
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;
      const username = pppoeUser.username;

      // ✅ LIBERAR IP ASIGNADA ANTES DE ELIMINAR USUARIO
      await this._releaseUserIP(pppoeUser, transaction);


      // Eliminar de Mikrotik
      await mikrotikService.deletePPPoEUser(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        pppoeUser.mikrotikUserId
      );

      // Eliminar de base de datos
      await pppoeUser.destroy({ transaction });

      await transaction.commit();

      logger.info(`Usuario PPPoE ${username} eliminado exitosamente`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          deletedUsername: username
        },
        message: `Usuario PPPoE ${username} eliminado exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error eliminando usuario PPPoE para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configurar límites de ancho de banda para un cliente
   * @param {number} clientId - ID del cliente
   * @param {Object} qosData - Configuración de QoS
   * @returns {Promise<Object>} Resultado de la configuración
   */
  async setClientBandwidthLimits(clientId, qosData) {
    try {
      logger.info(`Configurando límites de ancho de banda para cliente ${clientId}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;

      // ✅ ACTUALIZAR PERFIL USANDO PROFILEID
      let profileToUpdate = null;

      if (qosData.useExistingProfile && pppoeUser.profileId) {
        // Actualizar el perfil existente del usuario
        const profiles = await mikrotikService.getPPPoEProfiles(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted)
        );

        profileToUpdate = profiles.find(p => p.id === pppoeUser.profileId);
        
        if (!profileToUpdate) {
          throw new Error(`Perfil con ID ${pppoeUser.profileId} no encontrado en el router`);
        }
      } else {
        // Crear nuevo perfil personalizado
        const profileName = `${pppoeUser.username}-custom`;
        
        const newProfileData = {
          name: profileName,
          'rate-limit': `${qosData.downloadSpeed}M/${qosData.uploadSpeed}M`,
          'burst-limit': qosData.burstLimit || this._calculateBurstLimit(qosData.downloadSpeed, qosData.uploadSpeed),
          'burst-threshold': qosData.burstThreshold || this._calculateBurstThreshold(qosData.downloadSpeed, qosData.uploadSpeed),
          'burst-time': qosData.burstTime || '8s/8s',
          priority: qosData.priority || '8'
        };

        // Crear perfil personalizado en Mikrotik
        await mikrotikService.createPPPoEProfile(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted),
          newProfileData
        );

        // Actualizar usuario para usar el nuevo perfil
        await mikrotikService.updatePPPoEUser(
          router.ipAddress,
          router.apiPort,
          router.username,
          this._decryptPassword(router.passwordEncrypted),
          pppoeUser.mikrotikUserId,
          { profile: profileName }
        );

        // Actualizar base de datos con el nuevo perfil
        await pppoeUser.update({
          currentProfileName: profileName,
          lastSyncWithMikrotik: new Date()
        });

        profileToUpdate = { name: profileName, id: null }; // Perfil personalizado
      }

      logger.info(`Límites de ancho de banda configurados para cliente ${clientId}: ${qosData.downloadSpeed}M/${qosData.uploadSpeed}M`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          profileUsed: profileToUpdate.name,
          profileId: pppoeUser.profileId,
          bandwidthLimits: {
            download: `${qosData.downloadSpeed}M`,
            upload: `${qosData.uploadSpeed}M`,
            burstEnabled: qosData.burstLimit ? true : false
          }
        },
        message: `Límites de ancho de banda configurados exitosamente`
      };

    } catch (error) {
      logger.error(`Error configurando límites de ancho de banda para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de tráfico para un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Estadísticas de tráfico
   */
  async getClientTrafficStats(clientId) {
    try {
      logger.info(`Obteniendo estadísticas de tráfico para cliente ${clientId}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;

      // Obtener sesión activa del usuario
      const activeSessions = await mikrotikService.getActivePPPoESessions(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      const userSession = activeSessions.find(session => session.name === pppoeUser.username);

      let trafficStats = {
        isOnline: !!userSession,
        username: pppoeUser.username,
        profileId: pppoeUser.profileId,
        profileName: pppoeUser.currentProfileName,
        poolId: pppoeUser.poolId,
        poolName: pppoeUser.currentPoolName,
        staticIp: pppoeUser.staticIp
      };

      if (userSession) {
        trafficStats = {
          ...trafficStats,
          sessionInfo: {
            address: userSession.address,
            uptime: userSession.uptime,
            callerId: userSession.callerId,
            encoding: userSession.encoding
          },
          lastConnected: pppoeUser.lastConnected,
          bytesIn: pppoeUser.bytesIn,
          bytesOut: pppoeUser.bytesOut
        };
      } else {
        trafficStats = {
          ...trafficStats,
          sessionInfo: null,
          lastDisconnected: pppoeUser.lastDisconnected,
          lastConnected: pppoeUser.lastConnected
        };
      }

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          trafficStats: trafficStats
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas de tráfico para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reiniciar la sesión PPPoE de un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Resultado del reinicio
   */
  async restartClientPPPoESession(clientId) {
    try {
      logger.info(`Reiniciando sesión PPPoE para cliente ${clientId}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;

      // Obtener sesión activa
      const activeSessions = await mikrotikService.getActivePPPoESessions(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      const userSession = activeSessions.find(session => session.name === pppoeUser.username);

      if (!userSession) {
        return {
          success: false,
          message: `Cliente ${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName} no tiene sesión activa`
        };
      }

      // Reiniciar sesión
      await mikrotikService.restartPPPoESession(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        userSession.id
      );

      logger.info(`Sesión PPPoE reiniciada para cliente ${clientId}`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          username: pppoeUser.username,
          sessionId: userSession.id
        },
        message: 'Sesión PPPoE reiniciada exitosamente'
      };

    } catch (error) {
      logger.error(`Error reiniciando sesión PPPoE para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar todos los clientes con Mikrotik
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAllClientsWithMikrotik() {
    try {
      logger.info('Iniciando sincronización de todos los clientes con Mikrotik');

      const routers = await MikrotikRouter.findAll({ where: { active: true } });
      
      let syncResults = {
        success: true,
        routersProcessed: 0,
        usersUpdated: 0,
        usersCreated: 0,
        profilesUpdated: 0,
        poolsUpdated: 0,
        errors: []
      };

      for (const router of routers) {
        try {
          logger.info(`Sincronizando router ${router.name}`);

          // ✅ SINCRONIZAR PERFILES - ACTUALIZAR NOMBRES BASADOS EN IDS
          const profiles = await mikrotikService.getPPPoEProfiles(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );

          // Actualizar nombres de perfiles en BD si cambiaron
          for (const profile of profiles) {
            const dbProfile = await MikrotikProfile.findOne({
              where: {
                mikrotikRouterId: router.id,
                profileId: profile.id
              }
            });

            if (dbProfile && dbProfile.profileName !== profile.name) {
              await dbProfile.update({
                profileName: profile.name,
                lastSync: new Date()
              });
              syncResults.profilesUpdated++;
              logger.info(`Perfil ${profile.id} actualizado: ${dbProfile.profileName} → ${profile.name}`);
            }
          }

          // ✅ SINCRONIZAR POOLS - ACTUALIZAR NOMBRES BASADOS EN IDS
          const pools = await mikrotikService.getIPPools(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );

          for (const pool of pools) {
            const dbPool = await IpPool.findOne({
              where: {
                mikrotikRouterId: router.id,
                poolId: pool.id
              }
            });

            if (dbPool && dbPool.poolName !== pool.name) {
              await dbPool.update({
                poolName: pool.name,
                lastSyncWithMikrotik: new Date()
              });
              syncResults.poolsUpdated++;
              logger.info(`Pool ${pool.id} actualizado: ${dbPool.poolName} → ${pool.name}`);
            }
          }

          // ✅ SINCRONIZAR USUARIOS PPPOE
          const pppoeUsers = await mikrotikService.getPPPoEUsers(
            router.ipAddress,
            router.apiPort,
            router.username,
            this._decryptPassword(router.passwordEncrypted)
          );

          const dbUsers = await MikrotikPPPOE.findAll({
            where: { mikrotikRouterId: router.id }
          });

          // Actualizar usuarios existentes basándose en mikrotikUserId
          for (const dbUser of dbUsers) {
            const mikrotikUser = pppoeUsers.find(u => u.id === dbUser.mikrotikUserId);
            
            if (mikrotikUser) {
              // Usuario existe en ambos lados, verificar cambios
              let needsUpdate = false;
              const updateData = {};

              // Verificar cambios en perfil
              if (mikrotikUser.profile !== dbUser.currentProfileName) {
                // El perfil cambió en Mikrotik, actualizar nombre pero mantener ID
                updateData.currentProfileName = mikrotikUser.profile;
                needsUpdate = true;
              }

              // Verificar otros cambios
              if (mikrotikUser.disabled !== (dbUser.status === 'disabled')) {
                updateData.status = mikrotikUser.disabled ? 'disabled' : 'active';
                needsUpdate = true;
              }

              if (needsUpdate) {
                updateData.lastSyncWithMikrotik = new Date();
                await dbUser.update(updateData);
                syncResults.usersUpdated++;
                logger.info(`Usuario ${dbUser.username} sincronizado`);
              }
            } else {
              // Usuario existe en BD pero no en Mikrotik
              logger.warn(`Usuario ${dbUser.username} existe en BD pero no en Mikrotik`);
            }
          }

          syncResults.routersProcessed++;

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

      logger.info(`Sincronización completada: ${syncResults.usersUpdated} usuarios actualizados, ${syncResults.profilesUpdated} perfiles actualizados, ${syncResults.poolsUpdated} pools actualizados`);

      return {
        success: syncResults.success,
        data: syncResults,
        message: `Sincronización ${syncResults.success ? 'exitosa' : 'completada con errores'}`
      };

    } catch (error) {
      logger.error(`Error en sincronización general: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cambiar plan de servicio de un cliente (actualiza perfil automáticamente)
   * @param {number} clientId - ID del cliente
   * @param {number} newServicePackageId - ID del nuevo paquete de servicio
   * @returns {Promise<Object>} Resultado del cambio de plan
   */
  async changeClientServicePlan(clientId, newServicePackageId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Cambiando plan de servicio para cliente ${clientId} a paquete ${newServicePackageId}`);

      // Obtener usuario PPPoE del cliente
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ],
        transaction
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      // Validar nuevo paquete de servicio
      const newPackage = await ServicePackage.findByPk(newServicePackageId, { transaction });
      if (!newPackage) {
        throw new Error(`Paquete de servicio ${newServicePackageId} no encontrado`);
      }

      // Buscar perfil Mikrotik para el nuevo paquete
      const newProfile = await MikrotikProfile.findOne({
        where: {
          mikrotikRouterId: pppoeUser.mikrotikRouterId,
          servicePackageId: newServicePackageId,
          active: true
        },
        transaction
      });

      if (!newProfile) {
        throw new Error(`No hay perfil configurado para el paquete ${newPackage.name} en el router`);
      }

      // Actualizar usuario en Mikrotik con el nuevo perfil
      await mikrotikService.updatePPPoEUser(
        pppoeUser.MikrotikRouter.ipAddress,
        pppoeUser.MikrotikRouter.apiPort,
        pppoeUser.MikrotikRouter.username,
        this._decryptPassword(pppoeUser.MikrotikRouter.passwordEncrypted),
        pppoeUser.mikrotikUserId,
        { profile: newProfile.profileName }
      );

      // Actualizar usuario en BD con el nuevo perfil
      await pppoeUser.update({
        profileId: newProfile.profileId,
        currentProfileName: newProfile.profileName,
        lastSyncWithMikrotik: new Date()
      }, { transaction });

      // Actualizar facturación del cliente
      await ClientBilling.update({
        servicePackageId: newServicePackageId,
        monthlyFee: newPackage.price
      }, {
        where: { clientId: clientId },
        transaction
      });

      await transaction.commit();

      logger.info(`Plan de servicio cambiado exitosamente para cliente ${clientId}`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          newPlan: {
            packageId: newPackage.id,
            name: newPackage.name,
            price: newPackage.price,
            downloadSpeed: newPackage.downloadSpeedMbps,
            uploadSpeed: newPackage.uploadSpeedMbps
          },
          newProfile: {
            profileId: newProfile.profileId,
            profileName: newProfile.profileName,
            rateLimit: newProfile.rateLimit
          }
        },
        message: `Plan de servicio actualizado a ${newPackage.name}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error cambiando plan de servicio para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mover cliente entre pools (para gestión de cortes/suspensiones)
   * @param {number} clientId - ID del cliente
   * @param {string} targetPoolType - Tipo de pool destino ('active', 'suspended', 'cutService')
   * @returns {Promise<Object>} Resultado del movimiento
   */
  async moveClientToPool(clientId, targetPoolType) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Moviendo cliente ${clientId} a pool tipo ${targetPoolType}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ],
        transaction
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      // Buscar pool destino del tipo requerido
      const targetPool = await IpPool.findOne({
        where: {
          mikrotikRouterId: pppoeUser.mikrotikRouterId,
          poolType: targetPoolType,
          active: true
        },
        transaction
      });

      if (!targetPool) {
        throw new Error(`No hay pool de tipo ${targetPoolType} disponible en el router`);
      }

      // Actualizar usuario en Mikrotik con el nuevo pool
      await mikrotikService.updatePPPoEUser(
        pppoeUser.MikrotikRouter.ipAddress,
        pppoeUser.MikrotikRouter.apiPort,
        pppoeUser.MikrotikRouter.username,
        this._decryptPassword(pppoeUser.MikrotikRouter.passwordEncrypted),
        pppoeUser.mikrotikUserId,
        { remoteAddress: targetPool.poolName }
      );


      // ✅ REASIGNAR IP AL NUEVO POOL
      await this._moveUserToNewPool(pppoeUser, targetPool.poolId, targetPool.poolName, transaction);


      // Actualizar usuario en BD
      await pppoeUser.update({
        poolId: targetPool.poolId,
        currentPoolName: targetPool.poolName,
        lastSyncWithMikrotik: new Date()
      }, { transaction });

      await transaction.commit();

      logger.info(`Cliente ${clientId} movido exitosamente a pool ${targetPool.poolName}`);

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          movedTo: {
            poolId: targetPool.poolId,
            poolName: targetPool.poolName,
            poolType: targetPool.poolType
          }
        },
        message: `Cliente movido a pool ${targetPool.poolName}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error moviendo cliente ${clientId} a pool ${targetPoolType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener información completa del cliente en Mikrotik
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Información completa del cliente
   */
  async getClientMikrotikInfo(clientId) {
    try {
      logger.info(`Obteniendo información completa de Mikrotik para cliente ${clientId}`);

      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { 
            model: Client,
            include: [{ model: ClientBilling, include: [{ model: ServicePackage }] }]
          },
          { model: MikrotikRouter }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      const router = pppoeUser.MikrotikRouter;

      // Obtener información de perfiles disponibles
      const profiles = await mikrotikService.getPPPoEProfiles(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      // Obtener información de pools disponibles
      const pools = await mikrotikService.getIPPools(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      // Obtener sesión activa si existe
      const activeSessions = await mikrotikService.getActivePPPoESessions(
        router.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted)
      );

      const userSession = activeSessions.find(session => session.name === pppoeUser.username);

      // Buscar perfil actual
      const currentProfile = profiles.find(p => p.id === pppoeUser.profileId);

      // Buscar pool actual
      const currentPool = pools.find(p => p.id === pppoeUser.poolId);

      return {
        success: true,
        data: {
          client: {
            id: clientId,
            name: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
            servicePackage: pppoeUser.Client.billing?.ServicePackage?.name || 'Sin paquete'
          },
          pppoeUser: {
            id: pppoeUser.id,
            username: pppoeUser.username,
            status: pppoeUser.status,
            staticIp: pppoeUser.staticIp,
            mikrotikUserId: pppoeUser.mikrotikUserId,
            lastSync: pppoeUser.lastSyncWithMikrotik
          },
          currentProfile: {
            profileId: pppoeUser.profileId,
            profileName: pppoeUser.currentProfileName,
            mikrotikProfile: currentProfile || null
          },
          currentPool: {
            poolId: pppoeUser.poolId,
            poolName: pppoeUser.currentPoolName,
            mikrotikPool: currentPool || null
          },
          session: userSession || null,
          router: {
            id: router.id,
            name: router.name,
            ipAddress: router.ipAddress
          },
          availableProfiles: profiles.map(p => ({
            id: p.id,
            name: p.name,
            rateLimit: p.rateLimit
          })),
          availablePools: pools.map(p => ({
            id: p.id,
            name: p.name,
            ranges: p.ranges
          }))
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo información de Mikrotik para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Genera un username único para el cliente
   * @private
   */
  _generateUsername(client) {
    const firstName = client.firstName.toLowerCase().replace(/[^a-z]/g, '');
    const lastName = client.lastName.toLowerCase().replace(/[^a-z]/g, '');
    const clientId = client.id.toString().padStart(4, '0');
    
    return `${firstName.substring(0, 3)}${lastName.substring(0, 3)}${clientId}`;
  }

  /**
   * Encripta contraseña
   * @private
   */
  _encryptPassword(password) {
    // TODO: Implementar encriptación real
    return password;
  }

  /**
   * Desencripta contraseña del router
   * @private
   */
  _decryptPassword(encryptedPassword) {
    // TODO: Implementar desencriptación real
    return encryptedPassword;
  }

  /**
   * Calcula burst limit basado en velocidades
   * @private
   */
  _calculateBurstLimit(downloadMbps, uploadMbps) {
    const burstDown = Math.round(downloadMbps * 1.5);
    const burstUp = Math.round(uploadMbps * 1.5);
    return `${burstDown}M/${burstUp}M`;
  }

  /**
   * Calcula burst threshold basado en velocidades
   * @private
   */
  _calculateBurstThreshold(downloadMbps, uploadMbps) {
    const thresholdDown = Math.round(downloadMbps * 0.8);
    const thresholdUp = Math.round(uploadMbps * 0.8);
    return `${thresholdDown}M/${thresholdUp}M`;
  }
  /**
   * ✅ NUEVO: Asignar próxima IP disponible automáticamente
   * @private
   */
  async _assignNextAvailableIP(router, poolId, pppoeUser, transaction) {
    try {
      // Obtener IPs disponibles del pool usando poolId
      const poolData = await mikrotikService.getPoolAvailableIPs(
        router.device.ipAddress,
        router.apiPort,
        router.username,
        this._decryptPassword(router.passwordEncrypted),
        poolId
      );

      if (!poolData.success || !poolData.data.availableIPs.length) {
        throw new Error(`No hay IPs disponibles en el pool ${poolId}`);
      }

      const nextIP = poolData.data.summary.nextAvailableIP;
      if (!nextIP) {
        throw new Error(`No se pudo determinar próxima IP disponible`);
      }

      // Buscar el pool en la BD
      const pool = await db.IpPool.findOne({
        where: {
          mikrotikRouterId: router.id,
          poolId: poolId
        },
        transaction
      });

      if (!pool) {
        throw new Error(`Pool ${poolId} no encontrado en base de datos`);
      }

      // Crear/actualizar registro de IP
      const [ipRecord, created] = await db.MikrotikIp.findOrCreate({
        where: {
          ipPoolId: pool.id,
          ipAddress: nextIP
        },
        defaults: {
          clientId: pppoeUser.clientId,
          mikrotikPPPOEId: pppoeUser.id,
          status: 'assigned'
        },
        transaction
      });

      if (!created) {
        // IP ya existía, actualizarla
        await ipRecord.update({
          clientId: pppoeUser.clientId,
          mikrotikPPPOEId: pppoeUser.id,
          status: 'assigned'
        }, { transaction });
      }

      return {
        ipAddress: nextIP,
        poolName: pool.poolName,
        poolId: pool.poolId,
        ipRecordId: ipRecord.id
      };

    } catch (error) {
      logger.error(`Error asignando IP automática: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Liberar IP asignada a un usuario
   * @private
   */
  async _releaseUserIP(pppoeUser, transaction) {
    try {
      const assignedIP = await db.MikrotikIp.findOne({
        where: { mikrotikPPPOEId: pppoeUser.id },
        transaction
      });

      if (assignedIP) {
        await assignedIP.update({
          clientId: null,
          mikrotikPPPOEId: null,
          status: 'available'
        }, { transaction });

        logger.info(`IP ${assignedIP.ipAddress} liberada del usuario ${pppoeUser.username}`);
        return assignedIP.ipAddress;
      }

      return null;

    } catch (error) {
      logger.error(`Error liberando IP del usuario ${pppoeUser.username}: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Mover usuario a nuevo pool (liberar IP anterior y asignar nueva)
   * @private
   */
  async _moveUserToNewPool(pppoeUser, newPoolId, newPoolName, transaction) {
    try {
      // 1. Liberar IP del pool anterior
      const releasedIP = await this._releaseUserIP(pppoeUser, transaction);

      // 2. Asignar nueva IP del nuevo pool
      const router = await db.MikrotikRouter.findByPk(pppoeUser.mikrotikRouterId, {
        include: [{ model: db.Device, as: 'device' }],
        transaction
      });

      const newIPInfo = await this._assignNextAvailableIP(router, newPoolId, pppoeUser, transaction);

      logger.info(`Usuario ${pppoeUser.username} movido: ${releasedIP} → ${newIPInfo.ipAddress} (pool: ${newPoolName})`);

      return {
        releasedIP: releasedIP,
        newIP: newIPInfo.ipAddress,
        newPoolName: newPoolName
      };

    } catch (error) {
      logger.error(`Error moviendo usuario ${pppoeUser.username} a nuevo pool: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener información de IP del usuario
   */
  async getClientIPInfo(clientId) {
    try {
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: clientId },
        include: [
          { model: Client },
          { model: MikrotikRouter }
        ]
      });

      if (!pppoeUser) {
        throw new Error(`Cliente ${clientId} no tiene usuario PPPoE configurado`);
      }

      // Obtener IP asignada
      const assignedIP = await db.MikrotikIp.findOne({
        where: { mikrotikPPPOEId: pppoeUser.id },
        include: [{ model: db.IpPool }]
      });

      return {
        success: true,
        data: {
          clientId: clientId,
          clientName: `${pppoeUser.Client.firstName} ${pppoeUser.Client.lastName}`,
          username: pppoeUser.username,
          ipInfo: assignedIP ? {
            ipAddress: assignedIP.ipAddress,
            poolName: assignedIP.IpPool.poolName,
            poolType: assignedIP.IpPool.poolType,
            status: assignedIP.status,
            assignedSince: assignedIP.updatedAt
          } : null,
          staticIp: pppoeUser.staticIp
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo información de IP para cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ClientMikrotikService();