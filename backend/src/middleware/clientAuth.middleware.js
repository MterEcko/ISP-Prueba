// backend/src/middleware/clientAuth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación para clientes del portal
 */
module.exports = (req, res, next) => {
  try {
    const token = req.headers['x-access-token'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Verificar que sea un token de cliente
    if (decoded.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Acceso no autorizado. Este endpoint es solo para clientes.'
      });
    }

    // Agregar información del cliente al request
    req.clientId = decoded.id;
    req.clientNumber = decoded.clientNumber;
    req.clientType = decoded.type;

    next();
  } catch (error) {
    console.error('Error en autenticación de cliente:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};
