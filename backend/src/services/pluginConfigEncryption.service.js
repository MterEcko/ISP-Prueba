// backend/src/services/pluginConfigEncryption.service.js
const crypto = require('crypto');

/**
 * Servicio de encriptación para configuración de plugins
 * Protege credenciales sensibles (API keys, secrets, tokens)
 */
class PluginConfigEncryptionService {
  constructor() {
    // Usar variable de entorno para la clave de encriptación
    // En producción, esta clave debe ser única y segura
    this.encryptionKey = this._getEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // Para AES, esto es 128 bits
    this.saltLength = 64;
    this.tagLength = 16;

    // Palabras clave que indican campos sensibles
    this.sensitiveFields = [
      'password',
      'secret',
      'token',
      'key',
      'apikey',
      'api_key',
      'accesstoken',
      'access_token',
      'clientsecret',
      'client_secret',
      'privatekey',
      'private_key',
      'webhooksecret',
      'webhook_secret',
      'credentials'
    ];
  }

  /**
   * Obtiene la clave de encriptación desde variables de entorno
   * o genera una por defecto (NO RECOMENDADO EN PRODUCCIÓN)
   * @private
   */
  _getEncryptionKey() {
    const envKey = process.env.PLUGIN_CONFIG_ENCRYPTION_KEY;

    if (envKey) {
      // Derivar una clave de 32 bytes desde la key del .env
      return crypto.scryptSync(envKey, 'salt', 32);
    }

    // ADVERTENCIA: Clave por defecto solo para desarrollo
    console.warn('⚠️  ADVERTENCIA: Usando clave de encriptación por defecto. Configure PLUGIN_CONFIG_ENCRYPTION_KEY en producción.');
    return crypto.scryptSync('default-insecure-key-change-in-production', 'salt', 32);
  }

  /**
   * Detecta si un campo es sensible basándose en su nombre
   * @param {string} fieldName - Nombre del campo
   * @returns {boolean} - true si el campo es sensible
   */
  isSensitiveField(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      return false;
    }

    const lowerFieldName = fieldName.toLowerCase().replace(/[_-]/g, '');

    return this.sensitiveFields.some(sensitive =>
      lowerFieldName.includes(sensitive.replace(/[_-]/g, ''))
    );
  }

  /**
   * Encripta un valor sensible
   * @param {string} plaintext - Texto plano a encriptar
   * @returns {string} - Texto encriptado en formato base64
   */
  encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      return plaintext;
    }

    try {
      // Generar IV (Initialization Vector) aleatorio
      const iv = crypto.randomBytes(this.ivLength);

      // Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encriptar
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Obtener authentication tag
      const authTag = cipher.getAuthTag();

      // Combinar IV + encrypted + authTag y convertir a base64
      // Formato: iv(16 bytes) + encrypted(variable) + authTag(16 bytes)
      const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'hex'),
        authTag
      ]);

      return combined.toString('base64');

    } catch (error) {
      console.error('Error encriptando valor:', error.message);
      throw new Error('Error al encriptar configuración sensible');
    }
  }

  /**
   * Desencripta un valor sensible
   * @param {string} encryptedText - Texto encriptado en base64
   * @returns {string} - Texto plano desencriptado
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText;
    }

    try {
      // Decodificar de base64
      const combined = Buffer.from(encryptedText, 'base64');

      // Extraer IV, encrypted data, y authTag
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(-this.tagLength);
      const encrypted = combined.slice(this.ivLength, -this.tagLength);

      // Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Desencriptar
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('Error desencriptando valor:', error.message);
      // Si falla la desencriptación, puede que no esté encriptado
      // (retrocompatibilidad con configs antiguas)
      return encryptedText;
    }
  }

  /**
   * Encripta todos los campos sensibles en un objeto de configuración
   * @param {Object} config - Configuración del plugin
   * @param {Object} configSchema - Schema JSON para identificar campos sensibles
   * @returns {Object} - Configuración con campos sensibles encriptados
   */
  encryptConfig(config, configSchema = null) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const encryptedConfig = { ...config };

    // Iterar sobre todos los campos
    Object.keys(encryptedConfig).forEach(key => {
      // Verificar si el campo es sensible por nombre
      const isSensitiveByName = this.isSensitiveField(key);

      // Verificar si el schema indica que es sensible (format: "password")
      const isSensitiveBySchema = configSchema?.properties?.[key]?.format === 'password';

      if (isSensitiveByName || isSensitiveBySchema) {
        const value = encryptedConfig[key];

        // Solo encriptar si es string y no está ya encriptado
        if (typeof value === 'string' && value.length > 0 && !this._isEncrypted(value)) {
          encryptedConfig[key] = this.encrypt(value);
          console.log(`🔒 Campo sensible encriptado: ${key}`);
        }
      }

      // Si es un objeto anidado, encriptar recursivamente
      if (typeof encryptedConfig[key] === 'object' && encryptedConfig[key] !== null) {
        encryptedConfig[key] = this.encryptConfig(
          encryptedConfig[key],
          configSchema?.properties?.[key]
        );
      }
    });

    return encryptedConfig;
  }

  /**
   * Desencripta todos los campos sensibles en un objeto de configuración
   * @param {Object} config - Configuración encriptada
   * @param {Object} configSchema - Schema JSON para identificar campos sensibles
   * @returns {Object} - Configuración con campos sensibles desencriptados
   */
  decryptConfig(config, configSchema = null) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const decryptedConfig = { ...config };

    Object.keys(decryptedConfig).forEach(key => {
      const isSensitiveByName = this.isSensitiveField(key);
      const isSensitiveBySchema = configSchema?.properties?.[key]?.format === 'password';

      if (isSensitiveByName || isSensitiveBySchema) {
        const value = decryptedConfig[key];

        if (typeof value === 'string' && value.length > 0 && this._isEncrypted(value)) {
          decryptedConfig[key] = this.decrypt(value);
        }
      }

      // Si es un objeto anidado, desencriptar recursivamente
      if (typeof decryptedConfig[key] === 'object' && decryptedConfig[key] !== null) {
        decryptedConfig[key] = this.decryptConfig(
          decryptedConfig[key],
          configSchema?.properties?.[key]
        );
      }
    });

    return decryptedConfig;
  }

  /**
   * Enmascara un valor sensible para mostrarlo en logs o UI
   * @param {string} value - Valor a enmascarar
   * @param {number} visibleChars - Caracteres visibles al inicio (default: 4)
   * @returns {string} - Valor enmascarado
   */
  mask(value, visibleChars = 4) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    if (value.length <= visibleChars) {
      return '*'.repeat(value.length);
    }

    const visible = value.substring(0, visibleChars);
    const masked = '*'.repeat(Math.min(value.length - visibleChars, 20));

    return `${visible}${masked}`;
  }

  /**
   * Enmascara todos los campos sensibles en un objeto de configuración
   * para mostrarlo de forma segura
   * @param {Object} config - Configuración del plugin
   * @param {Object} configSchema - Schema JSON
   * @returns {Object} - Configuración con valores enmascarados
   */
  maskConfig(config, configSchema = null) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const maskedConfig = { ...config };

    Object.keys(maskedConfig).forEach(key => {
      const isSensitiveByName = this.isSensitiveField(key);
      const isSensitiveBySchema = configSchema?.properties?.[key]?.format === 'password';

      if (isSensitiveByName || isSensitiveBySchema) {
        const value = maskedConfig[key];

        if (typeof value === 'string' && value.length > 0) {
          // Si está encriptado, desencriptar primero para enmascarar correctamente
          const plainValue = this._isEncrypted(value) ? this.decrypt(value) : value;
          maskedConfig[key] = this.mask(plainValue);
        }
      }

      // Si es un objeto anidado, enmascarar recursivamente
      if (typeof maskedConfig[key] === 'object' && maskedConfig[key] !== null) {
        maskedConfig[key] = this.maskConfig(
          maskedConfig[key],
          configSchema?.properties?.[key]
        );
      }
    });

    return maskedConfig;
  }

  /**
   * Verifica si un valor parece estar encriptado
   * @private
   * @param {string} value - Valor a verificar
   * @returns {boolean} - true si parece encriptado
   */
  _isEncrypted(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    try {
      // Los valores encriptados deben ser base64 válido
      // y tener al menos la longitud del IV + authTag (32 bytes = 44 chars en base64)
      const decoded = Buffer.from(value, 'base64');
      return decoded.length >= (this.ivLength + this.tagLength);
    } catch (error) {
      return false;
    }
  }

  /**
   * Genera un hash de la configuración para detectar cambios
   * @param {Object} config - Configuración del plugin
   * @returns {string} - Hash SHA256 de la configuración
   */
  hashConfig(config) {
    if (!config) {
      return null;
    }

    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }
}

// Exportar instancia singleton
module.exports = new PluginConfigEncryptionService();
