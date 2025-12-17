// backend/src/controllers/service.package.controller.js - CORREGIDO
const db = require('../models');
const ServicePackageService = require('../services/service.package.service');
const ClientMikrotikService = require('../services/client.mikrotik.service');
const MikrotikService = require('../services/mikrotik.service'); // ✅ Correcto
const logger = require('../utils/logger');

// Get all service packages
exports.getAllServicePackages = async (req, res) => {
  try {
    const servicePackages = await db.ServicePackage.findAll({
      include: [
        { 
          model: db.Zone,
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: servicePackages,
      message: 'Service packages retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving service packages: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving service packages'
    });
  }
};

// Get service package by ID
exports.getServicePackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }
     
    // ✅ CORREGIDO: usar 'id' en lugar de 'servicePackageId'
    const servicePackage = await db.ServicePackage.findByPk(id, {
      include: [
        { 
          model: db.Zone,
          attributes: ['id', 'name']
        },
        { 
          model: db.MikrotikProfile,
          include: [
            {
              model: db.MikrotikRouter,
              attributes: ['id', 'name', 'ipAddress']
            }
          ]
        }
      ]
    });

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: servicePackage,
      message: 'Service package retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving service package: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving service package'
    });
  }
};

// Create a new service package
exports.createServicePackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      downloadSpeedMbps,
      uploadSpeedMbps,
      dataLimitGb,
      billingCycle,
      zoneId,
      active,
      suspensionAction,
      suspendedPoolId,
      profileConfigurations = [] // ✅ NUEVO: Configuraciones de perfiles Mikrotik
    } = req.body;

    if (!name || !price || !downloadSpeedMbps || !uploadSpeedMbps || !zoneId) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, download speed, upload speed, and zone are required'
      });
    }

    // Validar configuración de suspensión
    if (suspensionAction === 'move_pool' && !suspendedPoolId) {
      return res.status(400).json({
        success: false,
        message: 'suspendedPoolId is required when suspensionAction is move_pool'
      });
    }

    // Check if package name already exists in the zone
    const existingPackage = await db.ServicePackage.findOne({
      where: { name, zoneId }
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: `Service package name '${name}' already exists in this zone`
      });
    }

    // ✅ NUEVO: Si se proporcionan configuraciones de perfiles, usar el servicio mejorado
    if (profileConfigurations.length > 0) {
      const result = await ServicePackageService.createServicePackageWithProfiles({
        name,
        description,
        price,
        downloadSpeedMbps,
        uploadSpeedMbps,
        dataLimitGb,
        billingCycle: billingCycle || 'monthly',
        zoneId,
        active: active !== undefined ? active : true,
        suspensionAction: suspensionAction || 'disable',
        suspendedPoolId: suspensionAction === 'move_pool' ? suspendedPoolId : null
      }, profileConfigurations);

      return res.status(201).json(result);
    } else {
      // Crear solo el paquete sin perfiles
      const newServicePackage = await db.ServicePackage.create({
        name,
        description,
        price,
        downloadSpeedMbps,
        uploadSpeedMbps,
        dataLimitGb,
        billingCycle: billingCycle || 'monthly',
        zoneId,
        active: active !== undefined ? active : true,
        suspensionAction: suspensionAction || 'disable',
        suspendedPoolId: suspensionAction === 'move_pool' ? suspendedPoolId : null
      });

      return res.status(201).json({
        success: true,
        data: newServicePackage,
        message: 'Service package created successfully (without profiles)'
      });
    }

  } catch (error) {
    logger.error(`Error creating service package: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating service package'
    });
  }
};

// Update a service package
exports.updateServicePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      downloadSpeedMbps,
      uploadSpeedMbps,
      dataLimitGb,
      billingCycle,
      zoneId,
      active,
      suspensionAction,
      suspendedPoolId
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }

    // Validar configuración de suspensión
    if (suspensionAction === 'move_pool' && !suspendedPoolId) {
      return res.status(400).json({
        success: false,
        message: 'suspendedPoolId is required when suspensionAction is move_pool'
      });
    }

    const servicePackage = await db.ServicePackage.findByPk(id);

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }

    // If name is being changed, check if new name already exists
    if (name && name !== servicePackage.name) {
      const existingPackage = await db.ServicePackage.findOne({
        where: { 
          name,
          zoneId: zoneId || servicePackage.zoneId
        }
      });
      
      if (existingPackage) {
        return res.status(400).json({
          success: false,
          message: 'Service package name already exists in this zone'
        });
      }
    }

    await servicePackage.update({
      name: name || servicePackage.name,
      description: description || servicePackage.description,
      price: price || servicePackage.price,
      downloadSpeedMbps: downloadSpeedMbps || servicePackage.downloadSpeedMbps,
      uploadSpeedMbps: uploadSpeedMbps || servicePackage.uploadSpeedMbps,
      dataLimitGb: dataLimitGb !== undefined ? dataLimitGb : servicePackage.dataLimitGb,
      billingCycle: billingCycle || servicePackage.billingCycle,
      zoneId: zoneId || servicePackage.zoneId,
      active: active !== undefined ? active : servicePackage.active,
      suspensionAction: suspensionAction || servicePackage.suspensionAction,
      suspendedPoolId: suspensionAction === 'move_pool'
        ? (suspendedPoolId || servicePackage.suspendedPoolId)
        : null
    });

    return res.status(200).json({
      success: true,
      data: servicePackage,
      message: 'Service package updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating service package: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating service package'
    });
  }
};

// Delete a service package
exports.deleteServicePackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }

    const servicePackage = await db.ServicePackage.findByPk(id);

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }

    // Check if package is associated with any clients
    const clientCount = await db.ClientBilling.count({
      where: { servicePackageId: id }
    });

    if (clientCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete service package. It is associated with ${clientCount} clients.`
      });
    }

    await servicePackage.destroy();

    return res.status(200).json({
      success: true,
      message: 'Service package deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting service package: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting service package'
    });
  }
};

// ✅ NUEVO: Get Mikrotik profiles for a service package with current RouterOS data
exports.getPackageProfiles = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }

    const result = await ServicePackageService.getPackageProfilesWithMikrotikData(id);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error retrieving package profiles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving package profiles'
    });
  }
};

// Get clients using a service package
// Get clients using a service package
exports.getPackageClients = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }

    const clients = await db.ClientBilling.findAll({
      where: { servicePackageId: id },
      include: [
        {
          model: db.Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: db.IpPool,
          as: 'currentIpPool',
          attributes: ['id', 'poolName', 'poolType']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: clients,
      message: 'Package clients retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving package clients: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving package clients'
    });
  }
};

// Get service package statistics
exports.getPackageStatistics = async (req, res) => {
  try {
    const packages = await db.ServicePackage.findAll({
      attributes: ['id', 'name', 'price', 'active'],
      include: [
        { 
          model: db.Zone,
          attributes: ['id', 'name']
        }
      ]
    });

    const statistics = [];

    for (const pkg of packages) {
      const clientCount = await db.ClientBilling.count({
        where: { servicePackageId: pkg.id }
      });
      
      const profileCount = await db.MikrotikProfile.count({
        where: { servicePackageId: pkg.id }
      });
      
      statistics.push({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        active: pkg.active,
        zone: pkg.Zone ? pkg.Zone.name : 'Sin zona',
        clientCount,
        profileCount,
        revenue: pkg.price * clientCount
      });
    }

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Package statistics retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving package statistics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving package statistics'
    });
  }
};

// ✅ MEJORADO: Create Mikrotik profiles for a service package using profileId
// EN: backend/src/controllers/servicePackage.controller.js
// EN: backend/src/controllers/servicePackage.controller.js
exports.createPackageProfiles = async (req, res) => {
 try {
   const { id: packageId } = req.params;
   const { profileConfigurations } = req.body;
   
   console.log('🔄 [BACKEND] Procesando perfiles para paquete:', packageId);
   console.log('📋 [BACKEND] Configuraciones recibidas:', JSON.stringify(profileConfigurations, null, 2));
   
   if (!profileConfigurations || !Array.isArray(profileConfigurations)) {
     return res.status(400).json({
       success: false,
       message: 'Configuraciones de perfiles inválidas'
     });
   }
   
   // ✅ VERIFICAR que el paquete existe
   const servicePackage = await db.ServicePackage.findByPk(packageId);
   if (!servicePackage) {
     return res.status(404).json({
       success: false,
       message: `Paquete ${packageId} no encontrado`
     });
   }
   
   // ✅ NUEVA LÓGICA: Liberar perfiles anteriores
   console.log('🔍 [BACKEND] === INICIANDO LIBERACIÓN DE PERFILES ANTERIORES ===');
   
   // 1. Obtener perfiles actualmente vinculados al paquete
   const currentProfiles = await db.MikrotikProfile.findAll({
     where: { servicePackageId: packageId }
   });
   
   console.log('📋 [BACKEND] Perfiles actualmente vinculados:', currentProfiles.length);
   currentProfiles.forEach(profile => {
     console.log(`   - Router ${profile.mikrotikRouterId}, Profile ${profile.profileId} (${profile.profileName})`);
   });
   
   // 2. Obtener los identificadores únicos de las nuevas configuraciones (router + profileId)
   const newProfileKeys = profileConfigurations.map(config => 
     `${config.mikrotikRouterId}-${config.profileId}`
   );
   
   console.log('📋 [BACKEND] Nuevas configuraciones (router-profileId):', newProfileKeys);
   
   // 3. Identificar perfiles que ya no estarán en la nueva configuración
   const profilesToFree = currentProfiles.filter(profile => {
     const currentKey = `${profile.mikrotikRouterId}-${profile.profileId}`;
     return !newProfileKeys.includes(currentKey);
   });
   
   console.log('🔓 [BACKEND] Perfiles a liberar:', profilesToFree.length);
   
   // 4. Liberar perfiles (poner servicePackageId = null)
   const freedProfiles = [];
   for (const profileToFree of profilesToFree) {
     console.log(`🔓 [BACKEND] Liberando perfil: Router ${profileToFree.mikrotikRouterId}, Profile ${profileToFree.profileId} (${profileToFree.profileName})`);
     
     await profileToFree.update({ 
       servicePackageId: null,
       lastSync: new Date()
     });
     
     freedProfiles.push({
       mikrotikRouterId: profileToFree.mikrotikRouterId,
       profileId: profileToFree.profileId,
       profileName: profileToFree.profileName,
       action: 'freed'
     });
   }
   
   console.log('✅ [BACKEND] Perfiles liberados exitosamente:', freedProfiles.length);
   console.log('🔍 [BACKEND] === FIN LIBERACIÓN DE PERFILES ANTERIORES ===');
   
   // ✅ PROCESAR NUEVAS CONFIGURACIONES
   console.log('🔄 [BACKEND] === INICIANDO PROCESAMIENTO DE NUEVAS CONFIGURACIONES ===');
   
   const results = [];
   
   for (const config of profileConfigurations) {
     try {
       console.log('🔧 [BACKEND] Procesando config:', config);
       
       // ✅ CORREGIDO: Buscar por router + profileId (constraint único)
       let existingProfile = await db.MikrotikProfile.findOne({
         where: {
           mikrotikRouterId: config.mikrotikRouterId,
           profileId: config.profileId  // ✅ CLAVE: Usar profileId único
         }
       });
       
       if (existingProfile) {
         console.log('🔄 [BACKEND] Perfil existente encontrado, ID BD:', existingProfile.id);
         console.log('🔄 [BACKEND] servicePackageId actual:', existingProfile.servicePackageId);
         
         // ✅ ACTUALIZAR perfil existente (reasignar al nuevo paquete)
         const updateData = {
           servicePackageId: packageId,  // ✅ IMPORTANTE: Actualizar la vinculación
           profileName: config.profileName || existingProfile.profileName,
           rateLimit: config.rateLimit || existingProfile.rateLimit,
           burstLimit: config.burstLimit || existingProfile.burstLimit,
           burstThreshold: config.burstThreshold || existingProfile.burstThreshold,
           burstTime: config.burstTime || existingProfile.burstTime,
           priority: config.priority || existingProfile.priority,
           additionalSettings: config.additionalSettings || existingProfile.additionalSettings,
           active: true,
           lastSync: new Date()
         };
         
         console.log('📝 [BACKEND] Actualizando con datos:', updateData);
         
         await existingProfile.update(updateData);
         
         console.log('✅ [BACKEND] Perfil REASIGNADO para router', config.routerName);
         results.push({
           mikrotikRouterId: config.mikrotikRouterId,
           profileId: config.profileId,
           profileName: config.profileName,
           status: 'reassigned',
           dbProfileId: existingProfile.id,
           message: `Perfil ${config.profileName} reasignado al paquete`
         });
         
       } else {
         console.log('🆕 [BACKEND] Perfil no existe en BD, creando nuevo registro...');
         
         // ✅ CREAR nuevo perfil en BD (el perfil ya existe en Mikrotik)
         const createData = {
           mikrotikRouterId: config.mikrotikRouterId,
           servicePackageId: packageId,
           profileId: config.profileId,
           profileName: config.profileName,
           rateLimit: config.rateLimit,
           burstLimit: config.burstLimit,
           burstThreshold: config.burstThreshold,
           burstTime: config.burstTime,
           priority: config.priority,
           additionalSettings: config.additionalSettings || {},
           active: true,
           lastSync: new Date()
         };
         
         console.log('📝 [BACKEND] Creando registro en BD con datos:', createData);
         
         const newProfile = await db.MikrotikProfile.create(createData);
         
         console.log('✅ [BACKEND] Registro de perfil CREADO para router', config.routerName);
         results.push({
           mikrotikRouterId: config.mikrotikRouterId,
           profileId: config.profileId,
           profileName: config.profileName,
           status: 'linked',
           dbProfileId: newProfile.id,
           message: `Perfil ${config.profileName} vinculado al paquete`
         });
       }
       
     } catch (configError) {
       console.error(`❌ [BACKEND] Error procesando router ${config.routerName}:`, configError);
       results.push({
         mikrotikRouterId: config.mikrotikRouterId,
         profileId: config.profileId,
         status: 'error',
         error: configError.message
       });
     }
   }
   
   console.log('🔍 [BACKEND] === FIN PROCESAMIENTO DE NUEVAS CONFIGURACIONES ===');
   
   // ✅ RESUMEN FINAL
   const successCount = results.filter(r => r.status !== 'error').length;
   const errorCount = results.filter(r => r.status === 'error').length;
   const freedCount = freedProfiles.length;
   
   console.log('📊 [BACKEND] === RESUMEN FINAL ===');
   console.log('📊 [BACKEND] Perfiles liberados:', freedCount);
   console.log('📊 [BACKEND] Configuraciones exitosas:', successCount);
   console.log('📊 [BACKEND] Errores:', errorCount);
   console.log('📊 [BACKEND] Resultados completos:', results);
   
   return res.status(200).json({
     success: successCount > 0, // ✅ Solo true si al menos uno fue exitoso
     message: `Profiles processed for package ${servicePackage.name}`,
     data: {
       processed: results,
       freed: freedProfiles
     },
     summary: {
       total: profileConfigurations.length,
       successful: successCount,
       errors: errorCount,
       freed: freedCount
     }
   });
   
 } catch (error) {
   console.error('❌ [BACKEND] Error general en createPackageProfiles:', error);
   return res.status(500).json({
     success: false,
     message: 'Error procesando perfiles: ' + error.message
   });
 }
};

// ✅ NUEVO: Sync package profiles with RouterOS
exports.syncPackageWithRouters = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }

    const servicePackage = await db.ServicePackage.findByPk(id);

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }

    const result = await ServicePackageService.syncPackageProfiles(id);

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error syncing package with routers: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error syncing package with routers'
    });
  }
};

// ✅ NUEVO: Update specific profile of a package
exports.updatePackageProfile = async (req, res) => {
  try {
    const { id, routerId } = req.params;
    const profileUpdates = req.body;

    if (!id || !routerId) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID and router ID are required'
      });
    }

    const result = await ServicePackageService.updatePackageProfile(
      parseInt(id), 
      parseInt(routerId), 
      profileUpdates
    );

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error updating package profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating package profile'
    });
  }
};



// ✅ NUEVO: Delete specific profile of a package
exports.deletePackageProfile = async (req, res) => {
  try {
    const { id, routerId } = req.params;

    if (!id || !routerId) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID and router ID are required'
      });
    }

    const result = await ServicePackageService.deletePackageProfile(
      parseInt(id), 
      parseInt(routerId)
    );

    return res.status(200).json(result);

  } catch (error) {
    logger.error(`Error deleting package profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting package profile'
    });
  }
};

// ✅ NUEVO: Create client subscription with PPPoE user and IP assignment
exports.createClientSubscription = async (req, res) => {
  try {
    const {
      clientId,
      servicePackageId,
      mikrotikRouterId,
      username, // Opcional
      password,
      ipPoolType = 'active',
      customPrice, // Precio personalizado para descuentos
      startDate = new Date(),
      notes
    } = req.body;

    if (!clientId || !servicePackageId || !mikrotikRouterId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, service package ID, router ID, and password are required'
      });
    }

    // Verificar que el cliente existe
    const client = await db.Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client ${clientId} not found`
      });
    }

    // Verificar que el paquete existe
    const servicePackage = await db.ServicePackage.findByPk(servicePackageId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: `Service package ${servicePackageId} not found`
      });
    }

    // Obtener perfil del paquete para este router
    const mikrotikProfile = await db.MikrotikProfile.findOne({
      where: {
        servicePackageId: servicePackageId,
        mikrotikRouterId: mikrotikRouterId
      }
    });

    if (!mikrotikProfile) {
      return res.status(400).json({
        success: false,
        message: `No profile configured for package ${servicePackage.name} on the specified router`
      });
    }

    // Obtener pool del tipo especificado
    const ipPool = await db.IpPool.findOne({
      where: {
        mikrotikRouterId: mikrotikRouterId,
        poolType: ipPoolType,
        active: true
      }
    });

    if (!ipPool) {
      return res.status(400).json({
        success: false,
        message: `No ${ipPoolType} IP pool available on the specified router`
      });
    }

    // Crear usuario PPPoE usando el servicio
    const pppoeResult = await ClientMikrotikService.createClientPPPoE(clientId, mikrotikRouterId, {
      username: username,
      password: password,
      profileId: mikrotikProfile.profileId,
      profileName: mikrotikProfile.profileName,
      poolId: ipPool.poolId,
      poolName: ipPool.poolName
    });

    // Crear registro de facturación
    const billing = await db.ClientBilling.create({
      clientId: clientId,
      servicePackageId: servicePackageId,
      currentIpPoolId: ipPool.id,
      billingStatus: 'active',
      lastPaymentDate: startDate,
      nextBillingDate: calculateNextBillingDate(startDate, servicePackage.billingCycle),
      currentPrice: customPrice || servicePackage.price,
      monthlyFee: customPrice || servicePackage.price
    });

    return res.status(201).json({
      success: true,
      data: {
        client: {
          id: clientId,
          name: `${client.firstName} ${client.lastName}`
        },
        servicePackage: {
          id: servicePackage.id,
          name: servicePackage.name,
          price: customPrice || servicePackage.price
        },
        pppoeUser: pppoeResult.data.pppoeUser,
        assignedIP: pppoeResult.data.assignedIP,
        billing: {
          id: billing.id,
          nextBillingDate: billing.nextBillingDate,
          currentPrice: billing.currentPrice
        }
      },
      message: 'Client subscription created successfully'
    });

  } catch (error) {
    logger.error(`Error creating client subscription: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating client subscription'
    });
  }
};

// ✅ NUEVO: Get available routers for a zone
exports.getAvailableRouters = async (req, res) => {
  try {
    const { zoneId } = req.params;

    if (!zoneId) {
      return res.status(400).json({
        success: false,
        message: 'Zone ID is required'
      });
    }

    const routers = await db.MikrotikRouter.findAll({
      where: { active: true },
      include: [
        {
          model: db.Node,
          where: { zoneId: zoneId },
          attributes: ['id', 'name', 'zoneId']
        },
        {
          model: db.Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: routers.map(router => ({
        id: router.id,
        name: router.name,
        ipAddress: router.device.ipAddress,
        nodeName: router.Node.name
      })),
      message: `${routers.length} routers found in zone`
    });

  } catch (error) {
    logger.error(`Error getting available routers: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting available routers'
    });
  }
};

// Helper function to calculate next billing date
function calculateNextBillingDate(startDate, billingCycle) {
  const date = new Date(startDate);
  
  switch (billingCycle) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date;
}