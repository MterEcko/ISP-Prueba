const jwt = require('jsonwebtoken');
const db = require('../models');
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

    // Generar token JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
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