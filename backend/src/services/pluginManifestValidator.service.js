// backend/src/services/pluginManifestValidator.service.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Servicio de validación de manifest.json para plugins
 * Verifica estructura, seguridad y conformidad antes de instalar/activar plugins
 */
class PluginManifestValidatorService {
  constructor() {
    // Campos requeridos en todo manifest
    this.requiredFields = ['name', 'version', 'description', 'category', 'author'];

    // Categorías permitidas
    this.allowedCategories = [
      'payment',
      'communication',
      'network',
      'integration',
      'analytics',
      'security',
      'utility',
      'general'
    ];

    // Patrones sospechosos en código
    this.suspiciousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
      /require\s*\(\s*['"`]fs['"`]\s*\)\.rm/gi,
      /require\s*\(\s*['"`]fs['"`]\s*\)\.unlink/gi,
      /process\.env/gi,
      /\.\.\/\.\.\//g, // Path traversal
      /__dirname/gi,
      /__filename/gi
    ];

    // Permisos peligrosos
    this.dangerousPermissions = [
      'execute_system_commands',
      'read_all_files',
      'write_all_files',
      'access_database_directly',
      'modify_core_files'
    ];
  }

  /**
   * Valida un archivo manifest.json completo
   * @param {string} manifestPath - Ruta al archivo manifest.json
   * @returns {Object} - { valid: boolean, errors: [], warnings: [], manifest: {} }
   */
  validateManifestFile(manifestPath) {
    const errors = [];
    const warnings = [];

    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(manifestPath)) {
        return {
          valid: false,
          errors: ['Archivo manifest.json no encontrado'],
          warnings: [],
          manifest: null
        };
      }

      // Leer y parsear el manifest
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      let manifest;

      try {
        manifest = JSON.parse(manifestContent);
      } catch (parseError) {
        return {
          valid: false,
          errors: [`Error parseando manifest.json: ${parseError.message}`],
          warnings: [],
          manifest: null
        };
      }

      // Validar estructura
      const structureValidation = this.validateStructure(manifest);
      errors.push(...structureValidation.errors);
      warnings.push(...structureValidation.warnings);

      // Validar seguridad
      const securityValidation = this.validateSecurity(manifest);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Validar dependencias
      const depValidation = this.validateDependencies(manifest);
      errors.push(...depValidation.errors);
      warnings.push(...depValidation.warnings);

      // Validar schema de configuración si existe
      if (manifest.configSchema) {
        const schemaValidation = this.validateConfigSchema(manifest.configSchema);
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        manifest
      };

    } catch (error) {
      logger.error(`Error validando manifest: ${error.message}`);
      return {
        valid: false,
        errors: [`Error interno: ${error.message}`],
        warnings: [],
        manifest: null
      };
    }
  }

  /**
   * Valida la estructura básica del manifest
   * @param {Object} manifest - Objeto manifest parseado
   * @returns {Object} - { errors: [], warnings: [] }
   */
  validateStructure(manifest) {
    const errors = [];
    const warnings = [];

    // Verificar que es un objeto
    if (!manifest || typeof manifest !== 'object') {
      errors.push('Manifest debe ser un objeto JSON válido');
      return { errors, warnings };
    }

    // Verificar campos requeridos
    this.requiredFields.forEach(field => {
      if (!manifest[field]) {
        errors.push(`Campo requerido faltante: ${field}`);
      }
    });

    // Validar name
    if (manifest.name) {
      if (!/^[a-z0-9-]+$/.test(manifest.name)) {
        errors.push('El nombre del plugin debe ser lowercase, solo letras, números y guiones');
      }
      if (manifest.name.length < 3 || manifest.name.length > 50) {
        errors.push('El nombre del plugin debe tener entre 3 y 50 caracteres');
      }
    }

    // Validar version (semantic versioning)
    if (manifest.version) {
      if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
        errors.push('La versión debe seguir semantic versioning (ej: 1.0.0)');
      }
    }

    // Validar category
    if (manifest.category) {
      if (!this.allowedCategories.includes(manifest.category)) {
        errors.push(`Categoría inválida. Debe ser una de: ${this.allowedCategories.join(', ')}`);
      }
    }

    // Validar main (entry point)
    if (manifest.main && typeof manifest.main !== 'string') {
      errors.push('El campo "main" debe ser una cadena de texto');
    }

    // Validar capabilities (array de strings)
    if (manifest.capabilities) {
      if (!Array.isArray(manifest.capabilities)) {
        errors.push('El campo "capabilities" debe ser un array');
      } else {
        manifest.capabilities.forEach((cap, index) => {
          if (typeof cap !== 'string') {
            errors.push(`Capability en índice ${index} debe ser una cadena de texto`);
          }
        });
      }
    }

    // Validar routes
    if (manifest.routes) {
      if (!Array.isArray(manifest.routes)) {
        errors.push('El campo "routes" debe ser un array');
      } else {
        manifest.routes.forEach((route, index) => {
          if (!route.path || !route.method || !route.handler) {
            errors.push(`Ruta en índice ${index} debe tener path, method y handler`);
          }
          if (route.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method)) {
            errors.push(`Método HTTP inválido en ruta ${index}: ${route.method}`);
          }
        });
      }
    }

    // Advertencias opcionales
    if (!manifest.description || manifest.description.length < 10) {
      warnings.push('Descripción muy corta o ausente');
    }

    if (!manifest.author || manifest.author.length < 3) {
      warnings.push('Autor no especificado o muy corto');
    }

    if (!manifest.main) {
      warnings.push('No se especificó punto de entrada (main)');
    }

    return { errors, warnings };
  }

  /**
   * Valida aspectos de seguridad del manifest
   * @param {Object} manifest - Objeto manifest
   * @returns {Object} - { errors: [], warnings: [] }
   */
  validateSecurity(manifest) {
    const errors = [];
    const warnings = [];

    // Validar permisos
    if (manifest.permissions && Array.isArray(manifest.permissions)) {
      manifest.permissions.forEach(permission => {
        if (this.dangerousPermissions.includes(permission)) {
          warnings.push(`⚠️  Permiso peligroso solicitado: ${permission}`);
        }
      });

      if (manifest.permissions.length > 20) {
        warnings.push('El plugin solicita muchos permisos (más de 20)');
      }
    }

    // Validar que no solicite acceso a directorios del sistema
    if (manifest.filesAccess) {
      warnings.push('⚠️  Plugin solicita acceso a archivos del sistema');

      if (Array.isArray(manifest.filesAccess)) {
        manifest.filesAccess.forEach(filePath => {
          if (filePath.includes('..')) {
            errors.push('⛔ Acceso a archivos con path traversal (..) no permitido');
          }
          if (filePath.startsWith('/etc') || filePath.startsWith('/sys')) {
            warnings.push(`⚠️  Acceso a directorio del sistema solicitado: ${filePath}`);
          }
        });
      }
    }

    // Advertir si el plugin puede ejecutar comandos
    if (manifest.capabilities && manifest.capabilities.includes('execute_commands')) {
      warnings.push('⚠️  Plugin puede ejecutar comandos del sistema');
    }

    // Validar webhooks
    if (manifest.webhookSupport) {
      Object.keys(manifest.webhookSupport).forEach(provider => {
        const config = manifest.webhookSupport[provider];
        if (!config.verificationMethod) {
          warnings.push(`Webhook de ${provider} sin método de verificación de firma`);
        }
      });
    }

    // Validar URLs externas (para prevenir phishing)
    ['homepage', 'repository', 'bugsUrl'].forEach(field => {
      if (manifest[field]) {
        const url = manifest[field];
        if (typeof url === 'string' && url.startsWith('http://')) {
          warnings.push(`${field} usa HTTP en lugar de HTTPS`);
        }
        if (url && !this._isValidUrl(url)) {
          errors.push(`${field} contiene una URL inválida`);
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Valida las dependencias del plugin
   * @param {Object} manifest - Objeto manifest
   * @returns {Object} - { errors: [], warnings: [] }
   */
  validateDependencies(manifest) {
    const errors = [];
    const warnings = [];

    if (manifest.dependencies && typeof manifest.dependencies === 'object') {
      const depCount = Object.keys(manifest.dependencies).length;

      if (depCount > 50) {
        warnings.push(`Muchas dependencias (${depCount}). Puede afectar el rendimiento.`);
      }

      // Validar formato de versiones
      Object.entries(manifest.dependencies).forEach(([dep, version]) => {
        if (typeof version !== 'string') {
          errors.push(`Versión de dependencia inválida para ${dep}`);
        }
        // Advertir sobre versiones muy antiguas o inseguras
        if (version.includes('*') || version.includes('x')) {
          warnings.push(`Dependencia ${dep} usa comodín en versión (inseguro)`);
        }
      });

      // Advertir sobre dependencias conocidas como problemáticas
      const problematicDeps = ['node-ipc', 'event-stream', 'flatmap-stream'];
      problematicDeps.forEach(dep => {
        if (manifest.dependencies[dep]) {
          warnings.push(`⚠️  Dependencia ${dep} ha tenido problemas de seguridad en el pasado`);
        }
      });
    }

    // Validar dependencias de plugins
    if (manifest.pluginDependencies && Array.isArray(manifest.pluginDependencies)) {
      manifest.pluginDependencies.forEach(pluginDep => {
        if (typeof pluginDep !== 'string' && !pluginDep.name) {
          errors.push('Dependencia de plugin mal formada');
        }
      });
    }

    return { errors, warnings };
  }

  /**
   * Valida el schema de configuración JSON Schema
   * @param {Object} configSchema - JSON Schema del config
   * @returns {Object} - { errors: [], warnings: [] }
   */
  validateConfigSchema(configSchema) {
    const errors = [];
    const warnings = [];

    if (!configSchema || typeof configSchema !== 'object') {
      errors.push('configSchema debe ser un objeto');
      return { errors, warnings };
    }

    // Validar que tenga type
    if (!configSchema.type) {
      errors.push('configSchema debe tener un campo "type"');
    }

    // Validar properties si es un objeto
    if (configSchema.type === 'object' && !configSchema.properties) {
      warnings.push('configSchema de tipo object sin properties definidas');
    }

    // Validar que campos sensibles tengan format: "password"
    if (configSchema.properties) {
      Object.entries(configSchema.properties).forEach(([key, prop]) => {
        const lowerKey = key.toLowerCase();
        if (
          (lowerKey.includes('password') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('token') ||
            lowerKey.includes('key')) &&
          prop.format !== 'password'
        ) {
          warnings.push(`Campo sensible "${key}" debería tener format: "password"`);
        }
      });
    }

    return { errors, warnings };
  }

  /**
   * Escanea archivos del plugin buscando patrones sospechosos
   * @param {string} pluginPath - Ruta al directorio del plugin
   * @returns {Object} - { errors: [], warnings: [], suspiciousFiles: [] }
   */
  scanPluginFiles(pluginPath) {
    const errors = [];
    const warnings = [];
    const suspiciousFiles = [];

    try {
      if (!fs.existsSync(pluginPath)) {
        return { errors: ['Directorio del plugin no encontrado'], warnings: [], suspiciousFiles: [] };
      }

      // Escanear archivos .js recursivamente
      this._scanDirectory(pluginPath, (file) => {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');
          const findings = this._scanFileContent(content, file);

          if (findings.length > 0) {
            suspiciousFiles.push({
              file: path.relative(pluginPath, file),
              findings
            });
          }
        }
      });

      // Generar advertencias basadas en hallazgos
      if (suspiciousFiles.length > 0) {
        warnings.push(`⚠️  Se encontraron ${suspiciousFiles.length} archivos con patrones sospechosos`);
      }

      // Verificar que no haya archivos .exe, .dll, .so (binarios no permitidos)
      this._scanDirectory(pluginPath, (file) => {
        const ext = path.extname(file).toLowerCase();
        if (['.exe', '.dll', '.so', '.dylib', '.bin'].includes(ext)) {
          errors.push(`⛔ Archivo binario no permitido: ${path.relative(pluginPath, file)}`);
        }
      });

      return { errors, warnings, suspiciousFiles };

    } catch (error) {
      logger.error(`Error escaneando archivos: ${error.message}`);
      return {
        errors: [`Error escaneando archivos: ${error.message}`],
        warnings: [],
        suspiciousFiles: []
      };
    }
  }

  /**
   * Escanea el contenido de un archivo buscando patrones sospechosos
   * @private
   */
  _scanFileContent(content, filePath) {
    const findings = [];

    this.suspiciousPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          pattern: pattern.toString(),
          count: matches.length,
          examples: matches.slice(0, 3) // Primeros 3 ejemplos
        });
      }
    });

    return findings;
  }

  /**
   * Escanea un directorio recursivamente
   * @private
   */
  _scanDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Ignorar node_modules y carpetas ocultas
        if (file !== 'node_modules' && !file.startsWith('.')) {
          this._scanDirectory(filePath, callback);
        }
      } else {
        callback(filePath);
      }
    });
  }

  /**
   * Valida si una URL es válida
   * @private
   */
  _isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Genera un reporte completo de validación
   * @param {string} pluginPath - Ruta al plugin
   * @returns {Object} - Reporte completo
   */
  generateValidationReport(pluginPath) {
    const manifestPath = path.join(pluginPath, 'manifest.json');

    const manifestValidation = this.validateManifestFile(manifestPath);
    const filesScan = this.scanPluginFiles(pluginPath);

    const allErrors = [
      ...manifestValidation.errors,
      ...filesScan.errors
    ];

    const allWarnings = [
      ...manifestValidation.warnings,
      ...filesScan.warnings
    ];

    const riskLevel = this._calculateRiskLevel(allErrors, allWarnings, filesScan.suspiciousFiles);

    return {
      valid: allErrors.length === 0,
      manifest: manifestValidation.manifest,
      errors: allErrors,
      warnings: allWarnings,
      suspiciousFiles: filesScan.suspiciousFiles,
      riskLevel, // 'low', 'medium', 'high', 'critical'
      summary: {
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        suspiciousFilesCount: filesScan.suspiciousFiles.length
      }
    };
  }

  /**
   * Calcula el nivel de riesgo del plugin
   * @private
   */
  _calculateRiskLevel(errors, warnings, suspiciousFiles) {
    if (errors.length > 0) return 'critical';
    if (suspiciousFiles.length > 5) return 'high';
    if (suspiciousFiles.length > 2 || warnings.length > 10) return 'medium';
    if (warnings.length > 0) return 'low';
    return 'safe';
  }
}

module.exports = new PluginManifestValidatorService();
