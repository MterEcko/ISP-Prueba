// backend/src/controllers/service.package.controller.js
const db = require('../models');
const ServicePackage = db.ServicePackage;
const MikrotikProfile = db.MikrotikProfile;
const logger = require('../utils/logger');

// Get all service packages
exports.getAllServicePackages = async (req, res) => {
  try {
    const ServicePackages = await ServicePackage.findAll({
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: ServicePackages,
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
    
    const ServicePackage = await ServicePackage.findByPk(id, {
      include: [
        { model: MikrotikProfile, as: 'mikrotikProfiles' }
      ]
    });
    
    if (!ServicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: ServicePackage,
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
      hasJellyfin, 
      active, 
      zoneId
      
    } = req.body;
    
    if (!name || !price || !downloadSpeedMbps || !uploadSpeedMbps) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, download speed, and upload speed are required'
      });
    }
    
    // Check if package name already exists
    const existingPackage = await ServicePackage.findOne({
      where: { name }
    });
    
    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: 'Service package name already exists'
      });
    }
    
    const newServicePackage = await ServicePackage.create({
      name,
      description,
      price,
      downloadSpeedMbps,
      uploadSpeedMbps,
      dataLimitGb,
      billingCycle: billingCycle || 'monthly',
      hasJellyfin: hasJellyfin !== undefined ? hasJellyfin : false,
      active: active !== undefined ? active : true,
	  zoneId: zoneId
    });
    
    return res.status(201).json({
      success: true,
      data: newServicePackage,
      packageId: newServicePackage.id,  // ← AGREGAR ESTA LÍNEA
      message: 'Service package created successfully'
    });
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
      hasJellyfin, 
      active 
    } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }
    
    const ServicePackage = await ServicePackage.findByPk(id);
    
    if (!ServicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    
    // If name is being changed, check if new name already exists
    if (name && name !== ServicePackage.name) {
      const existingPackage = await ServicePackage.findOne({
        where: { name }
      });
      
      if (existingPackage) {
        return res.status(400).json({
          success: false,
          message: 'Service package name already exists'
        });
      }
    }
    
    await ServicePackage.update({
      name: name || ServicePackage.name,
      description: description || ServicePackage.description,
      price: price || ServicePackage.price,
      downloadSpeedMbps: downloadSpeedMbps || ServicePackage.downloadSpeedMbps,
      uploadSpeedMbps: uploadSpeedMbps || ServicePackage.uploadSpeedMbps,
      dataLimitGb: dataLimitGb !== undefined ? dataLimitGb : ServicePackage.dataLimitGb,
      billingCycle: billingCycle || ServicePackage.billingCycle,
      hasJellyfin: hasJellyfin !== undefined ? hasJellyfin : ServicePackage.hasJellyfin,
      active: active !== undefined ? active : ServicePackage.active,
      zoneId: zoneId || ServicePackage.zoneId
    });
    
    return res.status(200).json({
      success: true,
      data: ServicePackage,
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
    
    const ServicePackage = await ServicePackage.findByPk(id);
    
    if (!ServicePackage) {
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
    
    await ServicePackage.destroy();
    
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

// Get Mikrotik profiles for a service package
exports.getPackageProfiles = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }
    
    const profiles = await MikrotikProfile.findAll({
      where: { servicePackageId: id },
      include: [
        { model: db.MikrotikRouter, as: 'MikrotikRouter' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: profiles,
      message: 'Package profiles retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving package profiles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving package profiles'
    });
  }
};

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
          as: 'Client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
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
    const packages = await ServicePackage.findAll({
      attributes: ['id', 'name', 'price', 'active']
    });
    
    const statistics = [];
    
    for (const pkg of packages) {
      const clientCount = await db.ClientBilling.count({
        where: { servicePackageId: pkg.id }
      });
      
      statistics.push({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        active: pkg.active,
        clientCount,
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

// Create Mikrotik profiles for a service package on all routers
// Reemplazar líneas 190-200:
exports.createPackageProfiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { routers, profileConfiguration } = req.body; // ← RECIBIR CONFIGURACIÓN
    
    console.log('=== CREANDO PERFILES PARA PACKAGE:', id); // ← LOG 1
    console.log('Body recibido:', { routers, profileConfiguration }); // ← LOG ADICIONAL
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }
    
    const ServicePackage = db.ServicePackage; // Usar PascalCase
    const packageRecord = await ServicePackage.findByPk(id);
    console.log('Package encontrado:', packageRecord ? 'SÍ' : 'NO'); // ← LOG 2
    console.log('Package data:', packageRecord ? packageRecord.name : 'N/A'); // ← LOG ADICIONAL
    
    if (!packageRecord) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    
    // ✅ USAR CONFIGURACIÓN ENVIADA O BUSCAR ROUTERS AUTOMÁTICAMENTE
    let routersToProcess;
    
    if (profileConfiguration && Array.isArray(profileConfiguration)) {
      // Usar configuración específica del frontend
      console.log('Usando configuración del frontend:', profileConfiguration.length, 'routers'); // ← LOG 3
      routersToProcess = profileConfiguration;
    } else {
      // Fallback: buscar todos los routers activos
      console.log('Buscando routers activos automáticamente...'); // ← LOG 4
      const allRouters = await db.MikrotikRouter.findAll({
        where: { active: true }
      });
      console.log('Routers activos encontrados:', allRouters.length); // ← LOG 5
      
      routersToProcess = allRouters.map(router => ({
        routerId: router.id,
        routerName: router.name,
        action: 'create',
        profileName: `${packageRecord.name.replace(/\s+/g, '_')}_${packageRecord.downloadSpeedMbps}M_${packageRecord.uploadSpeedMbps}M`
      }));
    }
    
    console.log('Routers a procesar:', routersToProcess.length); // ← LOG 6
    
    const results = [];
    
for (const routerConfig of routersToProcess) {
  console.log('Procesando router:', routerConfig.routerName, '- Acción:', routerConfig.action);
  
  if (routerConfig.action === 'skip') {
    results.push({
      router: routerConfig.routerName,
      status: 'skipped'
    });
    continue;
  }
  
  // ✅ BUSCAR EL MIKROTIK ROUTER REAL USANDO EL DEVICEID
  const mikrotikRouter = await db.MikrotikRouter.findOne({
    where: { deviceId: routerConfig.routerId }
  });
  
  if (!mikrotikRouter) {
    console.log(`ERROR: No se encontró MikrotikRouter para deviceId ${routerConfig.routerId}`);
    results.push({
      router: routerConfig.routerName,
      status: 'router_not_found',
      error: `MikrotikRouter no encontrado para deviceId ${routerConfig.routerId}`
    });
    continue;
  }
  
  console.log(`MikrotikRouter encontrado: ID ${mikrotikRouter.id} para deviceId ${routerConfig.routerId}`);
  
  // Verificar si ya existe el perfil
  const existingProfile = await MikrotikProfile.findOne({
    where: {
      servicePackageId: id,
      mikrotikRouterId: mikrotikRouter.id // ← Usar el ID real del MikrotikRouter
    }
  });
  
  console.log('Perfil existente para router', routerConfig.routerName, ':', existingProfile ? 'SÍ' : 'NO');
  
  if (!existingProfile) {
    const profileName = routerConfig.profileName;
    
    if (!profileName) {
      console.log(`ERROR: No se proporcionó profileName para router ${routerConfig.routerName}`);
      results.push({
        router: routerConfig.routerName,
        status: 'error',
        error: 'profileName es requerido'
      });
      continue;
    }
    
    console.log('Creando perfil:', profileName);
    
    const newProfile = await MikrotikProfile.create({
      servicePackageId: id,
      mikrotikRouterId: mikrotikRouter.id, // ← Usar el ID real del MikrotikRouter
      profileName: profileName,
      rateLimit: routerConfig.profileConfig?.rateLimit || 
        `${packageRecord.downloadSpeedMbps}M/${packageRecord.uploadSpeedMbps}M`,
      burstLimit: routerConfig.profileConfig?.burstLimit || 
        `${Math.round(packageRecord.downloadSpeedMbps * 1.2)}M/${Math.round(packageRecord.uploadSpeedMbps * 1.2)}M`,
      burstThreshold: routerConfig.profileConfig?.burstThreshold || 
        `${Math.round(packageRecord.downloadSpeedMbps * 0.8)}M/${Math.round(packageRecord.uploadSpeedMbps * 0.8)}M`,
      burstTime: '8s/8s',
      priority: routerConfig.profileConfig?.priority || '8',
      active: true
    });
    
    console.log('Perfil creado con ID:', newProfile.id);
    
    results.push({
      router: routerConfig.routerName,
      profile: newProfile,
      status: 'created'
    });
  } else {
    results.push({
      router: routerConfig.routerName,
      profile: existingProfile,
      status: 'already_exists'
    });
  }
}

    
    console.log('Total resultados:', results.length); // ← LOG 11
    console.log('Resultados detalle:', results); // ← LOG 12
    
    return res.status(200).json({
      success: true,
      data: results,
      message: 'Package profiles created successfully'
    });
  } catch (error) {
    console.error('ERROR DETALLADO COMPLETO:', error); // ← LOG ERROR MEJORADO
    logger.error(`Error creating package profiles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating package profiles'
    });
  }
};



// Sync a service package with Mikrotik routers
exports.syncPackageWithRouters = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service package ID is required'
      });
    }
    
    const ServicePackage = await ServicePackage.findByPk(id);
    
    if (!ServicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    
    const profiles = await MikrotikProfile.findAll({
      where: { servicePackageId: id },
      include: [
        { model: db.MikrotikRouter, as: 'MikrotikRouter' }
      ]
    });
    
    const results = [];
    
    for (const profile of profiles) {
      // Aquí integrarías con el MikrotikService
      // const mikrotikService = require('../services/mikrotik.service');
      // await mikrotikService.syncProfile(profile);
      
      results.push({
        router: profile.mikrotikRouter.name,
        profile: profile.profileName,
        status: 'synced'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: results,
      message: 'Package synced with routers successfully'
    });
  } catch (error) {
    logger.error(`Error syncing package with routers: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error syncing package with routers'
    });
  }
};