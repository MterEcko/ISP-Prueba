// backend/src/config/auth.config.js
module.exports = {
  // Secret key para JWT (debe ser la misma que en .env)
  secret: process.env.JWT_SECRET || "isp-secret-key-change-me-in-production",

  // Tiempo de expiración del token (en segundos)
  // 86400 = 24 horas
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION) || 86400,

  // Tiempo de expiración del refresh token (en segundos)
  // 604800 = 7 días
  jwtRefreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION) || 604800,

  // Algoritmo de encriptación
  algorithm: 'HS256',

  // Issuer del token
  issuer: 'ISP Management System',

  // Audience
  audience: 'isp-users'
};
