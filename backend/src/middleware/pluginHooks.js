// backend/src/middleware/pluginHooks.js
const pluginManager = require('../services/pluginManager.service');
const logger = require('../utils/logger');

/**
 * Middleware que ejecuta en cadena todos los middlewares de seguridad
 * registrados por los plugins activos (Capabilities: "security_middleware").
 * * Ejemplo: Plugin Anti-DDoS, Plugin IP Blacklist, Plugin Geo-Blocking.
 */
const securityMiddlewareChain = async (req, res, next) => {
  // 1. Obtener la lista de "guardias de seguridad" activos
  const middlewares = pluginManager.getSecurityMiddlewares();

  // Si no hay plugins de seguridad, pasa directo (Pase VIP)
  if (!middlewares || middlewares.length === 0) {
    return next();
  }

  let index = 0;

  // Función recursiva para ejecutar uno tras otro
  const runNext = async (err) => {
    // Si un plugin anterior dio error, cortamos aquí y pasamos el error a Express
    if (err) return next(err);
    
    // Si ya ejecutamos todos los plugins, pasamos al Core
    if (index >= middlewares.length) {
      return next();
    }

    // Tomar el siguiente plugin de la lista
    const currentMw = middlewares[index++];
    
    try {
      // Ejecutar la lógica del plugin
      // El plugin debe llamar a su propio 'next()' para volver a esta función 'runNext'
      await currentMw(req, res, runNext);
    } catch (error) {
      logger.error(`❌ Error crítico en plugin de seguridad (Index ${index - 1}): ${error.message}`);
      
      // DECISIÓN DE ARQUITECTURA:
      // Opción A (Seguridad Extrema): Si un firewall falla, bloqueamos todo.
      // Opción B (Resiliencia): Si el plugin falla, dejamos pasar (Fail Open) para no tirar el servicio.
      // Elegimos Opción B para evitar que un bug en un plugin tire todo tu ISP.
      runNext(); 
    }
  };

  // Iniciar la cadena
  runNext();
};

module.exports = {
  securityMiddlewareChain
};