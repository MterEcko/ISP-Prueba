const db = require('../models');
const SystemLicense = db.SystemLicense;
const logger = require('../utils/logger');
const crypto = require('crypto');

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
        status: 'active',
        expiration_date: {
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
      license_key, 
      license_type, 
      max_clients, 
      max_devices, 
      features, 
      activation_date, 
      expiration_date, 
      customer_name, 
      customer_email 
    } = req.body;
    
    if (!license_key || !license_type || !expiration_date) {
      return res.status(400).json({
        success: false,
        message: 'License key, type, and expiration date are required'
      });
    }
    
    // Check if license key already exists
    const existingLicense = await SystemLicense.findOne({
      where: { license_key }
    });
    
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'License key already exists'
      });
    }
    
    // Generate hardware ID if not provided
    const hardware_id = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
    
    const newLicense = await SystemLicense.create({
      license_key,
      license_type,
      max_clients: max_clients || 100,
      max_devices: max_devices || 50,
      features: features || [],
      activation_date: activation_date || new Date(),
      expiration_date,
      hardware_id,
      status: 'active',
      customer_name,
      customer_email
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
      license_type, 
      max_clients, 
      max_devices, 
      features, 
      expiration_date, 
      status, 
      customer_name, 
      customer_email 
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
      license_type: license_type || license.license_type,
      max_clients: max_clients !== undefined ? max_clients : license.max_clients,
      max_devices: max_devices !== undefined ? max_devices : license.max_devices,
      features: features || license.features,
      expiration_date: expiration_date || license.expiration_date,
      status: status || license.status,
      customer_name: customer_name || license.customer_name,
      customer_email: customer_email || license.customer_email
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

// Activate a system license
exports.activateLicense = async (req, res) => {
  try {
    const { license_key, hardware_id } = req.body;
    
    if (!license_key) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }
    
    const license = await SystemLicense.findOne({
      where: { license_key }
    });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Invalid license key'
      });
    }
    
    // Check if license is expired
    if (new Date(license.expiration_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'License has expired'
      });
    }
    
    // Update hardware ID if provided
    if (hardware_id) {
      license.hardware_id = hardware_id;
    }
    
    // Set license as active
    license.status = 'active';
    license.activation_date = new Date();
    await license.save();
    
    return res.status(200).json({
      success: true,
      data: license,
      message: 'License activated successfully'
    });
  } catch (error) {
    logger.error(`Error activating license: ${error.message}`);
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
    const { license_key, hardware_id } = req.body;
    
    if (!license_key) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }
    
    const license = await SystemLicense.findOne({
      where: { license_key }
    });
    
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Invalid license key'
      });
    }
    
    // Check if license is expired
    const isExpired = new Date(license.expiration_date) < new Date();
    
    // Check if hardware ID matches (if provided and set)
    let hardwareMatches = true;
    if (hardware_id && license.hardware_id && license.hardware_id !== hardware_id) {
      hardwareMatches = false;
    }
    
    // Check if license is active
    const isActive = license.status === 'active';
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((new Date(license.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    
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
    const { expiration_date } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'License ID is required'
      });
    }
    
    if (!expiration_date) {
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
    license.expiration_date = expiration_date;
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
    const clientUsagePercent = license.max_clients > 0 ? 
      Math.round((clientCount / license.max_clients) * 100) : 0;
    
    const deviceUsagePercent = license.max_devices > 0 ? 
      Math.round((deviceCount / license.max_devices) * 100) : 0;
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((new Date(license.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    
    return res.status(200).json({
      success: true,
      data: {
        license,
        usage: {
          clients: {
            current: clientCount,
            max: license.max_clients,
            percentage: clientUsagePercent
          },
          devices: {
            current: deviceCount,
            max: license.max_devices,
            percentage: deviceUsagePercent
          },
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          status: license.status,
          isExpired: new Date(license.expiration_date) < new Date()
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
