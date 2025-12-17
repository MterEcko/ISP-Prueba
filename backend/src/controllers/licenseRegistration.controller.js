// backend/src/controllers/licenseRegistration.controller.js
const db = require('../models');
const storeApiClient = require('../services/storeApiClient.service');
const licenseLimitsService = require('../services/licenseLimits.service');
const logger = require('../utils/logger');

/**
 * Obtener información del hardware del servidor
 * GET /api/system/hardware-info
 */
exports.getHardwareInfo = async (req, res) => {
  try {
    const hardwareInfo = await storeApiClient.getHardwareInfo();
    const location = await storeApiClient.getGPSLocation();

    return res.status(200).json({
      success: true,
      hardware: hardwareInfo,
      location: location
    });

  } catch (error) {
    logger.error('Error obteniendo información de hardware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo información del sistema'
    });
  }
};

/**
 * Validar clave de licencia
 * POST /api/licenses/validate-key
 */
exports.validateLicenseKey = async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'Clave de licencia requerida'
      });
    }

    // Validar con Store
    const validation = await storeApiClient.validateLicense(licenseKey);

    if (validation.valid) {
      return res.status(200).json({
        success: true,
        valid: true,
        license: {
          planType: validation.planType,
          expiresAt: validation.expiresAt,
          clientLimit: validation.limits?.clients || -1,
          userLimit: validation.limits?.users || -1,
          pluginLimit: validation.limits?.plugins || -1,
          features: validation.features
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        valid: false,
        message: validation.error || 'Licencia inválida'
      });
    }

  } catch (error) {
    logger.error('Error validando licencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validando licencia',
      error: error.message
    });
  }
};

/**
 * Registrar empresa y activar licencia
 * POST /api/licenses/register-company
 */
exports.registerCompanyAndLicense = async (req, res) => {
  try {
    const { company, license, subdomain, hardware, location } = req.body;

    // Validaciones
    if (!company || !company.name || !company.rfc || !company.email) {
      return res.status(400).json({
        success: false,
        message: 'Datos de empresa incompletos'
      });
    }

    if (!license || !license.key) {
      return res.status(400).json({
        success: false,
        message: 'Clave de licencia requerida'
      });
    }

    logger.info(`📋 Iniciando registro de empresa: ${company.name}`);

    // 1. Validar licencia con Store
    const validation = await storeApiClient.validateLicense(license.key);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Licencia inválida o expirada'
      });
    }

    logger.info(`✅ Licencia validada: ${license.key}`);

    // 2. Registrar empresa en Store
    const companyRegistration = await storeApiClient.registerCompany({
      name: company.name,
      rfc: company.rfc,
      email: company.email,
      phone: company.phone,
      address: company.address,
      contactName: company.contactName,
      licenseKey: license.key,
      subdomain: subdomain
    });

    if (!companyRegistration.success) {
      return res.status(500).json({
        success: false,
        message: 'Error registrando empresa en Store',
        error: companyRegistration.error
      });
    }

    logger.info(`✅ Empresa registrada en Store: ${companyRegistration.companyId}`);

    // 3. Registrar licencia con información completa
    const licenseRegistration = await storeApiClient.registerLicense({
      licenseKey: license.key,
      companyId: companyRegistration.companyId,
      companyName: company.name,
      subdomain: subdomain
    });

    if (!licenseRegistration.success) {
      logger.error('Error registrando licencia:', licenseRegistration.error);
    }

    // 4. Crear subdominio si es necesario
    let subdomainResult = null;
    if (subdomain && ['premium', 'enterprise', 'full_access'].includes(validation.planType)) {
      logger.info(`🌐 Creando subdominio: ${subdomain}`);

      subdomainResult = await storeApiClient.createSubdomain(
        license.key,
        subdomain,
        company.name
      );

      if (subdomainResult.success) {
        logger.info(`✅ Subdominio creado: ${subdomainResult.fullDomain}`);
      } else {
        logger.warn(`⚠️  Error creando subdominio: ${subdomainResult.error}`);
      }
    }

    // 5. Guardar licencia en base de datos local
    const existingLicense = await db.SystemLicense.findOne({
      where: { licenseKey: license.key }
    });

    let localLicense;
    if (existingLicense) {
      await existingLicense.update({
        hardwareId: hardware.hardwareId,
        planType: validation.planType,
        clientLimit: validation.limits?.clients || -1,
        userLimit: validation.limits?.users || -1,
        pluginLimit: validation.limits?.plugins || -1,
        active: true,
        activatedAt: new Date(),
        lastValidated: new Date(),
        featuresEnabled: validation.features || {},
        includedPlugins: validation.limits?.includedPlugins || []
      });
      localLicense = existingLicense;
    } else {
      localLicense = await db.SystemLicense.create({
        licenseKey: license.key,
        hardwareId: hardware.hardwareId,
        planType: validation.planType,
        clientLimit: validation.limits?.clients || -1,
        userLimit: validation.limits?.users || -1,
        pluginLimit: validation.limits?.plugins || -1,
        active: true,
        activatedAt: new Date(),
        lastValidated: new Date(),
        featuresEnabled: validation.features || {},
        includedPlugins: validation.limits?.includedPlugins || []
      });
    }

    logger.info(`✅ Licencia guardada en BD local: ${localLicense.id}`);

    // 6. Guardar información de la empresa en tabla local (opcional)
    // Puedes crear un modelo Company si lo necesitas

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: 'Empresa y licencia registradas exitosamente',
      data: {
        companyId: companyRegistration.companyId,
        licenseId: localLicense.id,
        planType: validation.planType,
        subdomain: subdomainResult?.fullDomain || null,
        hardwareId: hardware.hardwareId,
        activatedAt: localLicense.activatedAt
      }
    });

  } catch (error) {
    logger.error('Error registrando empresa y licencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el registro',
      error: error.message
    });
  }
};

/**
 * Obtener información de licencia actual
 * GET /api/licenses/current
 */
exports.getCurrentLicense = async (req, res) => {
  try {
    const licenseInfo = await licenseLimitsService.getLicenseInfo();

    return res.status(200).json({
      success: true,
      license: licenseInfo
    });

  } catch (error) {
    logger.error('Error obteniendo licencia actual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo información de licencia'
    });
  }
};

/**
 * Forzar validación con Store
 * POST /api/licenses/force-validation
 */
exports.forceValidation = async (req, res) => {
  try {
    const license = await licenseLimitsService.getActiveLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'No hay licencia activa'
      });
    }

    const validation = await storeApiClient.validateLicense(license.licenseKey);

    // Actualizar en BD
    await license.update({
      lastValidated: new Date(),
      active: validation.valid && !validation.suspended
    });

    return res.status(200).json({
      success: true,
      validation: validation,
      updated: true
    });

  } catch (error) {
    logger.error('Error forzando validación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validando licencia'
    });
  }
};

/**
 * Actualizar hardware info en Store
 * POST /api/licenses/update-hardware
 */
exports.updateHardwareInfo = async (req, res) => {
  try {
    const license = await licenseLimitsService.getActiveLicense();

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'No hay licencia activa'
      });
    }

    const result = await storeApiClient.updateHardwareInfo(license.licenseKey);

    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Hardware actualizado en Store' : 'Error actualizando hardware',
      data: result.data
    });

  } catch (error) {
    logger.error('Error actualizando hardware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error actualizando información de hardware'
    });
  }
};

module.exports = exports;
