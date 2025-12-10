// backend/src/services/eventBus.service.js
const EventEmitter = require('events');
const logger = require('../utils/logger');

class SystemEventBus extends EventEmitter {
  constructor() {
    super();
    // Aumentamos el límite porque tendrás muchos plugins escuchando (ej. 44 plugins)
    this.setMaxListeners(100); 
    logger.info('🚌 EventBus del Sistema inicializado');
  }

  /**
   * Emitir un evento del sistema (El Core habla)
   * @param {string} eventName - Ej: 'CLIENT_CREATED', 'SERVICE_SUSPENDED'
   * @param {Object} data - Datos del evento
   */
  emit(eventName, data) {
    // Log nivel debug para no saturar consola, pero útil para desarrollo
    // logger.debug(`📢 Evento emitido: ${eventName}`);
    try {
      super.emit(eventName, data);
    } catch (error) {
      logger.error(`❌ Error procesando evento ${eventName}: ${error.message}`);
    }
  }

  /**
   * Los plugins usan esto para escuchar (El Plugin Oye)
   */
  subscribe(eventName, callback) {
    this.on(eventName, async (data) => {
      try {
        await callback(data);
      } catch (error) {
        logger.error(`⚠️ Error en listener de plugin para evento ${eventName}: ${error.message}`);
      }
    });
  }
}

module.exports = new SystemEventBus();