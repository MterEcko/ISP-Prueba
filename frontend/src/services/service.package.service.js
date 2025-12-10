// backend/src/services/service.package.service.js - CORREGIDO
const db = require('../models');
const mikrotikService  = require('./mikrotik.service');
const logger = require('../utils/logger');

class ServicePackageService {

  /**
   * Crear paquete de servicio y asociar perfiles Mikrotik usando IDs
   */
  async createServicePackageWithProfiles(packageData, profileConfigurations) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Creando paquete de servicio: ${packageData.name}`);

      // 1. Crear el paquete de servicio
      const servicePackage = await db.ServicePackage.create({
        name: packageData.name,
        description: packageData.description,
        price: packageData.price,
        downloadSpeedMbps: packageData.downloadSpeedMbps,
        uploadSpeedMbps: packageData.uploadSpeedMbps,
        dataLimitGb: packageData.dataLimitGb,
        billingCycle: packageData.billingCycle || 'monthly',
        zoneId: packageData.zoneId,
        active: packageData.active !== undefined ? packageData.active : true
      }, { transaction });

      // 2. Crear perfiles en los routers especificados
      const profileResults = [];
      
      for (const profileConfig of profileConfigurations) {
        try {
          const profileResult = await this.createProfileForPackage(
            servicePackage.id,
            profileConfig,
            transaction
          );
          profileResults.push(profileResult);
        } catch (profileError) {
          logger.error(`Error creando perfil en router ${profileConfig.mikrotikRouterId}: ${profileError.message}`);
          profileResults.push({
            mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
            status: 'error',
            error: profileError.message
          });
        }
      }

      await transaction.commit();

      return {
        success: true,
        data: {
          servicePackage: servicePackage,
          profileResults: profileResults,
          summary: {
            profilesCreated: profileResults.filter(r => r.status === 'created').length,
            profilesExisting: profileResults.filter(r => r.status === 'existing').length,
            profilesError: profileResults.filter(r => r.status === 'error').length
          }
        },
        message: `Paquete ${packageData.name} creado con ${profileResults.length} perfiles procesados`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando paquete de servicio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crear perfil Mikrotik para un paquete específico
   */
  async createProfileForPackage(servicePackageId, profileConfig, transaction) {
    try {
      // ✅ CORREGIDO: Usar mikrotikRouterId en lugar de routerId
      const mikrotikRouter = await db.MikrotikRouter.findByPk(profileConfig.mikrotikRouterId, {
        include: [{ model: db.Device, as: 'device' }],
        transaction
      });

      if (!mikrotikRouter) {
        throw new Error(`Router Mikrotik ${profileConfig.mikrotikRouterId} no encontrado`);
      }

      // Verificar si ya existe perfil para este paquete en este router
      const existingProfile = await db.MikrotikProfile.findOne({
        where: {
          servicePackageId: servicePackageId,
          mikrotikRouterId: profileConfig.mikrotikRouterId // ✅ CORREGIDO
        },
        transaction
      });

      if (existingProfile) {
        return {
          mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
          routerName: mikrotikRouter.name,
          profileId: existingProfile.profileId,
          profileName: existingProfile.profileName,
          status: 'existing'
        };
      }

      // ✅ NUEVO: Si useExistingProfile es true, solo crear la asociación en BD sin crear en RouterOS
      if (profileConfig.useExistingProfile) {
        // Guardar asociación en BD usando el perfil existente
        const dbProfile = await db.MikrotikProfile.create({
          servicePackageId: servicePackageId,
          mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
          profileId: profileConfig.profileId, // ID del perfil existente (ej: "*1")
          profileName: profileConfig.profileName, // Nombre del perfil existente (ej: "10MB")
          rateLimit: profileConfig.rateLimit, // Rate limit del perfil existente
          burstLimit: profileConfig.burstLimit || null,
          burstThreshold: profileConfig.burstThreshold || null,
          burstTime: profileConfig.burstTime || null,
          priority: profileConfig.priority || null,
          active: true,
          lastSync: new Date()
        }, { transaction });

        logger.info(`Asociación creada: Paquete ${servicePackageId} → Perfil ${profileConfig.profileId} en Router ${profileConfig.mikrotikRouterId}`);

        return {
          mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
          routerName: mikrotikRouter.name,
          profileId: profileConfig.profileId,
          profileName: profileConfig.profileName,
          rateLimit: profileConfig.rateLimit,
          dbProfileId: dbProfile.id,
          status: 'associated' // ✅ NUEVO: Indicar que es una asociación, no creación
        };
      }

      // ✅ CÓDIGO ORIGINAL: Crear perfil nuevo en RouterOS (solo si useExistingProfile = false)
      const profileData = {
        name: profileConfig.profileName,
        'rate-limit': profileConfig.rateLimit,
        'burst-limit': profileConfig.burstLimit || this._calculateBurstLimit(profileConfig.rateLimit),
        'burst-threshold': profileConfig.burstThreshold || this._calculateBurstThreshold(profileConfig.rateLimit),
        'burst-time': profileConfig.burstTime || '8s/8s',
        priority: profileConfig.priority || '8'
      };

      const createdProfile = await mikrotikService.createPPPoEProfile(
        mikrotikRouter.device.ipAddress,
        mikrotikRouter.apiPort,
        mikrotikRouter.username,
        mikrotikRouter.passwordEncrypted,
        profileData
      );

      if (!createdProfile || !createdProfile.id) {
        throw new Error('Error creando perfil en RouterOS - no se obtuvo ID');
      }

      // Guardar perfil en BD con ID inmutable de RouterOS
      const dbProfile = await db.MikrotikProfile.create({
        servicePackageId: servicePackageId,
        mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
        profileId: createdProfile.id, // ✅ ID INMUTABLE de RouterOS
        profileName: profileConfig.profileName, // Nombre actual
        rateLimit: profileConfig.rateLimit,
        burstLimit: profileConfig.burstLimit,
        burstThreshold: profileConfig.burstThreshold,
        burstTime: profileConfig.burstTime || '8s/8s',
        priority: profileConfig.priority || '8',
        active: true,
        lastSync: new Date()
      }, { transaction });

      return {
        mikrotikRouterId: profileConfig.mikrotikRouterId, // ✅ CORREGIDO
        routerName: mikrotikRouter.name,
        profileId: createdProfile.id,
        profileName: profileConfig.profileName,
        rateLimit: profileConfig.rateLimit,
        dbProfileId: dbProfile.id,
        status: 'created'
      };

    } catch (error) {
      logger.error(`Error creando perfil para router ${profileConfig.mikrotikRouterId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener perfiles Mikrotik asociados a un paquete usando IDs
   */
  async getPackageProfilesWithMikrotikData(servicePackageId) {
    try {
      // Obtener perfiles de la BD
      const dbProfiles = await db.MikrotikProfile.findAll({
        where: { servicePackageId: servicePackageId },
        include: [
          {
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          },
          { model: db.ServicePackage }
        ]
      });

      if (!dbProfiles.length) {
        return {
          success: true,
          data: [],
          message: 'No hay perfiles asociados a este paquete'
        };
      }

      // Obtener datos actuales desde RouterOS para cada perfil
      const profilesWithCurrentData = [];
      
      for (const dbProfile of dbProfiles) {
        try {
          const router = dbProfile.MikrotikRouter;
          
          // Obtener perfiles actuales desde RouterOS usando el servicio corregido
          const rosProfiles = await mikrotikService.getPPPoEProfiles(
            router.device.ipAddress,
            router.apiPort,
            router.username,
            router.passwordEncrypted
          );

          // Buscar el perfil actual usando profileId (ID inmutable)
          const currentProfile = rosProfiles.find(p => p.id === dbProfile.profileId);

          profilesWithCurrentData.push({
            dbProfile: {
              id: dbProfile.id,
              servicePackageId: dbProfile.servicePackageId,
              profileId: dbProfile.profileId, // ID inmutable
              profileName: dbProfile.profileName, // Nombre guardado en BD
              rateLimit: dbProfile.rateLimit,
              lastSync: dbProfile.lastSync,
              active: dbProfile.active
            },
            currentMikrotikProfile: currentProfile ? {
              id: currentProfile.id,
              name: currentProfile.name, // Nombre actual en RouterOS
              rateLimit: currentProfile.rateLimit,
              localAddress: currentProfile.localAddress,
              remoteAddress: currentProfile.remoteAddress
            } : null,
            router: {
              id: router.id,
              name: router.name,
              ipAddress: router.device.ipAddress
            },
            syncStatus: {
              exists: !!currentProfile,
              nameChanged: currentProfile ? currentProfile.name !== dbProfile.profileName : false,
              rateChanged: currentProfile ? currentProfile.rateLimit !== dbProfile.rateLimit : false
            }
          });

        } catch (routerError) {
          logger.error(`Error obteniendo datos del router ${dbProfile.MikrotikRouter.name}: ${routerError.message}`);
          
          profilesWithCurrentData.push({
            dbProfile: {
              id: dbProfile.id,
              profileId: dbProfile.profileId,
              profileName: dbProfile.profileName,
              rateLimit: dbProfile.rateLimit
            },
            currentMikrotikProfile: null,
            router: {
              id: dbProfile.MikrotikRouter.id,
              name: dbProfile.MikrotikRouter.name,
              ipAddress: dbProfile.MikrotikRouter.device.ipAddress
            },
            syncStatus: {
              exists: false,
              error: routerError.message
            }
          });
        }
      }

      return {
        success: true,
        data: profilesWithCurrentData,
        message: `${profilesWithCurrentData.length} perfiles obtenidos`
      };

    } catch (error) {
      logger.error(`Error obteniendo perfiles del paquete ${servicePackageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronizar perfiles de un paquete con RouterOS
   */
  async syncPackageProfiles(servicePackageId) {
    try {
      logger.info(`Sincronizando perfiles del paquete ${servicePackageId}`);

      const dbProfiles = await db.MikrotikProfile.findAll({
        where: { servicePackageId: servicePackageId },
        include: [
          {
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          }
        ]
      });

      const syncResults = [];

      for (const dbProfile of dbProfiles) {
        try {
          const router = dbProfile.MikrotikRouter;
          
          // Obtener perfiles actuales desde RouterOS
          const rosProfiles = await mikrotikService.getPPPoEProfiles(
            router.device.ipAddress,
            router.apiPort,
            router.username,
            router.passwordEncrypted
          );

          // Buscar perfil usando profileId (ID inmutable)
          const currentProfile = rosProfiles.find(p => p.id === dbProfile.profileId);

          if (currentProfile) {
            // Verificar si cambió el nombre o configuración
            const changes = [];
            const updateData = { lastSync: new Date() };

            if (currentProfile.name !== dbProfile.profileName) {
              changes.push('name');
              updateData.profileName = currentProfile.name;
            }

            if (currentProfile.rateLimit !== dbProfile.rateLimit) {
              changes.push('rateLimit');
              updateData.rateLimit = currentProfile.rateLimit;
            }

            if (changes.length > 0) {
              await dbProfile.update(updateData);
              
              syncResults.push({
                router: router.name,
                profileId: dbProfile.profileId,
                status: 'updated',
                changes: changes,
                oldName: dbProfile.profileName,
                newName: currentProfile.name
              });
            } else {
              await dbProfile.update({ lastSync: new Date() });
              
              syncResults.push({
                router: router.name,
                profileId: dbProfile.profileId,
                status: 'verified',
                message: 'Sin cambios'
              });
            }
          } else {
            // Perfil no existe en RouterOS
            syncResults.push({
              router: router.name,
              profileId: dbProfile.profileId,
              status: 'missing_in_router',
              warning: 'Perfil existe en BD pero no en RouterOS'
            });
          }

        } catch (routerError) {
          syncResults.push({
            router: dbProfile.MikrotikRouter.name,
            profileId: dbProfile.profileId,
            status: 'error',
            error: routerError.message
          });
        }
      }

      return {
        success: true,
        data: syncResults,
        message: `${syncResults.length} perfiles sincronizados`
      };

    } catch (error) {
      logger.error(`Error sincronizando perfiles del paquete ${servicePackageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar perfil Mikrotik usando profileId
   */
  async updatePackageProfile(servicePackageId, mikrotikRouterId, profileUpdates) { // ✅ CORREGIDO: cambié routerId a mikrotikRouterId
    const transaction = await db.sequelize.transaction();
    
    try {
      // Buscar perfil en BD
      const dbProfile = await db.MikrotikProfile.findOne({
        where: {
          servicePackageId: servicePackageId,
          mikrotikRouterId: mikrotikRouterId // ✅ CORREGIDO
        },
        include: [
          {
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          }
        ],
        transaction
      });

      if (!dbProfile) {
        throw new Error(`No se encontró perfil para el paquete ${servicePackageId} en el router ${mikrotikRouterId}`); // ✅ CORREGIDO
      }

      const router = dbProfile.MikrotikRouter;

      // Actualizar perfil en RouterOS usando profileId
      await mikrotikService.updatePPPoEProfile(
        router.device.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted,
        dbProfile.profileId, // Usar ID inmutable
        profileUpdates
      );

      // Actualizar perfil en BD
      const updateData = {
        ...profileUpdates,
        lastSync: new Date()
      };

      await dbProfile.update(updateData, { transaction });

      await transaction.commit();

      return {
        success: true,
        data: {
          profileId: dbProfile.profileId,
          profileName: dbProfile.profileName,
          routerName: router.name,
          updatedFields: Object.keys(profileUpdates)
        },
        message: `Perfil ${dbProfile.profileName} actualizado exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error actualizando perfil: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar perfil de un paquete
   */
  async deletePackageProfile(servicePackageId, mikrotikRouterId) { // ✅ CORREGIDO: cambié routerId a mikrotikRouterId
    const transaction = await db.sequelize.transaction();
    
    try {
      // Buscar perfil en BD
      const dbProfile = await db.MikrotikProfile.findOne({
        where: {
          servicePackageId: servicePackageId,
          mikrotikRouterId: mikrotikRouterId // ✅ CORREGIDO
        },
        include: [
          {
            model: db.MikrotikRouter,
            include: [{ model: db.Device, as: 'device' }]
          }
        ],
        transaction
      });

      if (!dbProfile) {
        throw new Error(`No se encontró perfil para el paquete ${servicePackageId} en el router ${mikrotikRouterId}`); // ✅ CORREGIDO
      }

      // Verificar que no haya usuarios usando este perfil
      const usersUsingProfile = await db.MikrotikPPPOE.count({
        where: { profileId: dbProfile.profileId },
        transaction
      });

      if (usersUsingProfile > 0) {
        throw new Error(`No se puede eliminar el perfil ${dbProfile.profileName} porque ${usersUsingProfile} usuarios lo están usando`);
      }

      const router = dbProfile.MikrotikRouter;

      // Eliminar perfil de RouterOS
      await mikrotikService.deletePPPoEProfile(
        router.device.ipAddress,
        router.apiPort,
        router.username,
        router.passwordEncrypted,
        dbProfile.profileId
      );

      // Eliminar perfil de BD
      const profileName = dbProfile.profileName;
      await dbProfile.destroy({ transaction });

      await transaction.commit();

      return {
        success: true,
        message: `Perfil ${profileName} eliminado exitosamente del router ${router.name}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error eliminando perfil: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Calcular burst limit basado en rate limit
   * @private
   */
  _calculateBurstLimit(rateLimit) {
    const [down, up] = rateLimit.split('/');
    const downValue = parseInt(down.replace('M', ''));
    const upValue = parseInt(up.replace('M', ''));
    
    const burstDown = Math.round(downValue * 1.5);
    const burstUp = Math.round(upValue * 1.5);
    
    return `${burstDown}M/${burstUp}M`;
  }

  /**
   * Calcular burst threshold basado en rate limit
   * @private
   */
  _calculateBurstThreshold(rateLimit) {
    const [down, up] = rateLimit.split('/');
    const downValue = parseInt(down.replace('M', ''));
    const upValue = parseInt(up.replace('M', ''));
    
    const thresholdDown = Math.round(downValue * 0.8);
    const thresholdUp = Math.round(upValue * 0.8);
    
    return `${thresholdDown}M/${thresholdUp}M`;
  }
}

module.exports = new ServicePackageService();