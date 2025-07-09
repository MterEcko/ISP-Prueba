const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).json({
      message: "No se proporcionó un token"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: "No autorizado"
      });
    }
    req.userId = decoded.id;
    next();
  });
};

checkRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.userId, {
        include: [{
          model: db.Role,
          attributes: ['name', 'level']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      if (user.Role.name === requiredRole || user.Role.name === 'admin') {
        next();
        return;
      }

      res.status(403).json({
        message: "Requiere rol " + requiredRole
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.userId, {
        include: [{
          model: db.Role,
          include: [{
            model: db.Permission
          }]
        }]
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Si el usuario es admin, permitir acceso sin verificar permisos específicos
      if (user.Role.name === 'admin') {
        next();
        return;
      }

      // Verificar si el rol tiene el permiso requerido
      const hasPermission = user.Role.Permissions.some(
        permission => permission.name === requiredPermission
      );

      if (hasPermission) {
        next();
        return;
      }

      res.status(403).json({
        message: "No tiene permiso: " + requiredPermission
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

const authJwt = {
  verifyToken,
  checkRole,
  checkPermission
};

module.exports = authJwt;