const jwt = require('jsonwebtoken');
const db = require('../models');
const config = require('../config/auth.config');
const fullAccessLicenseService = require('../services/fullAccessLicense.service');
const User = db.User;
const Role = db.Role;

// Registrar un nuevo usuario
exports.signup = async (req, res) => {
  try {
    // Validar request
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.fullName) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    // Crear usuario
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName,
      roleId: req.body.roleId || 1 // Rol predeterminado
    });

    return res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Iniciar sesión
exports.signin = async (req, res) => {
  try {
    // Buscar usuario por username o email
    const user = await User.findOne({
      where: { 
        [db.Sequelize.Op.or]: [
          { username: req.body.username },
          { email: req.body.username }
        ]
      },
      include: [{
        model: Role,
        attributes: ['id', 'name', 'level', 'category']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar contraseña
    const passwordIsValid = await user.validatePassword(req.body.password);

    if (!passwordIsValid) {
      return res.status(401).json({
        message: "Contraseña inválida"
      });
    }

    // Verificar si está activo
    if (!user.active) {
      return res.status(403).json({
        message: "Usuario desactivado"
      });
    }

    // Actualizar último login
    await user.update({
      lastLogin: new Date()
    });

    // Generar token JWT (usar config.secret para consistencia con socket auth)
    const token = jwt.sign({ id: user.id, username: user.username }, config.secret, {
      expiresIn: 86400 // 24 horas
    });

    // Responder con los datos del usuario y el token
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.Role,
      accessToken: token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Iniciar sesión con Full Access License
exports.fullAccessSignin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar credenciales con el servicio de Full Access
    const isValid = fullAccessLicenseService.authenticate(username, password);

    if (!isValid) {
      return res.status(401).json({
        message: "Credenciales de Full Access inválidas"
      });
    }

    // Buscar o crear usuario admin especial para Full Access
    let fullAccessUser = await User.findOne({
      where: { username: 'POLUX_FULL_ACCESS' },
      include: [{
        model: Role,
        attributes: ['id', 'name', 'level', 'category']
      }]
    });

    // Si no existe, crear el usuario
    if (!fullAccessUser) {
      // Buscar rol de admin (el de mayor nivel)
      const adminRole = await Role.findOne({
        order: [['level', 'DESC']],
        limit: 1
      });

      fullAccessUser = await User.create({
        username: 'POLUX_FULL_ACCESS',
        email: 'fullaccessPOLUX@system.local',
        password: 'SISTEMA_FULL_ACCESS_NO_PASSWORD',
        fullName: 'Full Access License',
        roleId: adminRole ? adminRole.id : 1,
        active: true
      });

      await fullAccessUser.reload({
        include: [{
          model: Role,
          attributes: ['id', 'name', 'level', 'category']
        }]
      });
    }

    // Actualizar último login
    await fullAccessUser.update({
      lastLogin: new Date()
    });

    // Generar token JWT con tiempo de expiración de 1 hora (más corto por seguridad)
    const token = jwt.sign(
      { 
        id: fullAccessUser.id, 
        username: fullAccessUser.username,
        fullAccess: true 
      }, 
      config.secret, 
      {
        expiresIn: 3600 // 1 hora
      }
    );

    // Responder con los datos del usuario y el token
    res.status(200).json({
      id: fullAccessUser.id,
      username: fullAccessUser.username,
      email: fullAccessUser.email,
      fullName: fullAccessUser.fullName,
      role: fullAccessUser.Role,
      accessToken: token,
      fullAccess: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
