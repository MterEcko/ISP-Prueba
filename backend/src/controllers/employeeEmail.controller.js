// backend/src/controllers/employeeEmail.controller.js
// Controlador para gestión de correos de empleados

const db = require('../models');
const bcrypt = require('bcryptjs');
const axios = require('axios');

/**
 * Crear cuenta de correo para un empleado
 */
exports.createEmailAccount = async (req, res) => {
  try {
    const {
      userId,
      emailUsername,
      password,
      quotaMB,
      serverType
    } = req.body;

    if (!userId || !emailUsername || !password) {
      return res.status(400).json({
        message: 'userId, emailUsername y password son requeridos'
      });
    }

    // Obtener usuario
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si ya tiene cuenta de correo
    const existingEmail = await db.EmployeeEmail.findOne({ where: { userId } });
    if (existingEmail) {
      return res.status(400).json({
        message: 'El usuario ya tiene una cuenta de correo asignada'
      });
    }

    // Obtener dominio desde configuración
    const domainConfig = await db.SystemConfiguration.findOne({
      where: { configKey: 'mail_domain' }
    });
    const domain = domainConfig?.configValue || 'serviciosqbit.net';

    const emailAddress = `${emailUsername}@${domain}`;

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obtener tipo de servidor desde configuración
    const serverTypeConfig = await db.SystemConfiguration.findOne({
      where: { configKey: 'mail_server_type' }
    });
    const finalServerType = serverType || serverTypeConfig?.configValue || 'external';

    // Crear cuenta en el servidor de correo
    let mailServerResult;
    if (finalServerType === 'external') {
      mailServerResult = await createExternalEmailAccount(emailAddress, password, quotaMB);
    } else {
      mailServerResult = await createLocalEmailAccount(emailAddress, password, quotaMB);
    }

    if (!mailServerResult.success) {
      return res.status(500).json({
        message: 'Error creando cuenta en el servidor de correo',
        error: mailServerResult.error
      });
    }

    // Guardar en base de datos
    const employeeEmail = await db.EmployeeEmail.create({
      userId,
      emailUsername,
      emailAddress,
      emailPassword: hashedPassword,
      domain,
      quotaMB: quotaMB || 1024,
      serverType: finalServerType,
      webmailUrl: mailServerResult.webmailUrl,
      active: true
    });

    return res.status(201).json({
      message: 'Cuenta de correo creada exitosamente',
      email: {
        id: employeeEmail.id,
        emailAddress: employeeEmail.emailAddress,
        quotaMB: employeeEmail.quotaMB,
        webmailUrl: employeeEmail.webmailUrl
      },
      temporaryPassword: password // Devolver solo en la creación
    });

  } catch (error) {
    console.error('Error creando cuenta de correo:', error);
    return res.status(500).json({
      message: 'Error creando cuenta de correo',
      error: error.message
    });
  }
};

/**
 * Listar todas las cuentas de correo
 */
exports.getAllEmailAccounts = async (req, res) => {
  try {
    const emails = await db.EmployeeEmail.findAll({
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'fullName', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      emails,
      count: emails.length
    });

  } catch (error) {
    console.error('Error obteniendo cuentas de correo:', error);
    return res.status(500).json({
      message: 'Error obteniendo cuentas de correo',
      error: error.message
    });
  }
};

/**
 * Obtener cuenta de correo por ID
 */
exports.getEmailAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const email = await db.EmployeeEmail.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'fullName', 'username', 'email']
        }
      ]
    });

    if (!email) {
      return res.status(404).json({
        message: 'Cuenta de correo no encontrada'
      });
    }

    return res.status(200).json(email);

  } catch (error) {
    console.error('Error obteniendo cuenta de correo:', error);
    return res.status(500).json({
      message: 'Error obteniendo cuenta de correo',
      error: error.message
    });
  }
};

/**
 * Actualizar cuenta de correo
 */
exports.updateEmailAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const email = await db.EmployeeEmail.findByPk(id);
    if (!email) {
      return res.status(404).json({
        message: 'Cuenta de correo no encontrada'
      });
    }

    // Si se cambia la contraseña, encriptarla
    if (updates.password) {
      updates.emailPassword = await bcrypt.hash(updates.password, 10);
      delete updates.password;

      // Actualizar en el servidor de correo también
      if (email.serverType === 'external') {
        await updateExternalEmailPassword(email.emailAddress, updates.password);
      } else {
        await updateLocalEmailPassword(email.emailAddress, updates.password);
      }
    }

    await email.update(updates);

    return res.status(200).json({
      message: 'Cuenta de correo actualizada',
      email
    });

  } catch (error) {
    console.error('Error actualizando cuenta de correo:', error);
    return res.status(500).json({
      message: 'Error actualizando cuenta de correo',
      error: error.message
    });
  }
};

/**
 * Eliminar cuenta de correo
 */
exports.deleteEmailAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const email = await db.EmployeeEmail.findByPk(id);
    if (!email) {
      return res.status(404).json({
        message: 'Cuenta de correo no encontrada'
      });
    }

    // Eliminar del servidor de correo
    if (email.serverType === 'external') {
      await deleteExternalEmailAccount(email.emailAddress);
    } else {
      await deleteLocalEmailAccount(email.emailAddress);
    }

    await email.destroy();

    return res.status(200).json({
      message: 'Cuenta de correo eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cuenta de correo:', error);
    return res.status(500).json({
      message: 'Error eliminando cuenta de correo',
      error: error.message
    });
  }
};

/**
 * Obtener URL del webmail para abrir en nueva pestaña
 */
exports.getWebmailUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const email = await db.EmployeeEmail.findByPk(id);
    if (!email) {
      return res.status(404).json({
        message: 'Cuenta de correo no encontrada'
      });
    }

    // Generar token de sesión única (SSO)
    const ssoToken = generateSSOToken(email);

    return res.status(200).json({
      webmailUrl: email.webmailUrl,
      ssoUrl: `${email.webmailUrl}/sso?token=${ssoToken}`,
      emailAddress: email.emailAddress
    });

  } catch (error) {
    console.error('Error obteniendo URL de webmail:', error);
    return res.status(500).json({
      message: 'Error obteniendo URL de webmail',
      error: error.message
    });
  }
};

/**
 * Actualizar estadísticas de uso (llamado periódicamente)
 */
exports.updateUsageStats = async (req, res) => {
  try {
    const emails = await db.EmployeeEmail.findAll({ where: { active: true } });

    for (const email of emails) {
      try {
        let usage;
        if (email.serverType === 'external') {
          usage = await getExternalEmailUsage(email.emailAddress);
        } else {
          usage = await getLocalEmailUsage(email.emailAddress);
        }

        await email.update({
          usedMB: usage.usedMB,
          lastLogin: usage.lastLogin
        });
      } catch (err) {
        console.error(`Error actualizando stats de ${email.emailAddress}:`, err);
      }
    }

    return res.status(200).json({
      message: 'Estadísticas actualizadas',
      updated: emails.length
    });

  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    return res.status(500).json({
      message: 'Error actualizando estadísticas',
      error: error.message
    });
  }
};

// ============================================
// FUNCIONES AUXILIARES - SERVIDOR EXTERNO
// ============================================

async function createExternalEmailAccount(emailAddress, password, quotaMB) {
  try {
    const config = await db.SystemConfiguration.findOne({
      where: { configKey: 'mail_server_url' }
    });
    const apiKey = await db.SystemConfiguration.findOne({
      where: { configKey: 'mail_server_api_key' }
    });

    if (!config || !apiKey) {
      throw new Error('Configuración del servidor de correo no encontrada');
    }

    // Llamar a la API del proveedor de correo (ejemplo con cPanel API)
    const response = await axios.post(`${config.configValue}/api/email/create`, {
      email: emailAddress,
      password: password,
      quota: quotaMB || 1024
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey.configValue}`
      }
    });

    return {
      success: true,
      webmailUrl: `${config.configValue}/webmail`
    };

  } catch (error) {
    console.error('Error creando cuenta externa:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateExternalEmailPassword(emailAddress, newPassword) {
  // Implementar llamada a API del proveedor
  console.log(`Actualizando contraseña de ${emailAddress} en servidor externo`);
}

async function deleteExternalEmailAccount(emailAddress) {
  // Implementar llamada a API del proveedor
  console.log(`Eliminando ${emailAddress} del servidor externo`);
}

async function getExternalEmailUsage(emailAddress) {
  // Implementar llamada a API del proveedor
  return { usedMB: 0, lastLogin: null };
}

// ============================================
// FUNCIONES AUXILIARES - SERVIDOR LOCAL
// ============================================

async function createLocalEmailAccount(emailAddress, password, quotaMB) {
  try {
    // Usar Docker Mail Server local o similar
    const config = await db.SystemConfiguration.findOne({
      where: { configKey: 'mail_domain' }
    });
    const domain = config?.configValue || 'serviciosqbit.net';

    // Aquí irá la integración con docker-mailserver o Mailu
    console.log(`Creando cuenta local: ${emailAddress}`);

    return {
      success: true,
      webmailUrl: `http://mail.${domain}`
    };

  } catch (error) {
    console.error('Error creando cuenta local:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateLocalEmailPassword(emailAddress, newPassword) {
  console.log(`Actualizando contraseña de ${emailAddress} en servidor local`);
}

async function deleteLocalEmailAccount(emailAddress) {
  console.log(`Eliminando ${emailAddress} del servidor local`);
}

async function getLocalEmailUsage(emailAddress) {
  return { usedMB: 0, lastLogin: null };
}

// ============================================
// SSO TOKEN GENERATION
// ============================================

function generateSSOToken(email) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      emailAddress: email.emailAddress,
      userId: email.userId
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
}
