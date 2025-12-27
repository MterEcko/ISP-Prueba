const db = require('../models');
const SystemLicense = db.SystemLicense;
const logger = require('../utils/logger');
const crypto = require('crypto');
const {
  isMasterLicense,
  getMasterLicenseInfo,
  validateAgainstMaster
} = require('../config/master-license');
const storeApiClient = require('../services/storeApiClient.service');

// Get all system licenses
exports.getAllLicenses = async (req, res) => {
  try {
    const licenses = await SystemLicense.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: licenses,
      message: 'System licenses retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving system licenses: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving system licenses'
    });
  }
};

// Get system license by ID
exports.getLicenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'System license retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving system license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving system license'
    });
  }
};

// Get current active license
exports.getCurrentLicense = async (req, res) => {
  try {
    const license = await SystemLicense.findOne({
      where: {
        active: true,
        expiresAt: {
          [db.Sequelize.Op.gt]: new Date()
        }
      }
    });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'No active license found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'Current license retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving current license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving current license'
    });
  }
};

// Create a new system license
exports.createLicense = async (req, res) => {
  try {
    const {
      licenseKey,
      licenseType,
      maxClients,
      maxDevices,
      features,
      activationDate,
      expirationDate,
      customerName,
      customerEmail
    } = req.body;

    if (!licenseKey || !licenseType || !expirationDate) {
      return res.status(400).json({
        success: false,
        message: 'License key, type, and expiration date are required'
      });
    }

    // Check if license key already exists
    const existingLicense = await SystemLicense.findOne({
      where: { licenseKey }
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'License key already exists'
      });
    }

    // Generate hardware ID if not provided
    const hardwareId = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');

    const newLicense = await SystemLicense.create({
      licenseKey,
      licenseType,
      maxClients: maxClients || 100,
      maxDevices: maxDevices || 50,
      features: features || [],
      activationDate: activationDate || new Date(),
      expirationDate,
      hardwareId,
      status: 'active',
      customerName,
      customerEmail
    });

    return res.status(201).json({
      success: true,
      data: newLicense,
      message: 'System license created successfully'
    });
  } catch (error) {
    logger.error(`Error creating system license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating system license'
    });
  }
};

// Update a system license
exports.updateLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      licenseType, 
      maxClients, 
      maxDevices, 
      features, 
      expirationDate, 
      status, 
      customerName, 
      customerEmail 
    } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    await license.update({
      licenseType: licenseType || license.licenseType,
      maxClients: maxClients !== undefined ? maxClients : license.maxClients,
      maxDevices: maxDevices !== undefined ? maxDevices : license.maxDevices,
      features: features || license.features,
      expirationDate: expirationDate || license.expirationDate,
      status: status || license.status,
      customerName: customerName || license.customerName,
      customerEmail: customerEmail || license.customerEmail
    });
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'System license updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating system license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating system license'
    });
  }
};

// Delete a system license
exports.deleteLicense = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    await license.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'System license deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting system license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting system license'
    });
  }
};

// Activate a system license (para usuarios ya registrados)
exports.activateLicense = async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }

    logger.info(`🔑 Activando licencia: ${licenseKey}`);

    // Obtener información del hardware y ubicación
    const hardware = await storeApiClient.getHardwareInfo();
    const location = await storeApiClient.getGPSLocation();
    const hwId = hardwareId || hardware.hardwareId;

    // Validar contra el Store primero
    const validation = await storeApiClient.validateLicense(licenseKey, hwId);

    // validateLicense devuelve { valid, status, planType, ... }
    // NO devuelve un campo 'success'
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Licencia inválida o expirada'
      });
    }

    logger.info(`✅ Licencia validada en Store: ${licenseKey}`);

    // Extraer datos del cliente que vienen desde el Store
    const clientData = validation.clientData || null;
    if (clientData) {
      logger.info(`📋 Datos del cliente recibidos: ${clientData.companyName} (${clientData.email})`);
    }

    // Mostrar límites dinámicos recibidos
    if (validation.limits) {
      logger.info(`📊 Límites dinámicos desde Store:`);
      logger.info(`   - Clientes: ${validation.limits.clients || '∞'}`);
      logger.info(`   - Usuarios: ${validation.limits.users || '∞'}`);
      logger.info(`   - Servicios: ${validation.limits.services || '∞'}`);
    }

    // Registrar en el Store (con todos los datos)
    const storeRegistration = await storeApiClient.registerLicense({
      licenseKey,
      hardware,
      location,
      systemVersion: '1.0.0',
      // Enviar datos del cliente si los tenemos
      companyName: clientData?.companyName,
      contactName: clientData?.contactName,
      email: clientData?.email,
      phone: clientData?.phone,
      rfc: clientData?.rfc,
      address: clientData?.address,
      subdomain: clientData?.subdomain
    });

    if (!storeRegistration.success) {
      logger.warn(`⚠️ Error al registrar en Store: ${storeRegistration.message}`);
    } else {
      logger.info(`✅ Licencia registrada en Store: ${licenseKey}`);
    }

    // Desactivar cualquier licencia activa previa (solo debe haber 1 licencia activa)
    await SystemLicense.update(
      { active: false, status: 'inactive' },
      { where: { active: true } }
    );
    logger.info(`🔄 Licencias previas desactivadas`);

    // Buscar o crear en BD local
    let localLicense = await SystemLicense.findOne({ where: { licenseKey } });

    if (!localLicense) {
      // Crear nueva licencia local
      localLicense = await SystemLicense.create({
        licenseKey,
        planType: validation.planType || 'basic',
        clientLimit: validation.limits?.clients || null,
        userLimit: validation.limits?.users || null,
        serviceLimit: validation.limits?.services || null,
        hardwareId: hwId,
        status: 'active',
        active: true,
        activationDate: new Date(),
        expirationDate: validation.expiresAt,
        featuresEnabled: validation.features || {},
        metadata: {
          registeredAt: new Date().toISOString(),
          source: 'store',
          location,
          // Datos del cliente desde el Store
          companyName: clientData?.companyName || null,
          contactName: clientData?.contactName || null,
          email: clientData?.email || null,
          phone: clientData?.phone || null,
          rfc: clientData?.rfc || null,
          address: clientData?.address || null,
          subdomain: clientData?.subdomain || null
        }
      });
      logger.info(`✅ Licencia creada en BD local: ${licenseKey}`);
    } else {
      // Actualizar licencia existente
      const updatedMetadata = {
        ...(localLicense.metadata || {}),
        lastUpdated: new Date().toISOString(),
        location
      };

      // Si vienen datos del cliente, actualizarlos (preservar existentes si no vienen)
      if (clientData) {
        updatedMetadata.companyName = clientData.companyName || updatedMetadata.companyName;
        updatedMetadata.contactName = clientData.contactName || updatedMetadata.contactName;
        updatedMetadata.email = clientData.email || updatedMetadata.email;
        updatedMetadata.phone = clientData.phone || updatedMetadata.phone;
        updatedMetadata.rfc = clientData.rfc || updatedMetadata.rfc;
        updatedMetadata.address = clientData.address || updatedMetadata.address;
        updatedMetadata.subdomain = clientData.subdomain || updatedMetadata.subdomain;
      }

      await localLicense.update({
        hardwareId: hwId,
        status: 'active',
        active: true,
        activationDate: new Date(),
        expirationDate: validation.expiresAt,
        planType: validation.planType || localLicense.planType,
        clientLimit: validation.limits?.clients || localLicense.clientLimit,
        userLimit: validation.limits?.users || localLicense.userLimit,
        serviceLimit: validation.limits?.services || localLicense.serviceLimit,
        featuresEnabled: validation.features || localLicense.featuresEnabled,
        metadata: updatedMetadata
      });
      logger.info(`✅ Licencia actualizada en BD local: ${licenseKey}`);
    }

    return res.status(200).json({
      success: true,
      data: localLicense,
      message: 'Licencia activada exitosamente'
    });
  } catch (error) {
    logger.error(`❌ Error activando licencia: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error activating license'
    });
  }
};

// Deactivate a system license
exports.deactivateLicense = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    license.status = 'inactive';
    await license.save();
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'License deactivated successfully'
    });
  } catch (error) {
    logger.error(`Error deactivating license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deactivating license'
    });
  }
};

// Verify license status
exports.verifyLicense = async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }

    // 🔑 Verificar primero contra licencia maestra
    const masterValidation = validateAgainstMaster(licenseKey);
    if (masterValidation.valid) {
      return res.status(200).json({
        success: true,
        data: {
          license: masterValidation.license,
          verification: {
            isValid: true,
            isMasterLicense: true,
            isActive: true,
            isExpired: false,
            hardwareMatches: true,
            daysRemaining: 999999,
            unlimited: true
          }
        },
        message: 'Master license validated successfully'
      });
    }

    const license = await SystemLicense.findOne({
      where: { licenseKey }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Invalid license key'
      });
    }
    
    // Check if license is expired
    const isExpired = new Date(license.expirationDate) < new Date();
    
    // Check if hardware ID matches (if provided and set)
    let hardwareMatches = true;
    if (hardwareId && license.hardwareId && license.hardwareId !== hardwareId) {
      hardwareMatches = false;
    }
    
    // Check if license is active
    const isActive = license.status === 'active';
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((new Date(license.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    return res.status(200).json({
      success: true,
      data: {
        license,
        verification: {
          isValid: isActive && !isExpired && hardwareMatches,
          isActive,
          isExpired,
          hardwareMatches,
          daysRemaining: isExpired ? 0 : daysRemaining
        }
      },
      message: 'License verification completed'
    });
  } catch (error) {
    logger.error(`Error verifying license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error verifying license'
    });
  }
};

// Renew a system license
exports.renewLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { expirationDate } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    if (!expirationDate) {
      return res.status(400).json({
        success: false,
        message: 'New expiration date is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    // Update expiration date and set status to active
    license.expirationDate = expirationDate;
    license.status = 'active';
    await license.save();
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'License renewed successfully'
    });
  } catch (error) {
    logger.error(`Error renewing license: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error renewing license'
    });
  }
};

// Get license usage statistics
exports.getLicenseUsage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    const license = await SystemLicense.findByPk(id);
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'System license not found'
      });
    }
    
    // Get current client count
    const clientCount = await db.Client.count();
    
    // Get current device count
    const deviceCount = await db.Device.count(); 
    
    // Calculate usage percentages
    const clientUsagePercent = license.maxClients > 0 ? 
      Math.round((clientCount / license.maxClients) * 100) : 0;
    
    const deviceUsagePercent = license.maxDevices > 0 ? 
      Math.round((deviceCount / license.maxDevices) * 100) : 0;
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((new Date(license.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    return res.status(200).json({
      success: true,
      data: {
        license,
        usage: {
          clients: {
            current: clientCount,
            max: license.maxClients,
            percentage: clientUsagePercent
          },
          devices: {
            current: deviceCount,
            max: license.maxDevices,
            percentage: deviceUsagePercent
          },
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          status: license.status,
          isExpired: new Date(license.expirationDate) < new Date()
        }
      },
      message: 'License usage statistics retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving license usage: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving license usage'
    });
  }
};
