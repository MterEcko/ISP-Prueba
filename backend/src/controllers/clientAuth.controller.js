// backend/src/controllers/clientAuth.controller.js
const db = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { Client } = db;

/**
 * Generar número de cliente basado en el ID del cliente
 * Formato de 5 dígitos mínimo: 00001, 00030, 99999, 100000, etc.
 */
function generateClientNumber(clientId) {
  // Formatear ID con ceros a la izquierda (mínimo 5 dígitos)
  return clientId.toString().padStart(5, '0');
}

/**
 * Generar contraseña aleatoria segura
 */
function generateRandomPassword() {
  // Generar contraseña de 12 caracteres (letras, números, símbolos)
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Generar credenciales de portal para un cliente
 * Se llama al crear un servicio para el cliente
 */
exports.generateClientCredentials = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si ya tiene credenciales
    if (client.clientNumber && client.password) {
      return res.status(400).json({
        success: false,
        message: 'El cliente ya tiene credenciales generadas'
      });
    }

    // Generar número de cliente basado en el ID
    const clientNumber = generateClientNumber(client.id);

    // Generar contraseña aleatoria
    const plainPassword = generateRandomPassword();

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Actualizar cliente
    await client.update({
      clientNumber,
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Credenciales generadas exitosamente',
      data: {
        clientNumber,
        password: plainPassword, // Se retorna solo una vez para que el admin se la dé al cliente
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`
      }
    });

  } catch (error) {
    console.error('Error generando credenciales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar credenciales'
    });
  }
};

/**
 * Login de cliente
 * POST /api/client-auth/login
 */
exports.login = async (req, res) => {
  try {
    const { clientNumber, password } = req.body;

    if (!clientNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Número de cliente y contraseña son requeridos'
      });
    }

    // Buscar cliente por número
    const client = await Client.findOne({
      where: { clientNumber }
    });

    if (!client) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, client.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el cliente está activo
    if (!client.active) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está inactiva. Contacta a soporte.'
      });
    }

    // Actualizar última fecha de login
    await client.update({ lastLoginAt: new Date() });

    // Generar JWT
    const token = jwt.sign(
      {
        id: client.id,
        clientNumber: client.clientNumber,
        type: 'client', // Importante: identificar que es un cliente
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      client: {
        id: client.id,
        clientNumber: client.clientNumber,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        type: 'client'
      }
    });

  } catch (error) {
    console.error('Error en login de cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el login'
    });
  }
};

/**
 * Cambiar contraseña del cliente
 * PUT /api/client-auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const clientId = req.clientId; // Del middleware de autenticación

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, client.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await client.update({
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
};

/**
 * Obtener perfil del cliente
 * GET /api/client-auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const clientId = req.clientId; // Del middleware de autenticación

    const client = await Client.findByPk(clientId, {
      attributes: { exclude: ['password'] }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      client
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

/**
 * Actualizar perfil del cliente
 * PUT /api/client-auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const clientId = req.clientId;
    const { email, phone, whatsapp } = req.body;

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Solo permitir actualizar ciertos campos
    const updateData = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (whatsapp) updateData.whatsapp = whatsapp;

    await client.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        whatsapp: client.whatsapp
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};
