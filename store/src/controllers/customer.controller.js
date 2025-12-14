const db = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');
const emailService = require('../utils/emailService');
const { Customer, ServicePackage, License } = db;

// Función helper para generar clave de licencia
function generateLicenseKey() {
  return crypto.randomBytes(32).toString('hex').toUpperCase().match(/.{1,8}/g).join('-');
}

/**
 * Registrar nuevo cliente
 * Genera una licencia automáticamente y la envía por email
 */
exports.registerCustomer = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      companyName,
      servicePackageId
    } = req.body;

    // Validaciones
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y email son requeridos'
      });
    }

    if (!servicePackageId) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un paquete'
      });
    }

    // Verificar si el email ya existe
    const existingCustomer = await Customer.findOne({ where: { email } });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este email'
      });
    }

    // Obtener información del paquete
    const servicePackage = await ServicePackage.findByPk(servicePackageId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Generar licencia
    const licenseKey = generateLicenseKey();

    // Crear la licencia en la tabla Licenses
    const license = await License.create({
      licenseKey,
      servicePackageId: servicePackage.id,
      planType: servicePackage.metadata?.planType || 'basic',
      clientLimit: servicePackage.clientLimit,
      userLimit: servicePackage.userLimit,
      branchLimit: servicePackage.branchLimit,
      featuresEnabled: servicePackage.featuresEnabled || {},
      expiresAt: servicePackage.billingCycle === 'one-time' ? null : calculateExpirationDate(servicePackage.billingCycle),
      isRecurring: servicePackage.billingCycle !== 'one-time',
      recurringInterval: servicePackage.billingCycle === 'monthly' || servicePackage.billingCycle === 'yearly' ? servicePackage.billingCycle : null,
      price: servicePackage.price,
      status: 'pending'
    });

    // Crear el cliente
    const customer = await Customer.create({
      name,
      email,
      phone,
      companyName,
      servicePackageId,
      licenseKey,
      licenseId: license.id,
      status: 'active',
      registeredAt: new Date()
    });

    // Intentar enviar email con la licencia
    let emailSent = false;
    let emailError = null;

    try {
      if (emailService.isAvailable()) {
        await emailService.sendLicenseEmail({
          to: email,
          customerName: name,
          licenseKey: licenseKey,
          packageInfo: {
            name: servicePackage.name,
            description: servicePackage.description
          }
        });

        // Actualizar fecha de envío de licencia
        customer.licenseSentAt = new Date();
        await customer.save();

        emailSent = true;
        logger.info(`✅ Cliente registrado y licencia enviada: ${email}`);
      } else {
        emailError = 'Servicio de email no configurado';
        logger.warn(`⚠️  Cliente registrado pero email no enviado (servicio no configurado): ${email}`);
      }
    } catch (error) {
      emailError = error.message;
      logger.error(`❌ Error enviando email a ${email}:`, error);
    }

    // Cargar datos completos del cliente con relaciones
    const customerData = await Customer.findByPk(customer.id, {
      include: [
        {
          model: ServicePackage,
          as: 'package'
        },
        {
          model: License,
          as: 'license'
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: customerData,
      emailSent,
      emailError,
      message: emailSent
        ? 'Cliente registrado exitosamente. Licencia enviada por email.'
        : 'Cliente registrado exitosamente. Licencia generada pero no enviada por email.'
    });

  } catch (error) {
    logger.error('Error registrando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener todos los clientes
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { status, servicePackageId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (servicePackageId) where.servicePackageId = servicePackageId;

    const customers = await Customer.findAll({
      where,
      include: [
        {
          model: ServicePackage,
          as: 'package'
        },
        {
          model: License,
          as: 'license'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error) {
    logger.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener un cliente por ID
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: ServicePackage,
          as: 'package'
        },
        {
          model: License,
          as: 'license'
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    logger.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Actualizar cliente
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // No permitir actualizar licenseKey directamente
    delete updates.licenseKey;
    delete updates.licenseId;

    await customer.update(updates);

    const updatedCustomer = await Customer.findByPk(id, {
      include: [
        {
          model: ServicePackage,
          as: 'package'
        },
        {
          model: License,
          as: 'license'
        }
      ]
    });

    logger.info(`Cliente actualizado: ${customer.email}`);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Eliminar cliente
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await customer.destroy();

    logger.info(`Cliente eliminado: ${customer.email}`);

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reenviar licencia por email
 */
exports.resendLicense = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      include: [
        {
          model: ServicePackage,
          as: 'package'
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!customer.licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'Este cliente no tiene una licencia asignada'
      });
    }

    // Enviar email
    try {
      await emailService.sendLicenseEmail({
        to: customer.email,
        customerName: customer.name,
        licenseKey: customer.licenseKey,
        packageInfo: {
          name: customer.package.name,
          description: customer.package.description
        }
      });

      // Actualizar fecha de envío
      customer.licenseSentAt = new Date();
      await customer.save();

      logger.info(`✅ Licencia reenviada a: ${customer.email}`);

      res.json({
        success: true,
        message: 'Licencia reenviada exitosamente'
      });
    } catch (error) {
      logger.error(`❌ Error reenviando licencia a ${customer.email}:`, error);
      res.status(500).json({
        success: false,
        message: `Error enviando email: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error reenviando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Desactivar licencia del cliente
 */
exports.deactivateLicense = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      include: [{ model: License, as: 'license' }]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!customer.license) {
      return res.status(400).json({
        success: false,
        message: 'El cliente no tiene una licencia activa'
      });
    }

    // Desactivar la licencia
    await customer.license.update({
      status: 'suspended'
    });

    logger.info(`Licencia desactivada para cliente: ${customer.email}`);

    res.json({
      success: true,
      message: 'Licencia desactivada exitosamente'
    });
  } catch (error) {
    logger.error('Error desactivando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Renovar licencia del cliente
 */
exports.renewLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body; // 'monthly' o 'yearly'

    const customer = await Customer.findByPk(id, {
      include: [
        { model: License, as: 'license' },
        { model: ServicePackage, as: 'package' }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (!customer.license) {
      return res.status(400).json({
        success: false,
        message: 'El cliente no tiene una licencia'
      });
    }

    // Calcular nueva fecha de expiración
    const billingCycle = duration || customer.package.billingCycle;
    const newExpiresAt = calculateExpirationDate(billingCycle);

    // Renovar la licencia
    await customer.license.update({
      status: 'active',
      lastRenewalDate: new Date(),
      nextRenewalDate: newExpiresAt,
      expiresAt: newExpiresAt
    });

    // Actualizar fecha de último pago del cliente
    await customer.update({
      lastPaymentAt: new Date(),
      nextBillingDate: newExpiresAt
    });

    logger.info(`Licencia renovada para cliente: ${customer.email}`);

    res.json({
      success: true,
      message: 'Licencia renovada exitosamente',
      data: {
        expiresAt: newExpiresAt
      }
    });
  } catch (error) {
    logger.error('Error renovando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Crear nueva licencia para el cliente (desactiva la anterior)
 */
exports.createNewLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { servicePackageId } = req.body;

    const customer = await Customer.findByPk(id, {
      include: [{ model: License, as: 'license' }]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener información del nuevo paquete
    const packageId = servicePackageId || customer.servicePackageId;
    const servicePackage = await ServicePackage.findByPk(packageId);

    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Desactivar licencia anterior si existe
    if (customer.license) {
      await customer.license.update({
        status: 'revoked',
        notes: 'Licencia reemplazada por una nueva'
      });
      logger.info(`Licencia anterior revocada para cliente: ${customer.email}`);
    }

    // Generar nueva licencia
    const licenseKey = generateLicenseKey();

    const newLicense = await License.create({
      licenseKey,
      servicePackageId: servicePackage.id,
      planType: servicePackage.metadata?.planType || 'basic',
      clientLimit: servicePackage.clientLimit,
      userLimit: servicePackage.userLimit,
      branchLimit: servicePackage.branchLimit,
      featuresEnabled: servicePackage.featuresEnabled || {},
      expiresAt: servicePackage.billingCycle === 'one-time' ? null : calculateExpirationDate(servicePackage.billingCycle),
      isRecurring: servicePackage.billingCycle !== 'one-time',
      recurringInterval: servicePackage.billingCycle === 'monthly' || servicePackage.billingCycle === 'yearly' ? servicePackage.billingCycle : null,
      price: servicePackage.price,
      status: 'active'
    });

    // Actualizar cliente con la nueva licencia
    await customer.update({
      licenseKey: newLicense.licenseKey,
      licenseId: newLicense.id,
      servicePackageId: servicePackage.id
    });

    // Intentar enviar por email
    try {
      await emailService.sendLicenseEmail({
        to: customer.email,
        customerName: customer.name,
        licenseKey: newLicense.licenseKey,
        packageInfo: {
          name: servicePackage.name,
          description: servicePackage.description
        }
      });

      await customer.update({ licenseSentAt: new Date() });
    } catch (emailError) {
      logger.warn(`No se pudo enviar email de nueva licencia: ${emailError.message}`);
    }

    logger.info(`Nueva licencia creada para cliente: ${customer.email}`);

    res.status(201).json({
      success: true,
      message: 'Nueva licencia creada exitosamente',
      data: {
        licenseKey: newLicense.licenseKey,
        expiresAt: newLicense.expiresAt
      }
    });
  } catch (error) {
    logger.error('Error creando nueva licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Función helper para calcular fecha de expiración
 */
function calculateExpirationDate(billingCycle) {
  const now = new Date();

  switch (billingCycle) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'yearly':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return null; // Sin expiración
  }
}
