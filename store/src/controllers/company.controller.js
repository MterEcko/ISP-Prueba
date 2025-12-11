const db = require('../models');
const logger = require('../config/logger');
const { License, Installation } = db;

/**
 * Modelo Company (puedes crear uno formal o almacenar en metadata de Installation)
 * Por ahora uso Installation con información de empresa
 */

/**
 * Registrar empresa
 * POST /api/companies/register
 */
exports.registerCompany = async (req, res) => {
  try {
    const {
      name,
      rfc,
      email,
      phone,
      address,
      contactName,
      licenseKey,
      subdomain
    } = req.body;

    // Validaciones
    if (!name || !email || !licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'Datos de empresa incompletos'
      });
    }

    // Buscar licencia
    const license = await License.findOne({ where: { licenseKey } });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    // Buscar o crear instalación
    let installation = license.installationId
      ? await Installation.findByPk(license.installationId)
      : null;

    if (installation) {
      // Actualizar información de empresa en instalación existente
      await installation.update({
        companyName: name,
        contactEmail: email,
        contactPhone: phone,
        metadata: {
          ...installation.metadata,
          rfc,
          address,
          contactName,
          subdomain,
          registeredAt: new Date()
        }
      });
    } else {
      // Crear nueva instalación con datos de empresa
      const installationKey = require('crypto').randomBytes(16).toString('hex');
      installation = await Installation.create({
        installationKey,
        companyName: name,
        contactEmail: email,
        contactPhone: phone,
        hardwareId: 'pending', // Se actualizará cuando se registre el hardware
        status: 'active',
        currentLicenseId: license.id,
        metadata: {
          rfc,
          address,
          contactName,
          subdomain,
          registeredAt: new Date()
        }
      });

      // Vincular instalación a licencia
      await license.update({
        installationId: installation.id
      });
    }

    // ID de empresa (usamos el ID de instalación)
    const companyId = installation.id;

    logger.info(`✅ Empresa registrada: ${name} (${companyId})`);

    return res.status(200).json({
      success: true,
      companyId: companyId,
      data: {
        id: companyId,
        name,
        rfc,
        email,
        subdomain,
        licenseKey
      }
    });

  } catch (error) {
    logger.error('Error registrando empresa:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registrando empresa',
      error: error.message
    });
  }
};

/**
 * Obtener empresa por ID
 * GET /api/companies/:companyId
 */
exports.getCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const installation = await Installation.findByPk(companyId, {
      include: [{ model: License, as: 'currentLicense' }]
    });

    if (!installation) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: installation.id,
        name: installation.companyName,
        email: installation.contactEmail,
        phone: installation.contactPhone,
        rfc: installation.metadata?.rfc,
        address: installation.metadata?.address,
        contactName: installation.metadata?.contactName,
        subdomain: installation.metadata?.subdomain,
        license: installation.currentLicense
      }
    });

  } catch (error) {
    logger.error('Error obteniendo empresa:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo empresa',
      error: error.message
    });
  }
};

module.exports = exports;
